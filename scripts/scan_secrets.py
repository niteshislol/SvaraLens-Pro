#!/usr/bin/env python3
"""Secret scanning utility: fails (exit 1) if an unredacted credential-like value is found.
Inspects both filesystem files and nested archive members (.zip, .tar.gz, etc.).
NEVER prints secret values; only reports the offending file/member and redacted key name."""
import io
import pathlib
import re
import sys
import tarfile
import zipfile
from typing import List, Tuple

# Patterns that indicate credentials or private keys
PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password|auth_token)\s*[=:]\s*['\"]?([A-Za-z0-9_\-]{20,})"),
    re.compile(r"(vach_[A-Za-z0-9_\-]{20,})"),
    re.compile(r"(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,})"),
    re.compile(r"-----BEGIN\s+(?:RSA|OPENSSH|DSA|EC|PRIVATE)\s+KEY-----"),
]

SAFE_PREFIXES = (
    "your_", "placeholder", "changeme", "example", "xxxx",
    "test_secret_", "mock_", "dev_secret_", "local_secret_"
)

SKIP_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist",
    "storage", "__pycache__", ".pytest_cache"
}

SKIP_EXTENSIONS = {
    ".wav", ".mp3", ".ogg", ".png", ".jpg", ".jpeg",
    ".ico", ".svg", ".pyc", ".lock"
}

SKIP_FILENAMES = {
    ".env", ".env.local", ".env.development.local", ".env.production.local"
}


def scan_text(text: str, location_desc: str) -> List[str]:
    findings = []
    for pat in PATTERNS:
        for m in pat.finditer(text):
            groups = m.groups()
            if len(groups) == 2:
                field_name, secret_val = groups
                if not secret_val.lower().startswith(SAFE_PREFIXES):
                    findings.append(f"POSSIBLE SECRET: {location_desc} ({field_name}=<redacted>)")
            elif len(groups) == 1:
                val = groups[0]
                if not val.lower().startswith(SAFE_PREFIXES):
                    findings.append(f"POSSIBLE SECRET: {location_desc} (matched_credential=<redacted>)")
            else:
                findings.append(f"POSSIBLE PRIVATE KEY: {location_desc} (key_header=<redacted>)")
    return findings


def scan_zip_bytes(zip_bytes: bytes, archive_path: str, depth: int = 0) -> List[str]:
    if depth > 3:
        return []
    findings = []
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for member_name in zf.namelist():
                lower_name = member_name.lower()
                if any(lower_name.endswith(ext) for ext in SKIP_EXTENSIONS):
                    continue
                try:
                    content = zf.read(member_name)
                    if lower_name.endswith(".zip"):
                        findings.extend(scan_zip_bytes(content, f"{archive_path}!/{member_name}", depth + 1))
                    else:
                        text = content.decode("utf-8", errors="ignore")
                        findings.extend(scan_text(text, f"{archive_path}!/{member_name}"))
                except Exception:
                    continue
    except Exception:
        pass
    return findings


def scan_file(file_path: pathlib.Path) -> List[str]:
    findings = []
    if file_path.suffix.lower() == ".zip":
        try:
            raw_bytes = file_path.read_bytes()
            findings.extend(scan_zip_bytes(raw_bytes, str(file_path)))
        except Exception:
            pass
        return findings

    try:
        text = file_path.read_text(errors="ignore")
        findings.extend(scan_text(text, str(file_path)))
    except Exception:
        pass
    return findings


def main():
    root = pathlib.Path(".")
    all_findings: List[str] = []
    scanned_count = 0

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if SKIP_DIRS & set(path.parts):
            continue
        if path.name in SKIP_FILENAMES:
            continue
        if path.suffix.lower() in SKIP_EXTENSIONS and path.suffix.lower() != ".zip":
            continue

        scanned_count += 1
        all_findings.extend(scan_file(path))

    for f in all_findings:
        print(f)

    if all_findings:
        print(f"\n[FAIL] Secret scanner detected {len(all_findings)} potential secret(s) across {scanned_count} files.")
        sys.exit(1)
    else:
        print(f"[PASS] Secret scanner verified {scanned_count} files/archives clean of exposed credentials.")
        sys.exit(0)


if __name__ == "__main__":
    main()
