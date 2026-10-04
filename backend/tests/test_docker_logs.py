import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import pytest

from main import app, seed_admin
from routes.docker_logs import _clean_docker_stream

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


def test_clean_docker_stream_empty():
    assert _clean_docker_stream(b"") == ""


def test_clean_docker_stream_multiplexed():
    # Header Docker: 1 byte stream type (1), 3 bytes 0, 4 bytes size big endian (5), followed by "HELLO"
    header = b"\x01\x00\x00\x00\x00\x00\x00\x05"
    payload = b"HELLO"
    stream = header + payload
    result = _clean_docker_stream(stream)
    assert result == "HELLO"


def test_clean_docker_stream_fallback():
    raw = b"Log normal sem header multiplexer\n"
    assert "Log normal" in _clean_docker_stream(raw)


def test_docker_logs_unauthorized():
    res = client.get("/admin/docker-logs?container=backend")
    assert res.status_code in [401, 403]


def test_docker_logs_invalid_container():
    token = get_admin_token()
    res = client.get(
        "/admin/docker-logs?container=invalido",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "Contêiner inválido" in res.json()["detail"]


def test_docker_logs_valid_query():
    token = get_admin_token()
    res = client.get(
        "/admin/docker-logs?container=backend&tail=20",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["container"] == "backend"
    assert "bussolaapp_backend" in data["container_name"]
    assert "command" in data
    assert "lines" in data
    assert "total_lines" in data


def test_docker_logs_frontend_query():
    token = get_admin_token()
    res = client.get(
        "/admin/docker-logs?container=frontend&tail=15",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["container"] == "frontend"
    assert "bussolaapp_frontend" in data["container_name"]
    assert isinstance(data["lines"], list)
