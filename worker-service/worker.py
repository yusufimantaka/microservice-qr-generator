import os
import json
import io
import time
import hashlib
import qrcode
from kafka import KafkaConsumer, KafkaProducer
import redis

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

r = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    db=0,
    decode_responses=False
)

# Redis client for batch status tracking (decode_responses=True for JSON)
r_meta = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    db=0,
    decode_responses=True
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode()
)

consumer = KafkaConsumer(
    "qr-generation",
    bootstrap_servers=KAFKA_BROKER,
    group_id="qr-workers",
    value_deserializer=lambda m: json.loads(m.decode()),
    auto_offset_reset="earliest",
)

print("[INFO] Worker Service initialized. Waiting for batch tasks...", flush=True)


def update_batch_progress(batch_id: str, success: bool):
    """Atomically increment completed/failed counters for a batch."""
    key = f"batch:{batch_id}"
    raw = r_meta.get(key)
    if not raw:
        return
    meta = json.loads(raw)
    if success:
        meta["completed"] = meta.get("completed", 0) + 1
    else:
        meta["failed"] = meta.get("failed", 0) + 1

    total = meta.get("total", 0)
    done = meta["completed"] + meta["failed"]
    if done >= total:
        meta["status"] = "completed" if meta["failed"] == 0 else "partial"
        meta["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    r_meta.setex(key, 86400, json.dumps(meta))


for msg in consumer:
    task = msg.value
    task_id = task.get("task_id", "unknown")
    batch_id = task.get("batch_id")

    print(f"[WORK] Processing task {task_id}", flush=True)

    qr_text = (task.get("text") or "https://ciyuar.com").strip()
    foreground = (task.get("fill_color") or "#000000").strip()
    background = (task.get("back_color") or "#ffffff").strip()

    try:
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

        raw_key = f"{qr_text}:{foreground}:{background}"
        cache_key = hashlib.sha256(raw_key.encode()).hexdigest()
        r.setex(cache_key, 604800, img_buffer.getvalue())

        producer.send("qr-history", {
            "user_id": task.get("user_id", "anonymous"),
            "text": qr_text,
            "fill_color": foreground,
            "back_color": background,
            "image_url": "",
            "format": "png",
            "timestamp": time.time(),
        })

        if batch_id:
            update_batch_progress(batch_id, success=True)

        print(f"[DONE] Task {task_id} complete", flush=True)

    except Exception as e:
        print(f"[ERROR] Task {task_id} failed: {e}", flush=True)
        if batch_id:
            update_batch_progress(batch_id, success=False)
