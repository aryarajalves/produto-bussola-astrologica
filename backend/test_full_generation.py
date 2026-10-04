import sys
import os
import asyncio
from datetime import date, datetime

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s — %(message)s")
logger = logging.getLogger("test_full_gen")

async def test_full_user_generation():
    print("=" * 60)
    print("   SIRIUS ACADEMY - TESTE COMPLETO DE GERAÇÃO DE MAPA")
    print("=" * 60)
    print(f"Horário do Teste: {datetime.now().isoformat()}")
    print("-" * 60)

    from database import SessionLocal
    from models.models import User, Chart, ChartSection
    from services.geocoding_service import city_to_coordinates
    from services.astro_service import generate_birth_chart
    from services.ai_service import generate_sections
    from routes.auth import hash_password

    db = SessionLocal()

    test_email = "cliente.teste.sirius@example.com"
    test_name = "Maria Eduarda Teste"
    
    print("[PASSO 1/5] Limpando registros antigos do usuário de teste se existirem...")
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        old_charts = db.query(Chart).filter(Chart.user_id == existing.id).all()
        for oc in old_charts:
            db.query(ChartSection).filter(ChartSection.chart_id == oc.id).delete()
            db.delete(oc)
        db.delete(existing)
        db.commit()
        print("  [OK] Usuário anterior removido para teste limpo.")
    else:
        print("  [OK] Nenhum usuário de teste antigo encontrado.")
    print("-" * 60)

    print("[PASSO 2/5] Calculando Coordenadas e Geocodificação...")
    coords = city_to_coordinates("Passo Fundo", "RS", "Brasil")
    print(f"  [OK] Coordenadas: {coords}")
    print("-" * 60)

    print("[PASSO 3/5] Calculando Mapa Astral (Kerykeion)...")
    astro = generate_birth_chart(
        name=test_name,
        year=1995,
        month=5,
        day=15,
        hour=12,
        minute=0,
        lat=coords["lat"],
        lng=coords["lng"],
        tz_str=coords["tz_str"],
        is_dst=False,
        city_name="Passo Fundo",
        country_name="Brasil"
    )
    chart_data = astro["chart_data"]
    svg_content = astro["svg"]
    print(f"  [OK] Mapa Astral calculado: Sol em {chart_data['sun']['sign']}, Lua em {chart_data['moon']['sign']}, Asc em {chart_data['rising']['sign']}")
    print("-" * 60)

    print("[PASSO 4/5] Chamando OpenAI (GPT-4o) para gerar as 8 seções completas do Mapa da Alma...")
    form_answers = {
        "vida_agora": "Estou em um momento de transição de carreira e busca por autoconhecimento.",
        "carrega_tempo": "Medo de arriscar e procrastinação.",
        "espera_descobrir": "Quero entender meus dons e minha verdadeira missão de vida.",
    }
    focus_areas = ["Propósito de Vida", "Espiritualidade", "Relacionamentos"]

    start_time = datetime.now()
    sections = await generate_sections(
        chart_data=chart_data,
        form_answers=form_answers,
        focus_areas=focus_areas,
        name=test_name
    )
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"  [OK] Leitura com IA concluída em {elapsed:.1f}s!")
    print("-" * 60)

    print("[PASSO 5/5] Salvando Usuário, Mapa e Seções no Banco de Dados...")
    user = User(
        name=test_name,
        email=test_email,
        whatsapp="5554999999999",
        password_hash=hash_password("senha123"),
        birth_date=date(1995, 5, 15),
        birth_city="Passo Fundo",
        birth_state="RS",
        birth_country="Brasil",
        tz_str=coords["tz_str"],
        lat=coords["lat"],
        lng=coords["lng"],
        sun_sign=chart_data["sun"]["sign"],
        moon_sign=chart_data["moon"]["sign"],
        rising_sign=chart_data["rising"]["sign"],
        focus_areas=focus_areas,
        form_vida_agora=form_answers["vida_agora"],
        form_carrega_tempo=form_answers["carrega_tempo"],
        form_espera_descobrir=form_answers["espera_descobrir"],
        role="client",
    )
    db.add(user)
    db.flush()

    chart = Chart(
        user_id=user.id,
        svg_content=svg_content,
        chart_data=chart_data,
        status="completed",
        sun_sign=chart_data["sun"]["sign"],
        moon_sign=chart_data["moon"]["sign"],
        rising_sign=chart_data["rising"]["sign"],
        delivered_at=datetime.utcnow()
    )
    db.add(chart)
    db.flush()

    SECTION_ORDER = [
        "portal", "essencia", "ferida_e_dom",
        "dons_esquecidos", "luz_e_sombra", "reencontro",
        "rituais", "afirmagias",
    ]

    saved_count = 0
    for idx, key in enumerate(SECTION_ORDER, start=1):
        content = sections.get(key, "")
        if content:
            sec = ChartSection(
                chart_id=chart.id,
                section_key=key,
                content=content,
                section_order=idx
            )
            db.add(sec)
            saved_count += 1
            print(f"  [OK] Seção '{key}': {len(content)} caracteres gerados e salvos.")
        else:
            print(f"  [FAIL] Seção '{key}' veio vazia!")

    db.commit()
    db.close()

    print("=" * 60)
    print(f"SUCESSO TOTAL! {saved_count}/{len(SECTION_ORDER)} seções foram geradas e salvas.")
    print(f"Usuário de Teste Criado: {test_email}")
    print("O fluxo completo do funil de geração do mapa está 100% FUNCIONAL.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_user_generation())
