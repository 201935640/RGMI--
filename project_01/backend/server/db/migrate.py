import os
import pymysql
from db.config import DatabaseConfig


def _connect_without_db(config: DatabaseConfig):
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        charset=config.DB_CHARSET,
        autocommit=True,
    )


def _connect_with_db(config: DatabaseConfig):
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset=config.DB_CHARSET,
        autocommit=False,
    )


def _ensure_database(config: DatabaseConfig):
    conn = _connect_without_db(config)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}` CHARACTER SET {config.DB_CHARSET} COLLATE {config.DB_CHARSET}_general_ci;"
            )
    finally:
        conn.close()


def run_migrations():
    config = DatabaseConfig()
    migration_dir = os.path.join(os.path.dirname(__file__), "migrations")
    files = sorted([f for f in os.listdir(migration_dir) if f.endswith(".sql")])

    _ensure_database(config)
    conn = _connect_with_db(config)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    version VARCHAR(100) NOT NULL UNIQUE,
                    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            cursor.execute("SELECT version FROM schema_migrations")
            applied = {row[0] for row in cursor.fetchall()}

            for filename in files:
                if filename in applied:
                    continue
                full_path = os.path.join(migration_dir, filename)
                with open(full_path, "r", encoding="utf-8") as f:
                    sql = f.read()
                for statement in [s.strip() for s in sql.split(";") if s.strip()]:
                    cursor.execute(statement)
                cursor.execute(
                    "INSERT INTO schema_migrations(version) VALUES (%s)",
                    (filename,),
                )
                print(f"[migrate] applied: {filename}")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migrations()
    print("[migrate] done")
