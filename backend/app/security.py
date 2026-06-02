import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=True)


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_min),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)


def authenticate(username: str, password: str) -> bool:
    ok_user = secrets.compare_digest(username, settings.demo_username)
    ok_pass = secrets.compare_digest(password, settings.demo_password)
    return ok_user and ok_pass


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Valida o JWT dos frontends (médico/usuário)."""
    try:
        payload = jwt.decode(
            creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_alg]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload.get("sub", "")


def verify_device(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> bool:
    """Valida o token estático do dispositivo IoT / emulador no /telemetry."""
    if not secrets.compare_digest(creds.credentials, settings.device_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True
