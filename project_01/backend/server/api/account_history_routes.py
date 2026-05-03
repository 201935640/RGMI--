from flask import Blueprint, jsonify, request, g, current_app
from db.connection import db, get_pool_status
from db.user_dao import UserDAO, PasswordResetDAO, LoginLogDAO
from db.history_dao import HistoryDAO
from .account_service import AccountService
from .auth_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    login_required,
    admin_required,
)


account_bp = Blueprint("account_bp", __name__, url_prefix="/api")


def _pagination_args():
    page = max(1, int(request.args.get("page", 1)))
    page_size = int(request.args.get("page_size", current_app.config.get("HISTORY_PAGE_SIZE_DEFAULT", 20)))
    page_size = min(max(1, page_size), int(current_app.config.get("HISTORY_PAGE_SIZE_MAX", 100)))
    return page, page_size


@account_bp.route("/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    try:
        user = AccountService.register(payload)
        return jsonify({"message": "注册成功", "user": user.to_dict(include_email=True)}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    try:
        user = AccountService.login(
            username=username,
            password=password,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )
        role = user.role_ref.name if user.role_ref else "user"
        access_token = create_access_token(user.id, role)
        refresh_token = create_refresh_token(user.id)
        return jsonify(
            {
                "message": "登录成功",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict(include_email=True),
            }
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@account_bp.route("/auth/refresh", methods=["POST"])
def refresh_token():
    payload = request.get_json(silent=True) or {}
    token = payload.get("refresh_token")
    if not token:
        return jsonify({"error": "refresh_token 不能为空"}), 400
    try:
        data = decode_token(token)
        if data.get("type") != "refresh":
            return jsonify({"error": "令牌类型错误"}), 401
        user = UserDAO.get_by_id(int(data["sub"]))
        if not user:
            return jsonify({"error": "用户不存在"}), 401
        role = user.role_ref.name if user.role_ref else "user"
        access_token = create_access_token(user.id, role)
        return jsonify({"access_token": access_token})
    except Exception:
        return jsonify({"error": "refresh_token 无效或已过期"}), 401


@account_bp.route("/auth/password-reset/request", methods=["POST"])
def password_reset_request():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "邮箱不能为空"}), 400
    token = AccountService.reset_password_request(email)
    return jsonify({"message": "若邮箱存在将发送重置链接", "reset_token_for_dev": token})


@account_bp.route("/auth/password-reset/confirm", methods=["POST"])
def password_reset_confirm():
    payload = request.get_json(silent=True) or {}
    token = payload.get("token") or ""
    new_password = payload.get("new_password") or ""
    if not token or not new_password:
        return jsonify({"error": "token 和 new_password 不能为空"}), 400
    try:
        AccountService.reset_password_confirm(token, new_password)
        return jsonify({"message": "密码重置成功"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/users/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": g.current_user.to_dict(include_email=True)})


@account_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    page, page_size = _pagination_args()
    result = UserDAO.list_users(
        page=page,
        page_size=page_size,
        keyword=request.args.get("keyword"),
        role_name=request.args.get("role"),
        status=request.args.get("status"),
    )
    return jsonify(result)


@account_bp.route("/users", methods=["POST"])
@admin_required
def admin_create_user():
    payload = request.get_json(silent=True) or {}
    try:
        user = AccountService.register(payload)
        return jsonify({"message": "用户创建成功", "user": user.to_dict(include_email=True)}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/users/me", methods=["PATCH"])
@login_required
def update_my_profile():
    payload = request.get_json(silent=True) or {}
    try:
        user = UserDAO.update_user(
            g.current_user.id,
            nickname=payload.get("nickname"),
            phone=payload.get("phone"),
            avatar_url=payload.get("avatar_url"),
            email=payload.get("email"),
        )
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        return jsonify({"message": "资料更新成功", "user": user.to_dict(include_email=True)})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/users/<int:user_id>/status", methods=["PATCH"])
@admin_required
def set_user_status(user_id):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if not status:
        return jsonify({"error": "status 不能为空"}), 400
    try:
        user = AccountService.set_status(user_id, status)
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        return jsonify({"message": "状态更新成功", "user": user.to_dict(include_email=True)})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/users/<int:user_id>", methods=["PATCH"])
@admin_required
def admin_update_user(user_id):
    payload = request.get_json(silent=True) or {}
    try:
        user = UserDAO.admin_update_user(
            user_id=user_id,
            nickname=payload.get("nickname"),
            phone=payload.get("phone"),
            email=payload.get("email"),
            role_name=payload.get("role"),
            status=payload.get("status"),
        )
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        return jsonify({"message": "用户更新成功", "user": user.to_dict(include_email=True)})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    ok = UserDAO.soft_delete(user_id)
    if not ok:
        return jsonify({"error": "用户不存在"}), 404
    return jsonify({"message": "用户已软删除"})


@account_bp.route("/history", methods=["POST"])
@login_required
def create_history():
    payload = request.get_json(silent=True) or {}
    try:
        history = AccountService.create_history(
            user_id=g.current_user.id,
            payload=payload,
            ip_address=request.remote_addr,
        )
        return jsonify({"message": "记录已写入", "history": history.to_dict()}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@account_bp.route("/history", methods=["GET"])
@login_required
def list_history():
    page, page_size = _pagination_args()
    result = HistoryDAO.get_by_user(
        user_id=g.current_user.id,
        page=page,
        page_size=page_size,
        operation_type=request.args.get("operation_type"),
        disease_id_keyword=request.args.get("keyword"),
        start_date=request.args.get("start_date"),
        end_date=request.args.get("end_date"),
    )
    return jsonify(result)


@account_bp.route("/history/<int:record_id>", methods=["DELETE"])
@login_required
def delete_history(record_id):
    ok = HistoryDAO.soft_delete(record_id, user_id=g.current_user.id)
    if not ok:
        return jsonify({"error": "记录不存在"}), 404
    return jsonify({"message": "记录已软删除"})


@account_bp.route("/history/<int:record_id>", methods=["GET"])
@login_required
def get_history_by_id(record_id):
    record = HistoryDAO.get_by_id(record_id, user_id=g.current_user.id)
    if not record:
        return jsonify({"error": "记录不存在"}), 404
    return jsonify({"history": record.to_dict()})


@account_bp.route("/history/<int:record_id>", methods=["PATCH"])
@login_required
def update_history(record_id):
    payload = request.get_json(silent=True) or {}
    record = HistoryDAO.update(
        record_id=record_id,
        user_id=g.current_user.id,
        disease_name=payload.get("disease_name"),
        detail=payload.get("detail"),
        top_n=payload.get("top_n"),
        operation_type=payload.get("operation_type"),
    )
    if not record:
        return jsonify({"error": "记录不存在"}), 404
    return jsonify({"message": "记录更新成功", "history": record.to_dict()})


@account_bp.route("/history/clear", methods=["POST"])
@login_required
def clear_history():
    count = HistoryDAO.clear_user_history(g.current_user.id)
    return jsonify({"message": "历史记录已清空", "count": count})


@account_bp.route("/history/statistics", methods=["GET"])
@login_required
def history_statistics():
    return jsonify(HistoryDAO.get_statistics(g.current_user.id))


@account_bp.route("/db/pool-status", methods=["GET"])
@admin_required
def pool_status():
    return jsonify(get_pool_status())


@account_bp.route("/db/metrics", methods=["GET"])
@admin_required
def db_metrics():
    return jsonify(
        {
            "pool": get_pool_status(),
            "user_total": UserDAO.count_total(),
            "user_active": UserDAO.count_active(),
        }
    )
