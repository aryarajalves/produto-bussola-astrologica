#!/usr/bin/env python3
"""
Gerenciador de versões do prompt mapa_mestre.txt
Uso:
  python switch_version.py          # lista versões disponíveis
  python switch_version.py v1.0     # ativa a versão v1.0
  python switch_version.py v2.0     # ativa a versão v2.0
"""
import sys
import shutil
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent
VERSIONS_DIR = PROMPTS_DIR / "versions"
ACTIVE = PROMPTS_DIR / "mapa_mestre.txt"


def list_versions():
    versions = sorted(VERSIONS_DIR.glob("mapa_mestre_*.txt"))
    if not versions:
        print("Nenhuma versão salva encontrada em prompts/versions/")
        return
    print("\nVersoes disponíveis:\n")
    for v in versions:
        size = v.stat().st_size // 1024
        print(f"  {v.stem.replace('mapa_mestre_', '')}  —  {v.name}  ({size} KB)")
    print(f"\nAtiva: {ACTIVE.name} ({ACTIVE.stat().st_size // 1024} KB)\n")


def switch_to(version_tag: str):
    # Procura arquivo que contenha a tag
    matches = list(VERSIONS_DIR.glob(f"mapa_mestre_{version_tag}*.txt"))
    if not matches:
        print(f"Versao '{version_tag}' nao encontrada em prompts/versions/")
        list_versions()
        return

    target = matches[0]
    # Salva versao atual como backup antes de trocar
    from datetime import datetime
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = VERSIONS_DIR / f"mapa_mestre_backup_{stamp}.txt"
    shutil.copy2(ACTIVE, backup)
    print(f"Backup da versao atual salvo em: {backup.name}")

    # Ativa a versao escolhida
    shutil.copy2(target, ACTIVE)
    print(f"Versao '{target.stem}' ativada com sucesso!\n")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        list_versions()
    else:
        switch_to(sys.argv[1])
