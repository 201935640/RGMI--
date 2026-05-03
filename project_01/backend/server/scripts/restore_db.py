import argparse
import subprocess
from db.config import DatabaseConfig


def restore(sql_file: str):
    cfg = DatabaseConfig()
    cmd = [
        "mysql",
        f"-h{cfg.DB_HOST}",
        f"-P{cfg.DB_PORT}",
        f"-u{cfg.DB_USER}",
        f"-p{cfg.DB_PASSWORD}",
        cfg.DB_NAME,
    ]
    with open(sql_file, "r", encoding="utf-8") as f:
        subprocess.run(cmd, stdin=f, check=True)
    print(f"[restore] success: {sql_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="待恢复的SQL文件路径")
    args = parser.parse_args()
    restore(args.file)
