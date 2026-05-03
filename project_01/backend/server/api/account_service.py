import json
from db.connection import db
from db.user_dao import UserDAO, PasswordResetDAO, LoginLogDAO, RoleDAO
from db.history_dao import HistoryDAO
from .auth_utils import hash_password, verify_password


class AccountService:
    @staticmethod
    def register(payload: dict):
        username = (payload.get("username") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip() or None
        password = payload.get("password") or ""
        nickname = (payload.get("nickname") or "").strip() or username
        role_name = (payload.get("role") or payload.get("role_name") or "user").strip()
        status = (payload.get("status") or "active").strip()

        if not username or len(username) < 3:
            raise ValueError("用户名至少3位")
        if not email:
            raise ValueError("邮箱不能为空")
        if len(password) < 6:
            raise ValueError("密码至少6位")

        password_hash = hash_password(password)
        return UserDAO.create_user(
            username=username,
            email=email,
            phone=phone,
            password_hash=password_hash,
            nickname=nickname,
            role_name=role_name,
            status=status,
        )

    @staticmethod
    def login(username: str, password: str, ip_address: str = None, user_agent: str = None):
        user, error = UserDAO.authenticate_by_username(username, None)
        if error:
            if user:
                LoginLogDAO.record(
                    user_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    fail_reason=error,
                )
            raise ValueError(error)

        valid = UserDAO.verify_password(user, password, verify_password)
        if not valid:
            LoginLogDAO.record(
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                fail_reason="密码错误",
            )
            raise ValueError("用户名或密码错误")

        UserDAO.update_login_info(user, ip_address=ip_address)
        LoginLogDAO.record(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            fail_reason=None,
        )
        return user

    @staticmethod
    def reset_password_request(email: str):
        user = UserDAO.get_by_email(email.lower().strip())
        if not user:
            return None
        return PasswordResetDAO.create_token(user.id, expires_hours=2)

    @staticmethod
    def reset_password_confirm(token: str, new_password: str):
        if len(new_password) < 6:
            raise ValueError("新密码至少6位")
        token_record, error = PasswordResetDAO.verify_token(token)
        if error:
            raise ValueError(error)
        hashed = hash_password(new_password)
        ok = UserDAO.change_password(token_record.user_id, hashed)
        if not ok:
            raise ValueError("用户不存在")
        PasswordResetDAO.use_token(token)
        return True

    @staticmethod
    def set_status(user_id: int, status: str):
        return UserDAO.set_status(user_id, status)

    @staticmethod
    def create_history(user_id: int, payload: dict, ip_address: str = None):
        disease_id = (payload.get("disease_id") or "").strip()
        disease_name = (payload.get("disease_name") or "").strip()
        operation_type = (payload.get("operation_type") or "search").strip()
        top_n = int(payload.get("top_n") or 20)
        detail = payload.get("detail")
        if isinstance(detail, (dict, list)):
            detail = json.dumps(detail, ensure_ascii=False)
        if not disease_id:
            raise ValueError("disease_id 不能为空")

        history = HistoryDAO.record(
            user_id=user_id,
            disease_id=disease_id,
            disease_name=disease_name,
            operation_type=operation_type,
            detail=detail,
            top_n=top_n,
            ip_address=ip_address,
        )
        HistoryDAO.enforce_limit(user_id, max_records=5000)
        return history


def bootstrap_defaults():
    RoleDAO.init_default_roles()
