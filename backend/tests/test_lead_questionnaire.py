import os
from datetime import date
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app, seed_admin

import pytest
from database import SessionLocal
from models.models import User, Chart, ChartSection, GenerationLog

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_clients():
    yield
    db = SessionLocal()
    try:
        clients = db.query(User).filter(User.role == "client", User.name.like("[TEST_MOCK]%")).all()
        for u in clients:
            charts = db.query(Chart).filter(Chart.user_id == u.id).all()
            for c in charts:
                db.query(ChartSection).filter(ChartSection.chart_id == c.id).delete()
                db.delete(c)
            db.delete(u)
        db.query(GenerationLog).filter(GenerationLog.name.like("[TEST_MOCK]%")).delete()
        db.commit()
    finally:
        db.close()

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

def test_generate_lead_with_5_required_fields():
    token = get_admin_token()

    fake_sections = {
        "portal": "Texto portal",
        "essencia": "Texto essencia",
        "ferida_e_dom": "Texto ferida",
        "dons_esquecidos": "Texto dons",
        "luz_e_sombra": "Texto luz",
        "reencontro": "Texto reencontro",
        "rituais": "Texto rituais",
        "afirmagias": "Texto afirmagias",
    }

    with patch("routes.admin_chart.generate_sections", new=AsyncMock(return_value=fake_sections)), \
         patch("routes.admin_chart.city_to_coordinates", return_value={"lat": -23.5505, "lng": -46.6333, "tz_str": "America/Sao_Paulo"}):
        
        # Testando envio com apenas os 5 campos solicitados pelo usuário (sem email e sem cidade)
        response = client.post(
            "/admin/generate-manual",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "[TEST_MOCK] Mariana Santos",
                "birth_date": "1995-04-12",
                "birth_time": "14:30",
                "birth_country": "Brasil",
                "birth_state": "SP",
            }
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "[TEST_MOCK] Mariana Santos"
        assert "@bussola.local" in data["email"]
        assert "sun_sign" in data
        assert "moon_sign" in data

def test_generate_lead_with_explicit_city():
    token = get_admin_token()

    fake_sections = {
        "portal": "Texto portal",
        "essencia": "Texto essencia",
        "ferida_e_dom": "Texto ferida",
        "dons_esquecidos": "Texto dons",
        "luz_e_sombra": "Texto luz",
        "reencontro": "Texto reencontro",
        "rituais": "Texto rituais",
        "afirmagias": "Texto afirmagias",
    }

    with patch("routes.admin_chart.generate_sections", new=AsyncMock(return_value=fake_sections)), \
         patch("routes.admin_chart.city_to_coordinates", return_value={"lat": -22.9068, "lng": -43.1729, "tz_str": "America/Sao_Paulo"}):
        
        response = client.post(
            "/admin/generate-manual",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "[TEST_MOCK] Carlos Eduardo",
                "birth_date": "1990-08-20",
                "birth_time": "08:15",
                "birth_country": "Brasil",
                "birth_state": "RJ",
                "birth_city": "Niterói",
                "email": "carlos.eduardo@exemplo.com",
            }
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "[TEST_MOCK] Carlos Eduardo"
        assert data["email"] == "carlos.eduardo@exemplo.com"
        assert "sun_sign" in data

def test_save_lead_only_without_ai():
    token = get_admin_token()

    with patch("routes.admin_chart.city_to_coordinates", return_value={"lat": -3.7172, "lng": -38.5433, "tz_str": "America/Fortaleza"}):
        # Envia com save_only=True: NÃO deve chamar IA e deve salvar com status pending
        response = client.post(
            "/admin/generate-manual",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "[TEST_MOCK] Lead SaveOnly",
                "birth_date": "1998-03-09",
                "birth_time": "18:35",
                "birth_country": "Brasil",
                "birth_state": "CE",
                "save_only": True,
            }
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "[TEST_MOCK] Lead SaveOnly"
        assert data["status"] == "pending"
        assert "sun_sign" in data
        assert data["message"] == "Informações do lead salvas com sucesso para uso futuro."

def test_generate_chart_missing_required_info():
    token = get_admin_token()
    db = SessionLocal()
    import uuid
    user_id = str(uuid.uuid4())
    # Cria lead propositalmente sem horário e sem estado
    incomplete_user = User(
        id=user_id,
        name="[TEST_MOCK] Lead Incompleto",
        email=f"incomplete_{uuid.uuid4().hex[:6]}@bussola.local",
        password_hash="fakehash",
        birth_date=date(1995, 5, 10),
        birth_time=None, # faltando
        birth_country="Brasil",
        birth_state=None, # faltando
        role="client",
    )
    db.add(incomplete_user)
    db.commit()
    db.close()

    res = client.post(
        f"/admin/clients/{user_id}/generate-chart",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "faltando informações importantes" in detail.lower()
    assert "home" in detail.lower()

def test_generate_chart_for_complete_lead():
    token = get_admin_token()
    # Primeiro salva o lead
    save_res = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] Bruna Alencar",
            "birth_date": "1997-06-15",
            "birth_time": "10:20",
            "birth_country": "Brasil",
            "birth_state": "MG",
            "birth_city": "Belo Horizonte",
            "save_only": True,
        }
    )
    assert save_res.status_code == 200
    client_id = save_res.json()["id"]

    with patch("routes.admin_chart.city_to_coordinates", return_value={"lat": -19.9167, "lng": -43.9345, "tz_str": "America/Sao_Paulo"}):
        gen_res = client.post(
            f"/admin/clients/{client_id}/generate-chart",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gen_res.status_code == 200, gen_res.text
        data = gen_res.json()
        assert data["status"] == "ready"
        assert data["name"] == "[TEST_MOCK] Bruna Alencar"
        assert "chart_id" in data

def test_filter_clients_by_date_range():
    token = get_admin_token()
    today_str = str(date.today())
    res = client.get(
        f"/admin/clients?start_date={today_str}&end_date={today_str}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert "items" in res.json()

def test_save_lead_and_update_with_client_id():
    token = get_admin_token()
    # 1. Salvar primeiro
    save_res = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] Juliana Rios",
            "birth_date": "1992-03-10",
            "birth_time": "09:30",
            "birth_country": "Brasil",
            "birth_state": "CE",
            "birth_city": "Fortaleza",
            "save_only": True,
        }
    )
    assert save_res.status_code == 200
    client_id = save_res.json()["id"]

    # 2. Atualizar o mesmo lead usando o client_id
    update_res = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "client_id": client_id,
            "name": "[TEST_MOCK] Juliana Rios Atualizada",
            "birth_date": "1992-03-10",
            "birth_time": "09:30",
            "birth_country": "Brasil",
            "birth_state": "CE",
            "birth_city": "Caucaia",
            "save_only": True,
        }
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["id"] == client_id
    assert data["name"] == "[TEST_MOCK] Juliana Rios Atualizada"

    # Verificar no banco se manteve o mesmo ID e atualizou a cidade
    db = SessionLocal()
    user_db = db.query(User).filter(User.id == client_id).first()
    assert user_db is not None
    assert user_db.birth_city == "Caucaia"
    assert user_db.name == "[TEST_MOCK] Juliana Rios Atualizada"
    db.close()

def test_generation_logs_endpoint():
    token = get_admin_token()
    # Cria uma entrada no histórico
    client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] Fernando Dias",
            "birth_date": "1988-11-22",
            "birth_time": "15:00",
            "birth_country": "Brasil",
            "birth_state": "SP",
            "birth_city": "Campinas",
            "save_only": True,
        }
    )

    res = client.get(
        "/admin/generation-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) > 0
    # Verifica que contém pelo menos um com o nome do mock
    fernando_log = next((l for l in logs if l.get("name") == "[TEST_MOCK] Fernando Dias"), None)
    assert fernando_log is not None
    assert fernando_log.get("created_at") is not None
    assert fernando_log["created_at"].endswith("Z")

def test_save_lead_returns_lat_and_lng():
    token = get_admin_token()
    with patch("routes.admin_chart.city_to_coordinates", return_value={"lat": -3.71722, "lng": -38.54306, "tz_str": "America/Fortaleza"}):
        res = client.post(
            "/admin/generate-manual",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "[TEST_MOCK] Coordenadas Test",
                "birth_date": "1998-03-09",
                "birth_time": "18:35",
                "birth_country": "Brasil",
                "birth_state": "CE",
                "birth_city": "Fortaleza",
                "save_only": True,
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert "lat" in data
        assert "lng" in data
        assert data["lat"] is not None
        assert data["lng"] is not None

        list_res = client.get(
            "/admin/clients?limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        saved = next((u for u in items if u["id"] == data["id"]), None)
        assert saved is not None
        assert "lat" in saved
        assert "lng" in saved
        assert saved["lat"] is not None
        assert saved["lng"] is not None

def test_download_client_pdf_chart_only():
    token = get_admin_token()
    create_res = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] PDF Client",
            "birth_date": "1998-03-09",
            "birth_time": "18:35",
            "birth_country": "Brasil",
            "birth_state": "CE",
            "birth_city": "Fortaleza",
            "save_only": True,
        }
    )
    assert create_res.status_code == 200
    client_id = create_res.json()["id"]

    pdf_res = client.get(
        f"/admin/clients/{client_id}/pdf?chart_only=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "mapa-astral-" in pdf_res.headers.get("content-disposition", "")
    assert len(pdf_res.content) > 1000

def test_list_panel_users_endpoint():
    token = get_admin_token()
    res = client.get(
        "/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1

    # Valida estrutura do usuário retornado
    admin_user = next((u for u in data["items"] if u["role"] == "admin"), None)
    assert admin_user is not None
    assert "email" in admin_user
    assert "role" in admin_user
    assert "is_active" in admin_user

def test_list_panel_users_filters():
    token = get_admin_token()
    # Testar filtro por role=admin
    res_admin = client.get(
        "/admin/users?role=admin",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert all(u["role"] == "admin" for u in data_admin["items"])

    # Testar filtro por busca usando o email do super admin configurado
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com").strip().lower()
    search_term = super_admin_email.split("@")[0][:4]
    res_search = client.get(
        f"/admin/users?search={search_term}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] >= 1


def test_save_multiple_leads_creates_distinct_users():
    token = get_admin_token()
    # 1. Cadastra o primeiro lead
    res1 = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] Lead Um",
            "birth_date": "1994-01-10",
            "birth_time": "08:00",
            "birth_country": "Brasil",
            "birth_state": "SP",
            "birth_city": "Campinas",
            "save_only": True,
        },
    )
    assert res1.status_code == 200
    id1 = res1.json()["id"]

    # 2. Cadastra o segundo lead
    res2 = client.post(
        "/admin/generate-manual",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "[TEST_MOCK] Lead Dois",
            "birth_date": "1996-05-20",
            "birth_time": "14:30",
            "birth_country": "Brasil",
            "birth_state": "RJ",
            "birth_city": "Niterói",
            "save_only": True,
        },
    )
    assert res2.status_code == 200
    id2 = res2.json()["id"]

    # Deve gerar IDs distintos
    assert id1 != id2

    # Verifica no banco que ambos existem simultaneamente
    db = SessionLocal()
    try:
        user1 = db.query(User).filter(User.id == id1).first()
        user2 = db.query(User).filter(User.id == id2).first()
        assert user1 is not None
        assert user2 is not None
        assert user1.name == "[TEST_MOCK] Lead Um"
        assert user2.name == "[TEST_MOCK] Lead Dois"
    finally:
        db.close()





