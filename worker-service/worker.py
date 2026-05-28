import os
import json
import io
import time
import hashlib
import qrcode
from kafka import KafkaConsumer, KafkaProducer
import redis

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

consumer = KafkaConsumer(
    "qr-generation",
    bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
    group_id="qr-workers",
    value_deserializer=lambda m: json.loads(m.decode()),
    auto_offset_reset="earliest"
)

print("[INFO] Worker Service initialized. Waiting for batch tasks...")

for msg in consumer:
    task = msg.value
    print(f"[WORK] Processing task {task.get('task_id')} from batch {task.get('batch_id')}")

    qr_text = task.get("text", "https://ciyuar.com")
    foreground = task.get("fill_color", "#000000")
    background = task.get("back_color", "#ffffff")

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

    raw = f"{qr_text}:{foreground}:{background}"
    cache_key = hashlib.sha256(raw.encode()).hexdigest()
    r.setex(cache_key, 604800, img_buffer.getvalue())

    producer.send("qr-history", {
        "user_id": task.get("user_id", "anonymous"),
        "text": qr_text,
        "fill_color": foreground,
        "back_color": background,
        "image_url": "",
        "format": "png",
        "timestamp": time.time()
    })

    print(f"[DONE] Task {task.get('task_id')} complete")
