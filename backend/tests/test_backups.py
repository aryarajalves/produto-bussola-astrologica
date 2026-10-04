import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import pytest

from main import app, seed_admin
from database import SessionLocal
from models.models import BackupConfig
from services.backup_service import format_size

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


def test_format_size_utility():
    assert format_size(500) == "500 B"
    assert "KB" in format_size(2048)
    assert "MB" in format_size(15 * 1024 * 1024)
    assert "GB" in format_size(2 * 1024 * 1024 * 1024)


def test_get_backup_status_unauthorized():
    res = client.get("/admin/backups/status")
    assert res.status_code in [401, 403]


def test_get_backup_status_as_admin():
    token = get_admin_token()
    res = client.get(
        "/admin/backups/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "b2_connected" in data
    assert "retention_max" in data
    assert "is_auto_active" in data
    assert "b2_folder" in data


def test_list_backups_as_admin():
    token = get_admin_token()
    res = client.get(
        "/admin/backups",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert isinstance(data["backups"], list)


def test_get_and_update_backup_config():
    token = get_admin_token()
    
    # Obter config atual
    res = client.get(
        "/admin/backups/config",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    current_config = res.json()
    assert "is_active" in current_config
    assert "frequency_hours" in current_config

    # Atualizar config
    update_payload = {
        "is_active": True,
        "frequency_hours": 12,
        "b2_folder": "AreaDeMembros/backups/",
        "retention_max": 25,
    }
    update_res = client.put(
        "/admin/backups/config",
        headers={"Authorization": f"Bearer {token}"},
        json=update_payload,
    )
    assert update_res.status_code == 200
    up_data = update_res.json()
    assert up_data["success"] is True
    assert up_data["config"]["frequency_hours"] == 12
    assert up_data["config"]["retention_max"] == 25


def test_upload_backup_invalid_extension():
    token = get_admin_token()
    files = {"file": ("invalid_backup.txt", b"conteudo de teste", "text/plain")}
    res = client.post(
        "/admin/backups/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert res.status_code == 400
    assert "Formato de arquivo inválido" in res.json()["detail"]


def test_upload_backup_empty_file():
    token = get_admin_token()
    files = {"file": ("empty_dump.dump.gz", b"", "application/gzip")}
    res = client.post(
        "/admin/backups/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert res.status_code == 400
    assert "vazio" in res.json()["detail"].lower()


@patch("services.backup_service.get_b2_client")
def test_delete_backup_mocked(mock_get_client):
    mock_s3 = MagicMock()
    mock_get_client.return_value = mock_s3
    token = get_admin_token()

    res = client.delete(
        "/admin/backups/backup-manual-teste.dump.gz",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    mock_s3.delete_object.assert_called_once()
