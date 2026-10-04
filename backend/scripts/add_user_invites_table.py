"""
Script de migração: Criação da tabela user_invites
Executa DDL idempotente para criar a tabela de links de convites de usuários.
"""
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import engine

def migrate():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_invites (
                id UUID PRIMARY KEY,
                token VARCHAR NOT NULL UNIQUE,
                role VARCHAR NOT NULL DEFAULT 'client',
                validity_type VARCHAR NOT NULL DEFAULT 'never',
                expires_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                used_at TIMESTAMP NULL,
                used_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS ix_user_invites_token ON user_invites (token);
        """))
    print("Migração concluída com sucesso: tabela user_invites verificada/criada.")

if __name__ == "__main__":
    migrate()
