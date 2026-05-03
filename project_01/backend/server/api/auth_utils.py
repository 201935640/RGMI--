import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import current_app, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from db.user_dao import UserDAO


def hash_password(password: str) -> str:
    return generate_password_hash(password, method="pbkdf2:sha256:260000")


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    exp_seconds = int(current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 7200))
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=exp_seconds)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp_seconds = int(current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", 604800))
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=exp_seconds)).timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def decode_token(token: str):
    return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])


def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _extract_bearer_token()
        if not token:
            return jsonify({"error": "未提供认证令牌"}), 401
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                return jsonify({"error": "无效令牌类型"}), 401
            user_id = int(payload["sub"])
            user = UserDAO.get_by_id(user_id)
            if not user:
                return jsonify({"error": "用户不存在或已删除"}), 401
            g.current_user = user
            g.current_role = payload.get("role", "user")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "令牌已过期"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "令牌无效"}), 401
        return f(*args, **kwargs)

    return wrapper


def admin_required(f):
    @wraps(f)
    @login_required
    def wrapper(*args, **kwargs):
        if g.current_role != "admin":
            return jsonify({"error": "需要管理员权限"}), 403
        return f(*args, **kwargs)

    return wrapper
