import logging
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import or_, and_, func
from sqlalchemy.exc import IntegrityError
from .connection import db
from .models import User, Role, PasswordResetToken, LoginLog, UserStatusEnum

logger = logging.getLogger("RGMI-UserDAO")


def _utcnow():
    return datetime.now(timezone.utc)


class UserDAO:

    @staticmethod
    def create_user(
        username,
        email,
        password_hash,
        phone=None,
        nickname=None,
        role_name="user",
        status="active",
    ):
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role.query.filter_by(name="user").first()
        if not role:
            raise ValueError("默认角色不存在，请先执行初始化脚本")

        try:
            status_enum = UserStatusEnum(status)
        except ValueError:
            status_enum = UserStatusEnum.active

        user = User(
            username=username,
            email=email,
            phone=phone,
            password_hash=password_hash,
            nickname=nickname or username,
            role_id=role.id,
            status=status_enum,
        )
        try:
            db.session.add(user)
            db.session.commit()
            logger.info(f"用户创建成功: {username} (ID={user.id})")
            return user
        except IntegrityError:
            db.session.rollback()
            existing = User.query.filter(
                or_(User.username == username, User.email == email),
                User.is_deleted == False,
            ).first()
            if existing:
                if existing.username == username:
                    raise ValueError("用户名已被注册")
                if existing.email == email:
                    raise ValueError("邮箱已被注册")
            raise

    @staticmethod
    def get_by_id(user_id):
        return User.query.filter_by(id=user_id, is_deleted=False).first()

    @staticmethod
    def get_by_username(username):
        return User.query.filter_by(username=username, is_deleted=False).first()

    @staticmethod
    def get_by_email(email):
        return User.query.filter_by(email=email, is_deleted=False).first()

    @staticmethod
    def get_by_phone(phone):
        return User.query.filter_by(phone=phone, is_deleted=False).first()

    @staticmethod
    def authenticate_by_username(username, password_hash_fn):
        user = User.query.filter_by(username=username, is_deleted=False).first()
        if not user:
            return None, "用户不存在"
        if user.status == UserStatusEnum.inactive:
            return None, "账户已被禁用"
        if user.status == UserStatusEnum.banned:
            return None, "账户已被封禁"
        if user.locked_until and user.locked_until > _utcnow():
            remaining = int((user.locked_until - _utcnow()).total_seconds())
            return None, f"账户已锁定，请{remaining}秒后重试"
        return user, None

    @staticmethod
    def verify_password(user, password, verify_fn):
        if verify_fn(password, user.password_hash):
            user.login_fail_count = 0
            user.locked_until = None
            db.session.commit()
            return True
        user.login_fail_count = (user.login_fail_count or 0) + 1
        if user.login_fail_count >= 5:
            user.locked_until = _utcnow() + timedelta(minutes=15)
        db.session.commit()
        return False

    @staticmethod
    def update_login_info(user, ip_address=None):
        user.last_login_at = _utcnow()
        user.last_login_ip = ip_address
        user.login_fail_count = 0
        user.locked_until = None
        db.session.commit()

    @staticmethod
    def update_user(user_id, **kwargs):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return None

        allowed_fields = {"nickname", "phone", "avatar_url", "email"}
        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                if key == "email":
                    conflict = User.query.filter(
                        User.email == value, User.id != user_id, User.is_deleted == False
                    ).first()
                    if conflict:
                        raise ValueError("邮箱已被其他用户使用")
                setattr(user, key, value)

        db.session.commit()
        return user

    @staticmethod
    def change_password(user_id, new_password_hash):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return False
        user.password_hash = new_password_hash
        db.session.commit()
        return True

    @staticmethod
    def set_status(user_id, status_str):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return None
        try:
            user.status = UserStatusEnum(status_str)
        except ValueError:
            raise ValueError(f"无效的状态值: {status_str}")
        db.session.commit()
        return user

    @staticmethod
    def change_role(user_id, role_name):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return None
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            raise ValueError(f"角色不存在: {role_name}")
        user.role_id = role.id
        db.session.commit()
        return user

    @staticmethod
    def admin_update_user(user_id, nickname=None, phone=None, email=None, role_name=None, status=None):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return None

        if nickname is not None:
            user.nickname = nickname
        if phone is not None:
            user.phone = phone
        if email is not None:
            conflict = User.query.filter(
                User.email == email, User.id != user_id, User.is_deleted == False
            ).first()
            if conflict:
                raise ValueError("邮箱已被其他用户使用")
            user.email = email
        if role_name:
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                raise ValueError(f"角色不存在: {role_name}")
            user.role_id = role.id
        if status:
            try:
                user.status = UserStatusEnum(status)
            except ValueError:
                raise ValueError(f"无效的状态值: {status}")

        db.session.commit()
        return user

    @staticmethod
    def soft_delete(user_id):
        user = User.query.filter_by(id=user_id, is_deleted=False).first()
        if not user:
            return False
        user.is_deleted = True
        user.status = UserStatusEnum.inactive
        db.session.commit()
        return True

    @staticmethod
    def list_users(page=1, page_size=20, keyword=None, role_name=None, status=None):
        query = User.query.filter_by(is_deleted=False)

        if keyword:
            pattern = f"%{keyword}%"
            query = query.filter(
                or_(
                    User.username.like(pattern),
                    User.nickname.like(pattern),
                    User.email.like(pattern),
                    User.phone.like(pattern),
                )
            )

        if role_name:
            role = Role.query.filter_by(name=role_name).first()
            if role:
                query = query.filter(User.role_id == role.id)

        if status:
            try:
                query = query.filter(User.status == UserStatusEnum(status))
            except ValueError:
                pass

        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "items": [u.to_dict(include_email=True) for u in users],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    @staticmethod
    def count_active():
        return User.query.filter_by(is_deleted=False, status=UserStatusEnum.active).count()

    @staticmethod
    def count_total():
        return User.query.filter_by(is_deleted=False).count()


class PasswordResetDAO:

    @staticmethod
    def create_token(user_id, expires_hours=24):
        token = secrets.token_urlsafe(48)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=_utcnow() + timedelta(hours=expires_hours),
        )
        db.session.add(reset_token)
        db.session.commit()
        return token

    @staticmethod
    def verify_token(token):
        record = PasswordResetToken.query.filter_by(token=token, used=False).first()
        if not record:
            return None, "重置令牌无效"
        expires_at = record.expires_at
        now = _utcnow()
        # SQLite 可能返回无时区 datetime，统一转换后再比较
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            return None, "重置令牌已过期"
        return record, None

    @staticmethod
    def use_token(token):
        record, error = PasswordResetDAO.verify_token(token)
        if error:
            return False, error
        record.used = True
        db.session.commit()
        return True, None

    @staticmethod
    def clean_expired():
        count = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at < _utcnow()
        ).delete()
        db.session.commit()
        return count


class LoginLogDAO:

    @staticmethod
    def record(user_id, ip_address=None, user_agent=None, success=True, fail_reason=None):
        log = LoginLog(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            fail_reason=fail_reason,
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def get_by_user(user_id, page=1, page_size=20):
        query = LoginLog.query.filter_by(user_id=user_id)
        total = query.count()
        logs = (
            query.order_by(LoginLog.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "items": [
                {
                    "id": l.id,
                    "ip_address": l.ip_address,
                    "success": l.success,
                    "fail_reason": l.fail_reason,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                }
                for l in logs
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }


class RoleDAO:

    @staticmethod
    def get_all():
        return Role.query.all()

    @staticmethod
    def get_by_name(name):
        return Role.query.filter_by(name=name).first()

    @staticmethod
    def init_default_roles():
        defaults = [
            ("admin", "系统管理员", "拥有全部权限"),
            ("researcher", "高级研究员", "可进行高级数据分析"),
            ("user", "数据分析师", "标准用户权限"),
            ("guest", "临时访客", "受限浏览权限"),
        ]
        for name, display, desc in defaults:
            if not Role.query.filter_by(name=name).first():
                db.session.add(Role(name=name, display_name=display, description=desc))
        db.session.commit()
