import os
from dotenv import load_dotenv

load_dotenv()


class DatabaseConfig:
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "rgmi_db")
    DB_CHARSET = os.getenv("DB_CHARSET", "utf8mb4")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset={DB_CHARSET}",
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"

    POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 20))
    MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", 40))
    POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", 1800))
    POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", 30))
    POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.urandom(32).hex())
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_EXPIRES", 7200))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_EXPIRES", 604800))

    BCRYPT_LOG_ROUNDS = int(os.getenv("BCRYPT_LOG_ROUNDS", 12))

    HISTORY_PAGE_SIZE_DEFAULT = int(os.getenv("HISTORY_PAGE_SIZE", 20))
    HISTORY_PAGE_SIZE_MAX = int(os.getenv("HISTORY_PAGE_SIZE_MAX", 100))
    HISTORY_MAX_PER_USER = int(os.getenv("HISTORY_MAX_PER_USER", 5000))


class TestDatabaseConfig(DatabaseConfig):
    DB_NAME = os.getenv("TEST_DB_NAME", "rgmi_db_test")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        f"mysql+pymysql://{DatabaseConfig.DB_USER}:{DatabaseConfig.DB_PASSWORD}@{DatabaseConfig.DB_HOST}:{DatabaseConfig.DB_PORT}/{DB_NAME}?charset={DatabaseConfig.DB_CHARSET}",
    )
