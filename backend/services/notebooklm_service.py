"""
notebooklm_service.py — Sirius Academy
Gera podcast via Google NotebookLM usando notebooklm-py.

AUTENTICAÇÃO:
  Defina a variável de ambiente NOTEBOOKLM_STORAGE com o conteúdo JSON
  do arquivo storage_state.json gerado pelo comando `notebooklm login`.

  Passo a passo (fazer UMA VEZ no seu computador):
    1. pip install "notebooklm-py[browser]" playwright
    2. playwright install chromium
    3. notebooklm login
    4. Copie o conteúdo de ~/.notebooklm/storage_state.json (ou caminho indicado)
    5. Cole como variável NOTEBOOKLM_STORAGE no Render
"""
import os
import json
import asyncio
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

_SECTION_LABELS = {
    "portal":          "Abertura",
    "essencia":        "Essência — Sol, Lua e Ascendente",
    "ferida_e_dom":    "A Ferida e o Dom — Quíron",
    "dons_esquecidos": "Dons Esquecidos",
    "luz_e_sombra":    "Luz e Sombra — Plutão e Lilith",
    "reencontro":      "O Reencontro",
    "rituais":         "Rituais de Integração",
    "afirmagias":      "Afirmagias",
}


def _is_available() -> bool:
    """Retorna True se as credenciais do NotebookLM estão configuradas."""
    return bool(os.getenv("NOTEBOOKLM_STORAGE"))


def _build_source_text(
    name: str,
    sun_sign: str,
    moon_sign: str,
    rising_sign: str,
    sections: dict,
    form_answers: dict,
) -> str:
    """Monta o texto do Mapa da Alma para enviar ao NotebookLM como fonte."""
    first = name.split()[0]
    lines = [
        f"# Mapa da Alma de {name}",
        f"\n## Configuração Astrológica",
        f"- Sol em {sun_sign}",
        f"- Lua em {moon_sign}",
        f"- Ascendente em {rising_sign}",
        f"\n## Sobre {first}",
        f"- O que está vivendo agora: {form_answers.get('vida_agora', '')}",
        f"- O que mudaria: {form_answers.get('carrega_tempo', '')}",
        f"- O que espera descobrir: {form_answers.get('espera_descobrir', '')}",
        f"\n## Leitura Completa do Mapa da Alma",
    ]
    for key, label in _SECTION_LABELS.items():
        content = sections.get(key, "").strip()
        if content:
            lines.append(f"\n### {label}\n{content}")

    return "\n".join(lines)


async def generate_notebooklm_podcast(
    name: str,
    sun_sign: str,
    moon_sign: str,
    rising_sign: str,
    sections: dict,
    form_answers: dict,
) -> bytes:
    """
    Gera podcast via NotebookLM.
    Retorna bytes MP3 prontos para streaming.
    Levanta RuntimeError se as credenciais não estiverem configuradas.
    """
    if not _is_available():
        raise RuntimeError(
            "NOTEBOOKLM_STORAGE não configurado. "
            "Execute 'notebooklm login' e defina a variável de ambiente."
        )

    try:
        from notebooklm import NotebookLMClient, AuthTokens
    except ImportError:
        raise RuntimeError(
            "notebooklm-py não instalado. Adicione 'notebooklm-py' ao requirements.txt."
        )

    first = name.split()[0]
    storage_json = os.getenv("NOTEBOOKLM_STORAGE", "")

    # Escreve o storage_state.json em arquivo temporário para o cliente carregar
    with tempfile.TemporaryDirectory() as tmpdir:
        storage_path = Path(tmpdir) / "storage_state.json"
        storage_path.write_text(storage_json, encoding="utf-8")

        source_text = _build_source_text(
            name=name,
            sun_sign=sun_sign,
            moon_sign=moon_sign,
            rising_sign=rising_sign,
            sections=sections,
            form_answers=form_answers,
        )

        notebook_id = None
        mp3_path = Path(tmpdir) / "podcast.mp3"

        try:
            async with NotebookLMClient.from_storage(storage_path) as client:
                # 1. Cria notebook
                logger.info("📓 Criando notebook NotebookLM para '%s'", first)
                nb = await client.notebooks.create(f"Mapa da Alma — {first}")
                notebook_id = nb.id

                # 2. Adiciona o mapa como fonte de texto
                logger.info("📄 Adicionando fonte ao notebook")
                await client.sources.add_text(
                    notebook_id,
                    source_text,
                    title=f"Mapa da Alma de {name}",
                    wait=True,
                )

                # 3. Gera o áudio (deep-dive = conversa entre dois narradores)
                logger.info("🎙️ Gerando áudio no NotebookLM (pode levar alguns minutos)...")
                instructions = (
                    f"Façam uma conversa profunda e reveladora sobre o Mapa da Alma de {first}. "
                    f"Explorem os temas de identidade (Sol em {sun_sign}), emoções (Lua em {moon_sign}) "
                    f"e propósito (Ascendente em {rising_sign}). "
                    f"Revelem padrões, feridas e dons com sensibilidade e profundidade. "
                    f"Terminem com uma mensagem transformadora diretamente para {first}."
                )
                status = await client.artifacts.generate_audio(
                    notebook_id,
                    style="deep-dive",
                    instructions=instructions,
                )

                # 4. Aguarda conclusão (timeout de 10 minutos)
                await asyncio.wait_for(
                    client.artifacts.wait_for_completion(notebook_id, status.task_id),
                    timeout=600,
                )

                # 5. Baixa o MP3
                logger.info("⬇️ Baixando MP3...")
                await client.artifacts.download_audio(notebook_id, str(mp3_path))

        finally:
            # 6. Remove o notebook para não poluir a conta
            if notebook_id:
                try:
                    async with NotebookLMClient.from_storage(storage_path) as client:
                        await client.notebooks.delete(notebook_id)
                        logger.info("🗑️ Notebook '%s' removido", notebook_id)
                except Exception:
                    logger.warning("Não foi possível remover o notebook %s", notebook_id)

        if not mp3_path.exists() or mp3_path.stat().st_size == 0:
            raise RuntimeError("NotebookLM não retornou áudio válido.")

        mp3_bytes = mp3_path.read_bytes()
        logger.info("✅ Podcast NotebookLM gerado: %.1f KB", len(mp3_bytes) / 1024)
        return mp3_bytes
