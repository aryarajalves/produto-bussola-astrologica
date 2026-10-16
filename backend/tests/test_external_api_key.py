import os
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.models import User, UserInvite

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_env():
    os.environ["EXTERNAL_API_KEY"] = "teste_api_key_12345"
    yield

def test_gerar_convite_com_api_key_valida():
    response = client.post(
        "/admin/invites",
        headers={"X-API-Key": "teste_api_key_12345"},
        json={"role": "client", "validity_type": "never"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "client"
    assert data["validity_type"] == "never"
    assert data["expires_at"] is None
    assert "token" in data
    assert "/cadastro?token=" in data["invite_path"]

def test_gerar_convite_com_api_key_invalida():
    response = client.post(
        "/admin/invites",
        headers={"X-API-Key": "chave_totalmente_errada"},
        json={"role": "client", "validity_type": "never"}
    )
    assert response.status_code == 401
    assert "inválida" in response.json()["detail"]

def test_gerar_convite_sem_autenticacao():
    response = client.post(
        "/admin/invites",
        json={"role": "client", "validity_type": "never"}
    )
    assert response.status_code == 401
