import logging
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event, text
from sqlalchemy.pool import Pool
from .config import DatabaseConfig

logger = logging.getLogger("RGMI-DB")

db = SQLAlchemy()


@event.listens_for(Pool, "checkout")
def _on_checkout(dbapi_conn, connection_rec, connection_proxy):
    pass


@event.listens_for(Pool, "checkin")
def _on_checkin(dbapi_conn, connection_rec):
    pass


def init_db(app, config=None):
    if config is None:
        config = DatabaseConfig()

    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["SQLALCHEMY_ECHO"] = config.SQLALCHEMY_ECHO
    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = config.JWT_ACCESS_TOKEN_EXPIRES
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = config.JWT_REFRESH_TOKEN_EXPIRES
    app.config["HISTORY_PAGE_SIZE_DEFAULT"] = config.HISTORY_PAGE_SIZE_DEFAULT
    app.config["HISTORY_PAGE_SIZE_MAX"] = config.HISTORY_PAGE_SIZE_MAX
    app.config["HISTORY_MAX_PER_USER"] = config.HISTORY_MAX_PER_USER
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": config.POOL_SIZE,
        "max_overflow": config.MAX_OVERFLOW,
        "pool_recycle": config.POOL_RECYCLE,
        "pool_timeout": config.POOL_TIMEOUT,
        "pool_pre_ping": config.POOL_PRE_PING,
    }

    db.init_app(app)

    logger.info(f"数据库已初始化: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    return db


def create_all():
    db.create_all()
    logger.info("数据库表已创建")


def drop_all():
    db.drop_all()
    logger.info("数据库表已删除")


def get_db_session():
    return db.session


def check_connection():
    try:
        db.session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"数据库连接检查失败: {e}")
        return False


def get_pool_status():
    engine = db.engine
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
    }
