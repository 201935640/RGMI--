import os
import sys
import pytest
from flask import Flask

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from db.connection import db
from db.models import User, Role, SearchHistory, PasswordResetToken, LoginLog
from db.user_dao import RoleDAO
from api.account_history_routes import account_bp
from api.auth_utils import hash_password
from db.user_dao import UserDAO


@pytest.fixture()
def app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "test-secret"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 86400
    app.config["HISTORY_PAGE_SIZE_DEFAULT"] = 20
    app.config["HISTORY_PAGE_SIZE_MAX"] = 100

    db.init_app(app)
    app.register_blueprint(account_bp)

    with app.app_context():
        db.create_all()
        RoleDAO.init_default_roles()
        if not UserDAO.get_by_username("admin"):
            UserDAO.create_user(
                username="admin",
                email="admin@test.com",
                password_hash=hash_password("admin123"),
                role_name="admin",
                status="active",
            )
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
