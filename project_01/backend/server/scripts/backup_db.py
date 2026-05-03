import os
import subprocess
from datetime import datetime
from db.config import DatabaseConfig


def backup():
    cfg = DatabaseConfig()
    backup_dir = os.path.join(os.path.dirname(__file__), "..", "backups")
    backup_dir = os.path.abspath(backup_dir)
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(backup_dir, f"{cfg.DB_NAME}_{ts}.sql")

    cmd = [
        "mysqldump",
        f"-h{cfg.DB_HOST}",
        f"-P{cfg.DB_PORT}",
        f"-u{cfg.DB_USER}",
        f"-p{cfg.DB_PASSWORD}",
        "--single-transaction",
        "--routines",
        "--events",
        "--set-gtid-purged=OFF",
        cfg.DB_NAME,
    ]
    with open(out_file, "w", encoding="utf-8") as f:
        subprocess.run(cmd, stdout=f, check=True)
    print(f"[backup] success: {out_file}")


if __name__ == "__main__":
    backup()
