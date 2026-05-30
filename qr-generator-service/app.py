from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import qrcode
import io
import os
import hashlib
import json
import time
from kafka import KafkaProducer
import redis

app = Flask(__name__)
CORS(app)

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=6379,
    db=0,
    decode_responses=False
)

producer = KafkaProducer(
    bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
    value_serializer=lambda v: json.dumps(v).encode()
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "qr-generator-service"}), 200


@app.route("/api/v1/generate", methods=["POST"])
def generate_qr_image():
    data = request.get_json(silent=True) or {}
    qr_text = (data.get("text") or "https://ciyuar.com").strip()
    foreground = (data.get("fill_color") or "#000000").strip()
    background = (data.get("back_color") or "#ffffff").strip()

    if not qr_text:
        return jsonify({"error": "text is required"}), 400

    raw = f"{qr_text}:{foreground}:{background}"
    cache_key = hashlib.sha256(raw.encode()).hexdigest()

    cached = r.get(cache_key)
    if cached:
        return send_file(
            io.BytesIO(cached),
            mimetype="image/png",
            headers={"X-Cache": "HIT"},
        )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color=foreground, back_color=background)

    img_buffer = io.BytesIO()
    img.save(img_buffer, "PNG")
    img_buffer.seek(0)

    r.setex(cache_key, 604800, img_buffer.getvalue())
    img_buffer.seek(0)

    try:
        producer.send("qr-history", {
            "user_id": data.get("user_id", "anonymous"),
            "text": qr_text,
            "fill_color": foreground,
            "back_color": background,
            "image_url": "",
            "format": "png",
            "timestamp": time.time(),
        })
    except Exception as e:
        app.logger.warning(f"[WARN] Failed to publish qr-history event: {e}")

    return send_file(
        img_buffer,
        mimetype="image/png",
        headers={"X-Cache": "MISS"},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
