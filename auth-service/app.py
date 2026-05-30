import os
import json
import time
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import redis
import jwt

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

mongo_client = MongoClient(MONGO_URI)
db = mongo_client["qr_generator"]
users_collection = db["users"]

users_collection.create_index("username", unique=True)
users_collection.create_index("email", unique=True)

cache = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    db=1,
    decode_responses=True
)


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def generate_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "auth-service"}), 200


@app.route("/api/v1/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    salt = secrets.token_hex(16)
    hashed = hash_password(password, salt)

    try:
        result = users_collection.insert_one({
            "username": username,
            "email": email,
            "password_hash": hashed,
            "salt": salt,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        return jsonify({"error": "username or email already exists"}), 409

    user_id = str(result.inserted_id)
    token = generate_token(user_id, username)

    return jsonify({
        "message": "registration successful",
        "user_id": user_id,
        "username": username,
        "token": token,
    }), 201


@app.route("/api/v1/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    # Brute-force protection via Redis
    lockout_key = f"lockout:{username}"
    attempts_key = f"attempts:{username}"
    if cache.get(lockout_key):
        return jsonify({"error": "too many failed attempts. try again in 15 minutes"}), 429

    user = users_collection.find_one({"username": username})
    if not user:
        return jsonify({"error": "invalid credentials"}), 401

    hashed = hash_password(password, user["salt"])
    if hashed != user["password_hash"]:
        attempts = cache.incr(attempts_key)
        cache.expire(attempts_key, 900)
        if int(attempts) >= 5:
            cache.setex(lockout_key, 900, "1")
        return jsonify({"error": "invalid credentials"}), 401

    cache.delete(attempts_key)
    cache.delete(lockout_key)

    user_id = str(user["_id"])
    token = generate_token(user_id, username)

    # Store token in Redis for revocation support
    cache.setex(f"token:{user_id}", JWT_EXPIRY_HOURS * 3600, token)

    return jsonify({
        "message": "login successful",
        "user_id": user_id,
        "username": username,
        "token": token,
    }), 200


@app.route("/api/v1/auth/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "missing or invalid Authorization header"}), 401

    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "invalid or expired token"}), 401

    cache.delete(f"token:{payload['sub']}")
    return jsonify({"message": "logout successful"}), 200


@app.route("/api/v1/auth/verify", methods=["GET"])
def verify():
    """Internal endpoint used by the API gateway to verify tokens."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "missing or invalid Authorization header"}), 401

    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "invalid or expired token"}), 401

    # Check token is not revoked
    stored = cache.get(f"token:{payload['sub']}")
    if stored and stored != token:
        return jsonify({"error": "token has been revoked"}), 401

    return jsonify({
        "valid": True,
        "user_id": payload["sub"],
        "username": payload["username"],
    }), 200


@app.route("/api/v1/auth/me", methods=["GET"])
def me():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "missing or invalid Authorization header"}), 401

    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "invalid or expired token"}), 401

    from bson import ObjectId
    user = users_collection.find_one(
        {"_id": ObjectId(payload["sub"])},
        {"_id": 0, "password_hash": 0, "salt": 0}
    )
    if not user:
        return jsonify({"error": "user not found"}), 404

    if isinstance(user.get("created_at"), datetime):
        user["created_at"] = user["created_at"].isoformat()

    return jsonify({"user": user}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
