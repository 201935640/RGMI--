from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    DateTime,
    Boolean,
    Text,
    Enum,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from .connection import db

ID_TYPE = BigInteger().with_variant(Integer, "sqlite")


def _utcnow():
    return datetime.now(timezone.utc)


class UserStatusEnum(enum.Enum):
    active = "active"
    inactive = "inactive"
    banned = "banned"


class RoleNameEnum(enum.Enum):
    admin = "admin"
    researcher = "researcher"
    user = "user"
    guest = "guest"


class OperationTypeEnum(enum.Enum):
    login = "login"
    logout = "logout"
    search = "search"
    query = "query"
    export = "export"
    view = "view"


class Role(db.Model):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(30), unique=True, nullable=False, comment="角色名称")
    display_name = Column(String(50), nullable=False, comment="角色显示名")
    description = Column(String(200), default="", comment="角色描述")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    users = relationship("User", back_populates="role_ref", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
        }


class User(db.Model):
    __tablename__ = "users"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True, comment="用户名")
    email = Column(String(120), unique=True, nullable=False, index=True, comment="邮箱")
    phone = Column(String(20), nullable=True, index=True, comment="手机号")
    password_hash = Column(String(255), nullable=False, comment="加密密码")
    nickname = Column(String(50), default="", comment="昵称")
    avatar_url = Column(String(500), default="", comment="头像URL")
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, default=3, comment="角色ID")
    status = Column(
        Enum(UserStatusEnum),
        nullable=False,
        default=UserStatusEnum.active,
        comment="账户状态",
    )
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="软删除标记")
    last_login_at = Column(DateTime(timezone=True), nullable=True, comment="最后登录时间")
    last_login_ip = Column(String(45), nullable=True, comment="最后登录IP")
    login_fail_count = Column(Integer, default=0, comment="连续登录失败次数")
    locked_until = Column(DateTime(timezone=True), nullable=True, comment="锁定截止时间")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, comment="创建时间")
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False, comment="更新时间")

    role_ref = relationship("Role", back_populates="users", lazy="joined")
    search_histories = relationship(
        "SearchHistory",
        back_populates="user",
        lazy="dynamic",
        order_by="SearchHistory.searched_at.desc()",
    )
    login_logs = relationship("LoginLog", back_populates="user", lazy="dynamic")
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", lazy="dynamic"
    )

    __table_args__ = (
        Index("ix_users_role_id", "role_id"),
        Index("ix_users_created_at", "created_at"),
        Index("ix_users_is_deleted_status", "is_deleted", "status"),
    )

    def to_dict(self, include_email=False):
        data = {
            "id": self.id,
            "username": self.username,
            "nickname": self.nickname or self.username,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "role": self.role_ref.name if self.role_ref else "user",
            "role_display": self.role_ref.display_name if self.role_ref else "用户",
            "status": self.status.value if self.status else "active",
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "last_login_ip": self.last_login_ip,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True, comment="重置令牌")
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="过期时间")
    used = Column(Boolean, default=False, nullable=False, comment="是否已使用")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")

    __table_args__ = (Index("ix_prt_user_used", "user_id", "used"),)


class LoginLog(db.Model):
    __tablename__ = "login_logs"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True, comment="登录IP")
    user_agent = Column(String(500), nullable=True, comment="浏览器UA")
    success = Column(Boolean, default=True, nullable=False, comment="是否成功")
    fail_reason = Column(String(200), nullable=True, comment="失败原因")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, comment="登录时间")

    user = relationship("User", back_populates="login_logs")

    __table_args__ = (
        Index("ix_login_logs_user_created", "user_id", "created_at"),
        Index("ix_login_logs_created_at", "created_at"),
    )


class SearchHistory(db.Model):
    __tablename__ = "search_histories"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    disease_id = Column(String(20), nullable=False, comment="疾病ID")
    disease_name = Column(String(200), default="", comment="疾病名称")
    operation_type = Column(
        Enum(OperationTypeEnum),
        default=OperationTypeEnum.search,
        nullable=False,
        comment="操作类型",
    )
    detail = Column(Text, nullable=True, comment="操作详情JSON")
    top_n = Column(Integer, default=20, comment="查询top_n参数")
    ip_address = Column(String(45), nullable=True, comment="操作IP")
    is_deleted = Column(Boolean, default=False, nullable=False, index=True, comment="软删除")
    searched_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, comment="操作时间")

    user = relationship("User", back_populates="search_histories")

    __table_args__ = (
        Index("ix_sh_user_searched", "user_id", "searched_at"),
        Index("ix_sh_user_disease", "user_id", "disease_id"),
        Index("ix_sh_disease_id", "disease_id"),
        Index("ix_sh_operation_type", "operation_type"),
        Index("ix_sh_user_not_deleted", "user_id", "is_deleted", "searched_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "disease_id": self.disease_id,
            "disease_name": self.disease_name,
            "operation_type": self.operation_type.value if self.operation_type else "search",
            "detail": self.detail,
            "top_n": self.top_n,
            "ip_address": self.ip_address,
            "searched_at": self.searched_at.isoformat() if self.searched_at else None,
        }
