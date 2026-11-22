"""
JalDrishti India — Authentication & User Management Service
Provides secure password hashing (PBKDF2-HMAC-SHA256) and session token generation.
Supports Citizen, Volunteer, and NDRF Admin roles.
"""
import hashlib
import os
import hmac
import secrets
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.core.config import get_settings

settings = get_settings()

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against stored salt:hash."""
    try:
        salt, key_hex = hashed_password.split(':')
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

def create_session_token(user_id: int, email: str, role: str) -> str:
    """Create a tamper-evident signed token."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "ts": int(datetime.now(timezone.utc).timestamp()),
    }
    payload_str = json.dumps(payload, separators=(',', ':'))
    sig = hmac.new(settings.SECRET_KEY.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
    token = f"{secrets.token_hex(8)}.{payload_str.encode().hex()}.{sig}"
    return token

def decode_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify token signature."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_bytes = bytes.fromhex(parts[1])
        expected_sig = hmac.new(settings.SECRET_KEY.encode(), payload_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, parts[2]):
            return None
        return json.loads(payload_bytes.decode())
    except Exception:
        return None
