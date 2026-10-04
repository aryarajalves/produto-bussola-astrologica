#!/usr/bin/env python3
"""
Script de auditoria unificada de seguranca (Backend + Frontend)
Conforme exigido pelo protocolo de seguranca do repositorio:
- Backend: pip-audit no backend/requirements.txt
- Frontend: npm audit no frontend/package.json
"""

import subprocess
import sys


def run_command(cmd, desc):
    print(f"[*] Executando {desc}...")
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] Falha na verificacao ({desc}):\n{res.stdout}\n{res.stderr}")
            return False, res.stdout + "\n" + res.stderr
        print(f"[+] {desc}: APROVADO sem vulnerabilidades.")
        if res.stdout.strip():
            print(res.stdout.strip())
        return True, res.stdout
    except Exception as e:
        print(f"[!] Erro ao executar {desc}: {e}")
        return False, str(e)


def main():
    print("=== INICIANDO AUDITORIA DE SEGURANCA UNIFICADA ===")
    
    # 1. Backend pip-audit
    backend_ok, backend_out = run_command(
        "docker exec bussolaapp_backend pip-audit -r /app/requirements.txt",
        "Auditoria Backend (pip-audit)",
    )
    if not backend_ok:
        # Fallback local se docker nao estiver respondendo
        backend_ok, backend_out = run_command(
            "pip-audit -r backend/requirements.txt",
            "Auditoria Backend Local (pip-audit)",
        )

    # 2. Frontend npm audit
    frontend_ok, frontend_out = run_command(
        "docker exec bussolaapp_frontend npm audit",
        "Auditoria Frontend (npm audit)",
    )
    if not frontend_ok:
        # Fallback local se docker nao estiver respondendo
        frontend_ok, frontend_out = run_command(
            "npm audit --prefix frontend",
            "Auditoria Frontend Local (npm audit)",
        )

    print("\n=== RESULTADO DA AUDITORIA ===")
    if backend_ok and frontend_ok:
        print("[OK] 100% APROVADO: 0 vulnerabilidades criticas encontradas!")
        sys.exit(0)
    else:
        print("[ERRO] Vulnerabilidades detectadas. Push bloqueado conforme protocolo.")
        sys.exit(1)


if __name__ == "__main__":
    main()
