import os
from fastapi.testclient import TestClient
from main import app, seed_admin

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def test_super_admin_login():
    # Garante que o seed executou
    seed_admin()
    
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@sirius.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "sirius123")

    response = client.post("/auth/login", json={
        "email": super_admin_email,
        "password": super_admin_pass
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["role"] == "admin"

def test_login_invalid_credentials():
    response = client.post("/auth/login", json={
        "email": "usuario_inexistente_12345@sirius.com",
        "password": "senha_incorreta"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"
