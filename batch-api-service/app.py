import os
import json
import time
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from kafka import KafkaProducer
import redis

app = Flask(__name__)
CORS(app)

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "100"))

cache = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    db=0,
    decode_responses=True
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode()
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "batch-api-service"}), 200


@app.route("/api/v1/batch/generate", methods=["POST"])
def batch_generate():
    """
    Accepts a JSON body:
    {
      "user_id": "abc123",
      "items": [
        {"text": "https://example.com", "fill_color": "#000000", "back_color": "#ffffff"},
        ...
      ]
    }
    Returns a batch_id that the client can poll via /api/v1/batch/status/<batch_id>.
    """
    data = request.get_json(silent=True) or {}
    user_id = (data.get("user_id") or "anonymous").strip()
    items = data.get("items")

    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "items must be a non-empty array"}), 400
    if len(items) > MAX_BATCH_SIZE:
        return jsonify({
            "error": f"batch size exceeds maximum of {MAX_BATCH_SIZE} items"
        }), 400

    batch_id = str(uuid.uuid4())
    submitted_at = datetime.now(timezone.utc).isoformat()

    # Store batch metadata in Redis
    batch_meta = {
        "batch_id": batch_id,
        "user_id": user_id,
        "total": len(items),
        "submitted_at": submitted_at,
        "status": "queued",
        "completed": 0,
        "failed": 0,
    }
    cache.setex(
        f"batch:{batch_id}",
        86400,  # expire after 24 hours
        json.dumps(batch_meta)
    )

    # Enqueue each item as an individual task
    task_ids = []
    for i, item in enumerate(items):
        task_id = f"{batch_id}-{i}"
        task = {
            "task_id": task_id,
            "batch_id": batch_id,
            "user_id": user_id,
            "text": item.get("text", "https://ciyuar.com"),
            "fill_color": item.get("fill_color", "#000000"),
            "back_color": item.get("back_color", "#ffffff"),
            "index": i,
            "timestamp": time.time(),
        }
        producer.send("qr-generation", task)
        task_ids.append(task_id)

    producer.flush()

    return jsonify({
        "batch_id": batch_id,
        "user_id": user_id,
        "total": len(items),
        "submitted_at": submitted_at,
        "status": "queued",
        "task_ids": task_ids,
        "message": f"batch of {len(items)} items queued successfully",
    }), 202


@app.route("/api/v1/batch/status/<batch_id>", methods=["GET"])
def batch_status(batch_id: str):
    raw = cache.get(f"batch:{batch_id}")
    if not raw:
        return jsonify({"error": "batch not found or expired"}), 404

    meta = json.loads(raw)
    total = meta["total"]
    completed = meta["completed"]
    failed = meta["failed"]
    in_progress = total - completed - failed

    if completed + failed >= total:
        meta["status"] = "completed" if failed == 0 else "partial"

    return jsonify({
        **meta,
        "in_progress": in_progress,
        "progress_pct": round((completed / total) * 100, 1) if total > 0 else 0,
    }), 200


@app.route("/api/v1/batch/cancel/<batch_id>", methods=["DELETE"])
def batch_cancel(batch_id: str):
    raw = cache.get(f"batch:{batch_id}")
    if not raw:
        return jsonify({"error": "batch not found or expired"}), 404

    meta = json.loads(raw)
    if meta["status"] in ("completed", "partial"):
        return jsonify({"error": "cannot cancel a finished batch"}), 409

    meta["status"] = "cancelled"
    cache.setex(f"batch:{batch_id}", 86400, json.dumps(meta))
    return jsonify({"batch_id": batch_id, "status": "cancelled"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
