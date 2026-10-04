import os
import sys

# Força o ambiente de testes antes de qualquer importação da aplicação
os.environ["TESTING"] = "1"

import pytest
from models.models import Base
from database import engine, SessionLocal
from main import seed_admin


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Inicializa o banco de dados de testes isolado (sirius_test),
    criando todas as tabelas e o administrador inicial.
    Garante que os dados do banco principal (sirius_academy) fiquem 100% preservados.
    """
    # Cria todas as tabelas no banco sirius_test
    Base.metadata.create_all(bind=engine)

    # Inicializa o administrador no banco de teste
    seed_admin()

    yield

    # Opcional: teardown pós suite de testes
