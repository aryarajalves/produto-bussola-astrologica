import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app, seed_admin
from database import SessionLocal
from models.models import User, UserInvite
from routes.auth import hash_password, verify_password

client = TestClient(app)


def get_admin_token():
    seed_admin()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")
    res = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": super_admin_pass
    })
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(autouse=True)
def cleanup_reset_users():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testresetuser%"})
        db.execute(text("DELETE FROM user_invites WHERE token LIKE :p"), {"p": "%testresetinvite%"})
        db.commit()
    finally:
        db.close()


def test_generate_reset_link_success():
    admin_token = get_admin_token()

    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            name="Aluno Reset Link",
            email="testresetuser1@exemplo.com",
            password_hash=hash_password("senhaAntiga123"),
            role="client",
            is_active=True,
        )
        db.add(user)
        db.commit()
        user_id = user.id
    finally:
        db.close()

    res = client.post(
        f"/auth/users/{user_id}/reset-link",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user_id"] == user_id
    assert data["reset_path"].startswith("/redefinir-senha?token=")


def test_generate_reset_link_blocked_for_super_admin():
    admin_token = get_admin_token()
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()

    db = SessionLocal()
    try:
        super_admin = db.query(User).filter(User.email == super_admin_email).first()
        super_admin_id = str(super_admin.id)
    finally:
        db.close()

    res = client.post(
        f"/auth/users/{super_admin_id}/reset-link",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 400
    assert "Super Admin" in res.json()["detail"]


def test_verify_reset_token_and_reset_password_flow():
    admin_token = get_admin_token()

    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            name="Maria Reset Flow",
            email="testresetuser2@exemplo.com",
            password_hash=hash_password("senhaInicial99"),
            role="client",
            is_active=True,
        )
        db.add(user)
        db.commit()
        user_id = user.id
    finally:
        db.close()

    # 1. Gerar link
    gen_res = client.post(
        f"/auth/users/{user_id}/reset-link",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert gen_res.status_code == 200
    reset_token = gen_res.json()["token"]

    # 2. Validar token publicamente
    verify_res = client.get(f"/auth/verify-reset-token/{reset_token}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["name"] == "Maria Reset Flow"
    assert verify_data["email"] == "testresetuser2@exemplo.com"

    # 3. Tentativa com senha menor que 12 caracteres
    short_res = client.post("/auth/reset-password", json={
        "token": reset_token,
        "password": "Fraca1!"
    })
    assert short_res.status_code == 400
    assert "12 caracteres" in short_res.json()["detail"]

    # Tentativa sem caractere especial
    no_spec_res = client.post("/auth/reset-password", json={
        "token": reset_token,
        "password": "SenhaSemEspecial123"
    })
    assert no_spec_res.status_code == 400
    assert "caractere especial" in no_spec_res.json()["detail"]

    # 4. Redefinir com senha forte válida
    reset_res = client.post("/auth/reset-password", json={
        "token": reset_token,
        "password": "NovaSenhaForte@2026"
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # 5. Logar com a nova senha
    login_res = client.post("/auth/login", json={
        "email": "testresetuser2@exemplo.com",
        "password": "NovaSenhaForte@2026"
    })
    assert login_res.status_code == 200
    assert "token" in login_res.json()


def test_single_delete_user_and_invite():
    admin_token = get_admin_token()

    db = SessionLocal()
    try:
        # Usuário para deleção
        user = User(
            id=str(uuid.uuid4()),
            name="Usuario Single Delete",
            email="testresetuser_single_del@exemplo.com",
            password_hash=hash_password("senha123"),
            role="client",
            is_active=True,
        )
        # Convite para deleção
        invite = UserInvite(
            id=str(uuid.uuid4()),
            token="testresetinvite_single_del",
            role="client",
            validity_type="never",
            is_used=False,
        )
        db.add(user)
        db.add(invite)
        db.commit()
        uid = user.id
        inv_id = invite.id
    finally:
        db.close()

    # Deletar usuário individualmente via rota batch com 1 id
    del_user_res = client.request(
        "DELETE",
        "/admin/users/batch",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ids": [uid]},
    )
    assert del_user_res.status_code == 200
    assert del_user_res.json()["deleted_count"] == 1

    # Deletar convite individualmente via rota batch com 1 id
    del_inv_res = client.request(
        "DELETE",
        "/admin/invites/batch",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ids": [inv_id]},
    )
    assert del_inv_res.status_code == 200
    assert del_inv_res.json()["deleted_count"] == 1

    # Checar se foram removidos do banco
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == uid).first() is None
        assert db.query(UserInvite).filter(UserInvite.id == inv_id).first() is None
    finally:
        db.close()
