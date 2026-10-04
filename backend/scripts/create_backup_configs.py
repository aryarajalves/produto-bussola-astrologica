import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine

def migrate():
    print("Iniciando migração: criação da tabela backup_configs...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS backup_configs (
                id VARCHAR(36) PRIMARY KEY,
                is_active BOOLEAN DEFAULT TRUE,
                frequency_hours INTEGER DEFAULT 6,
                b2_folder VARCHAR(255) DEFAULT 'AreaDeMembros/backups/',
                retention_max INTEGER DEFAULT 30,
                last_backup_at TIMESTAMP NULL,
                next_backup_at TIMESTAMP NULL,
                last_backup_status VARCHAR(50) DEFAULT 'idle',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
    print("Tabela backup_configs criada com sucesso!")

if __name__ == "__main__":
    migrate()
