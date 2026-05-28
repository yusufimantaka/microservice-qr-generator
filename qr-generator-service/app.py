from flask import Flask, request, send_file
import qrcode
import io
import os
import hashlib
import json
import time
from kafka import KafkaProducer
import redis

app = Flask(__name__)

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

@app.route('/api/v1/generate', methods=['POST'])
def generate_qr_image():
    data = request.json or {}
    qr_text = data.get('text', 'https://ciyuar.com')
    foreground = data.get('fill_color', '#000000')
    background = data.get('back_color', '#ffffff')

    raw = f"{qr_text}:{foreground}:{background}"
    cache_key = hashlib.sha256(raw.encode()).hexdigest()

    cached = r.get(cache_key)
    if cached:
        return send_file(io.BytesIO(cached), mimetype='image/png')

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
    img.save(img_buffer, 'PNG')
    img_buffer.seek(0)

    r.setex(cache_key, 604800, img_buffer.getvalue())

    try:
        producer.send("qr-history", {
            "user_id": data.get("user_id", "anonymous"),
            "text": qr_text,
            "fill_color": foreground,
            "back_color": background,
            "image_url": "",
            "format": "png",
            "timestamp": time.time()
        })
    except Exception:
        pass

    return send_file(img_buffer, mimetype='image/png')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
