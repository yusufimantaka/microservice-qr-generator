import os
import json
import time
import threading
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import redis
from kafka import KafkaConsumer

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

mongo_client = MongoClient(MONGO_URI)
db = mongo_client["qr_generator"]
history_collection = db["user_history"]

history_collection.create_index("user_id")
history_collection.create_index("created_at", expireAfterSeconds=90 * 24 * 3600)

cache = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    db=0,
    decode_responses=True
)


def consume_qr_events():
    while True:
        try:
            consumer = KafkaConsumer(
                "qr-history",
                bootstrap_servers=KAFKA_BROKER,
                group_id="user-history-service",
                value_deserializer=lambda m: json.loads(m.decode()),
                auto_offset_reset="earliest",
            )
            for msg in consumer:
                event = msg.value
                history_collection.insert_one({
                    "user_id": event.get("user_id", "anonymous"),
                    "input_text": event.get("text", ""),
                    "fill_color": event.get("fill_color", "#000000"),
                    "back_color": event.get("back_color", "#ffffff"),
                    "image_url": event.get("image_url", ""),
                    "format": event.get("format", "png"),
                    "created_at": datetime.now(timezone.utc),
                })
                # Invalidate all cached pages for this user
                for key in cache.scan_iter(f"history:{event.get('user_id')}:*"):
                    cache.delete(key)
        except Exception as e:
            app.logger.error(f"[ERROR] Kafka consumer failed: {e}. Retrying in 5s...")
            time.sleep(5)


threading.Thread(target=consume_qr_events, daemon=True).start()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "user-history-service"}), 200


@app.route("/api/v1/history", methods=["GET"])
def get_history():
    user_id = request.args.get("user_id", "").strip()
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        return jsonify({"error": "page and limit must be integers"}), 400

    skip = (page - 1) * limit
    cache_key = f"history:{user_id}:p{page}:l{limit}"

    cached = cache.get(cache_key)
    if cached:
        return jsonify(json.loads(cached)), 200

    cursor = history_collection.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", -1).skip(skip).limit(limit)

    records = list(cursor)
    for rec in records:
        if isinstance(rec.get("created_at"), datetime):
            rec["created_at"] = rec["created_at"].isoformat()

    total = history_collection.count_documents({"user_id": user_id})
    result = {
        "records": records,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": -(-total // limit),  # ceiling division
    }
    cache.setex(cache_key, 300, json.dumps(result, default=str))

    return jsonify(result), 200


@app.route("/api/v1/history/stats", methods=["GET"])
def get_stats():
    user_id = request.args.get("user_id", "").strip()
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    total = history_collection.count_documents({"user_id": user_id})
    return jsonify({"user_id": user_id, "total_generations": total}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
