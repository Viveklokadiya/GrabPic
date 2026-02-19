from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"


def main() -> int:
    command = [sys.executable, "-m", "alembic", "upgrade", "head"]
    process = subprocess.run(command, cwd=str(BACKEND_DIR))
    return int(process.returncode)


if __name__ == "__main__":
    raise SystemExit(main())

