"""Repository-level lint, test, and build checks for Sprint 0."""

from __future__ import annotations

import compileall
import os
import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
AI_ENGINE = ROOT / "packages" / "ai_engine"
CHECKED_SUFFIXES = {".md", ".py", ".yml", ".yaml"}


def main() -> int:
    failures: list[str] = []
    failures.extend(lint_text_files())
    if not compile_python():
        failures.append("Python build check failed")
    if not run_tests():
        failures.append("Unit tests failed")

    if failures:
        print("CI check failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("CI check passed: lint + test + build")
    return 0


def lint_text_files() -> list[str]:
    failures: list[str] = []
    ignored_dirs = {".git", "__pycache__", ".pytest_cache", ".mypy_cache"}
    for path in ROOT.rglob("*"):
        if any(part in ignored_dirs for part in path.parts):
            continue
        if not path.is_file() or path.suffix not in CHECKED_SUFFIXES:
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        for index, line in enumerate(lines, start=1):
            if line.rstrip() != line:
                failures.append(f"{path.relative_to(ROOT)}:{index} trailing whitespace")
            if "\t" in line:
                failures.append(f"{path.relative_to(ROOT)}:{index} tab character")
    return failures


def compile_python() -> bool:
    return compileall.compile_dir(str(AI_ENGINE), quiet=1)


def run_tests() -> bool:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(AI_ENGINE)
    completed = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(AI_ENGINE / "tests")],
        cwd=ROOT,
        env=env,
        check=False,
    )
    return completed.returncode == 0


if __name__ == "__main__":
    raise SystemExit(main())
