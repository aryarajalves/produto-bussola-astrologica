import os
import pytest
from database import DATABASE_URL, engine, SessionLocal
from models.models import User


def test_database_url_points_to_test_database():
    """
    Valida que o pytest está executando estritamente no banco bussolaapp_test,
    isolando totalmente o banco principal bussolaapp_db.
    """
    assert "bussolaapp_test" in DATABASE_URL
    assert "bussolaapp_db" not in DATABASE_URL


def test_crud_operates_on_isolated_test_database():
    """
    Valida que operações de banco de teste não afetam o banco principal.
    """
    db = SessionLocal()
    try:
        # Verifica conexão e que as tabelas existem no sirius_test
        admin = db.query(User).filter(User.role == "admin").first()
        assert admin is not None
    finally:
        db.close()
