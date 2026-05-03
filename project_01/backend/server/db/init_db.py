from flask import Flask
from db.connection import init_db, create_all
from db.user_dao import RoleDAO, UserDAO
from api.auth_utils import hash_password


def initialize():
    app = Flask(__name__)
    init_db(app)
    with app.app_context():
        create_all()
        RoleDAO.init_default_roles()
        admin = UserDAO.get_by_username("admin")
        if not admin:
            UserDAO.create_user(
                username="admin",
                email="admin@rgmi.local",
                phone="",
                password_hash=hash_password("admin123"),
                nickname="超级管理员",
                role_name="admin",
            )
            print("[init_db] default admin created: admin/admin123")
        else:
            print("[init_db] admin already exists")

        demo_users = [
            ("user1", "user1@rgmi.local", "用户一"),
            ("user2", "user2@rgmi.local", "用户二"),
        ]
        for username, email, nickname in demo_users:
            existing = UserDAO.get_by_username(username)
            if existing:
                print(f"[init_db] demo user already exists: {username}")
                continue
            UserDAO.create_user(
                username=username,
                email=email,
                phone="",
                password_hash=hash_password("user123"),
                nickname=nickname,
                role_name="user",
                status="active",
            )
            print(f"[init_db] demo user created: {username}/user123")
    print("[init_db] done")


if __name__ == "__main__":
    initialize()
