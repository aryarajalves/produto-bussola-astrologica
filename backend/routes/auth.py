from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import PyJWTError as JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os

from models.models import User
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

JWT_SECRET = os.getenv("JWT_SECRET", "changeme-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", 168))


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    role: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return current_user


from sqlalchemy import func

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    clean_email = (body.email or "").strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    # Auto-cria conta de admin se for um dos e-mails autorizados e ainda não existir no banco
    if not user and clean_email in ["driiholiveira71@gmail.com", "admin@sirius.com", "admin@academysirius.online"]:
        user = User(
            name="Andrieli Oliver",
            email=clean_email,
            password_hash=hash_password("sirius123"),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    # Para administradores, valida por hash ou pela senha mestre sirius123
    password_ok = verify_password(body.password, user.password_hash) or (user.role == "admin" and body.password == "sirius123")

    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    token = create_token(user.id, user.role)
    return TokenResponse(token=token, role=user.role)


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_email = (body.email or "").strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if not user and clean_email in ["driiholiveira71@gmail.com", "admin@sirius.com", "admin@academysirius.online"]:
        user = User(
            name="Andrieli Oliver",
            email=clean_email,
            password_hash=hash_password("sirius123"),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        return {"message": "E-mail de recuperação enviado! Verifique sua caixa de entrada e spam."}

    import secrets
    if user.role == "admin":
        temp_password = "sirius123"
    else:
        temp_password = f"sirius{secrets.randbelow(899999) + 100000}"

    user.password_hash = hash_password(temp_password)
    db.commit()

    from services.email_service import send_password_reset
    send_password_reset(user.email, user.name or "Cliente", temp_password)

    return {"message": "E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e caixa de spam."}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "sun_sign": current_user.sun_sign,
        "moon_sign": current_user.moon_sign,
        "rising_sign": current_user.rising_sign,
    }


# ── Links de Redefinição de Senha e Redefinição com Senha Forte ─────────────

class ResetPasswordWithTokenRequest(BaseModel):
    token: str
    password: str


@router.post("/users/{user_id}/reset-link")
def generate_user_reset_link(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Gera link de redefinição de senha para um aluno ou admin comum, bloqueando para Super Admin."""
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    if target_user.email and target_user.email.strip().lower() == super_admin_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido gerar link de redefinição para o Super Admin.",
        )

    # Gera token JWT específico para redefinição com validade de 24h
    expire = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": str(target_user.id),
        "email": target_user.email,
        "type": "reset_password",
        "exp": expire,
    }
    reset_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "success": True,
        "token": reset_token,
        "user_id": str(target_user.id),
        "name": target_user.name,
        "email": target_user.email,
        "reset_path": f"/redefinir-senha?token={reset_token}",
    }


@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Valida o token JWT de redefinição de senha e retorna dados do usuário."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido para redefinição de senha.")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido ou expirado.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    return {
        "valid": True,
        "name": user.name,
        "email": user.email,
    }


@router.post("/reset-password")
def reset_password_with_token(
    body: ResetPasswordWithTokenRequest,
    db: Session = Depends(get_db),
):
    """Redefine a senha do usuário com validação de senha forte."""
    try:
        payload = jwt.decode(body.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido para redefinição de senha.")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido ou expirado.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    # Valida requisitos de senha forte
    from routes.invites import validate_strong_password
    validate_strong_password(body.password)

    user.password_hash = hash_password(body.password)
    db.commit()

    return {
        "success": True,
        "message": "Senha redefinida com sucesso! Você já pode fazer login com suas novas credenciais.",
    }
