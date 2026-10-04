import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app, seed_admin
from database import SessionLocal
from models.models import User, GenerationLog, Chart, ChartSection
from routes.auth import hash_password

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
def cleanup_test_logs():
    yield
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("DELETE FROM chart_sections WHERE chart_id IN (SELECT id FROM charts WHERE user_id IN (SELECT id FROM users WHERE email LIKE :p))"), {"p": "%testdelhistory%"})
        db.execute(text("DELETE FROM charts WHERE user_id IN (SELECT id FROM users WHERE email LIKE :p)"), {"p": "%testdelhistory%"})
        db.execute(text("DELETE FROM users WHERE email LIKE :p"), {"p": "%testdelhistory%"})
        db.execute(text("DELETE FROM generation_logs WHERE email LIKE :p"), {"p": "%testdelhistory%"})
        db.commit()
    finally:
        db.close()


def test_delete_single_generation_log():
    token = get_admin_token()

    db = SessionLocal()
    try:
        log = GenerationLog(
            id=str(uuid.uuid4()),
            name="Cliente Log Single",
            email="testdelhistory1@exemplo.com",
            status="success",
            birth_city="Fortaleza",
            model_used="kerykeion / gemini",
        )
        db.add(log)
        db.commit()
        log_id = log.id
    finally:
        db.close()

    # Deleta individualmente
    res = client.delete(
        f"/admin/generation-logs/{log_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Verifica se foi removido
    db = SessionLocal()
    try:
        assert db.query(GenerationLog).filter(GenerationLog.id == log_id).first() is None
    finally:
        db.close()


def test_delete_batch_generation_logs():
    token = get_admin_token()

    db = SessionLocal()
    try:
        log1 = GenerationLog(
            id=str(uuid.uuid4()),
            name="Cliente Log Batch 1",
            email="testdelhistory_b1@exemplo.com",
            status="success",
        )
        log2 = GenerationLog(
            id=str(uuid.uuid4()),
            name="Cliente Log Batch 2",
            email="testdelhistory_b2@exemplo.com",
            status="failed",
        )
        db.add(log1)
        db.add(log2)
        db.commit()
        id1 = log1.id
        id2 = log2.id
    finally:
        db.close()

    # Deleta em lote
    res = client.request(
        "DELETE",
        "/admin/generation-logs/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": [id1, id2]}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["deleted_count"] == 2

    # Verifica se foram removidos
    db = SessionLocal()
    try:
        assert db.query(GenerationLog).filter(GenerationLog.id.in_([id1, id2])).count() == 0
    finally:
        db.close()


def test_delete_batch_empty_ids_returns_400():
    token = get_admin_token()
    res = client.request(
        "DELETE",
        "/admin/generation-logs/batch",
        headers={"Authorization": f"Bearer {token}"},
        json={"ids": []}
    )
    assert res.status_code == 400


def test_get_client_details_via_generation_log_id():
    token = get_admin_token()
    db = SessionLocal()
    try:
        log = GenerationLog(
            id=str(uuid.uuid4()),
            name="Lead Apenas Log",
            email="testleadonly@exemplo.com",
            whatsapp="11999998888",
            birth_city="Curitiba",
            birth_date="1995-05-15",
            birth_time="14:30",
            status="success",
            model_used="gpt-4o",
        )
        db.add(log)
        db.commit()
        log_id = log.id
    finally:
        db.close()

    # Ao abrir detalhes passando o log_id, o backend deve responder 200 OK sem erro 404
    res = client.get(
        f"/admin/clients/{log_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == log_id
    assert data["name"] == "Lead Apenas Log"
    assert data["email"] == "testleadonly@exemplo.com"
    assert data["birth_city"] == "Curitiba"
    assert len(data["sections"]) > 0


def test_get_client_details_resolves_user_from_log_email():
    token = get_admin_token()
    user_id = str(uuid.uuid4())
    log_id = str(uuid.uuid4())
    chart_id = str(uuid.uuid4())
    email = f"testdelhistory_{uuid.uuid4().hex[:8]}@exemplo.com"

    db = SessionLocal()
    try:
        user = User(
            id=user_id,
            name="Cliente Completo com Log",
            email=email,
            password_hash=hash_password("senha123"),
            sun_sign="Touro",
            moon_sign="Áries",
            rising_sign="Leão",
        )
        chart = Chart(
            id=chart_id,
            user_id=user_id,
            status="ready",
            svg_content="<svg></svg>",
        )
        log = GenerationLog(
            id=log_id,
            name="Cliente Completo com Log",
            email=email,
            status="success",
        )
        db.add(user)
        db.add(chart)
        db.add(log)
        db.commit()
    finally:
        db.close()

    # 1. Busca por log_id deve resolver para o User
    res = client.get(
        f"/admin/clients/{log_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == user_id
    assert data["sun_sign"] == "Touro"
    assert data["chart"] is not None
    assert data["chart"]["id"] == chart_id

    # 2. Busca por chart_id deve resolver para o User
    res_chart = client.get(
        f"/admin/clients/{chart_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_chart.status_code == 200
    assert res_chart.json()["id"] == user_id

    # 3. GET /admin/generation-logs deve incluir client_id apontando para o user_id
    res_logs = client.get(
        "/admin/generation-logs",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_logs.status_code == 200
    items = res_logs.json()
    matched = next((item for item in items if item["id"] == log_id), None)
    assert matched is not None
    assert matched["client_id"] == user_id

