import sys
import os
import asyncio
from datetime import date, datetime

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s — %(message)s")
logger = logging.getLogger("test_focus_areas")

async def test_user_focus_generation():
    print("=" * 65)
    print("   SIRIUS ACADEMY - TESTE DE USUÁRIO (CARREIRA, NEGÓCIOS E AMOR)")
    print("=" * 65)
    print(f"Horário do Teste: {datetime.now().isoformat()}")
    print("-" * 65)

    from database import SessionLocal
    from models.models import User, Chart, ChartSection
    from services.geocoding_service import city_to_coordinates
    from services.astro_service import generate_birth_chart
    from services.ai_service import generate_sections
    from routes.auth import hash_password

    db = SessionLocal()

    test_email = "mariana.negocios.amor@example.com"
    test_name = "Mariana Silva"
    
    print("[1/5] Limpando dados do usuário de teste caso existam...")
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        old_charts = db.query(Chart).filter(Chart.user_id == existing.id).all()
        for oc in old_charts:
            db.query(ChartSection).filter(ChartSection.chart_id == oc.id).delete()
            db.delete(oc)
        db.delete(existing)
        db.commit()
    print("  [OK] Ambiente pronto para novo teste.")
    print("-" * 65)

    print("[2/5] Buscando Geocodificação da cidade de nascimento...")
    coords = city_to_coordinates("São Paulo", "SP", "Brasil")
    print(f"  [OK] São Paulo, SP: Lat {coords['lat']}, Lng {coords['lng']}, Timezone {coords['tz_str']}")
    print("-" * 65)

    print("[3/5] Gerando Mapa Astral Completo...")
    astro = generate_birth_chart(
        name=test_name,
        year=1992,
        month=8,
        day=24,
        hour=10,
        minute=30,
        lat=coords["lat"],
        lng=coords["lng"],
        tz_str=coords["tz_str"],
        is_dst=False,
        city_name="São Paulo",
        country_name="Brasil"
    )
    chart_data = astro["chart_data"]
    svg_content = astro["svg"]
    print(f"  [OK] Astrologia: Sol em {chart_data['sun']['sign']}, Lua em {chart_data['moon']['sign']}, Asc em {chart_data['rising']['sign']}")
    print("-" * 65)

    print("[4/5] Gerando leitura com IA personalizada para Carreira, Negócios e Amor...")
    focus_areas = ["Carreira e Propósito", "Amor e Relacionamentos", "Finanças e Prosperidade"]
    form_answers = {
        "vida_agora": "Estou iniciando um novo negócio próprio de consultoria e transição de carreira, buscando crescer financeiramente.",
        "carrega_tempo": "Insegurança ao cobrar pelo meu trabalho e dificuldade em equilibrar vida profissional com a vida amorosa.",
        "espera_descobrir": "Quero entender como usar meus mapas para ter sucesso nos negócios, prosperar e construir uma relação afetiva madura.",
    }

    print("  Áreas de foco selecionadas:", focus_areas)
    start_t = datetime.now()
    sections = await generate_sections(
        chart_data=chart_data,
        form_answers=form_answers,
        focus_areas=focus_areas,
        name=test_name
    )
    duration = (datetime.now() - start_t).total_seconds()
    print(f"  [OK] Leitura completa gerada via GPT-4o em {duration:.1f} segundos!")
    print("-" * 65)

    print("[5/5] Registrando Usuário, Mapa e Seções no Banco de Dados...")
    user = User(
        name=test_name,
        email=test_email,
        whatsapp="5511988887777",
        password_hash=hash_password("senhaSegura123"),
        birth_date=date(1992, 8, 24),
        birth_city="São Paulo",
        birth_state="SP",
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

    saved = 0
    print("\n--- DETALHAMENTO DAS SEÇÕES GERADAS ---")
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
            saved += 1
            sample = content[:150].replace("\n", " ")
            safe_sample = sample.encode("ascii", errors="ignore").decode("ascii")
            print(f"  [OK] Seção {idx}/8 [{key}]: {len(content)} caracteres")
            print(f"    Trecho: \"{safe_sample}...\"")
        else:
            print(f"  [FAIL] Seção {idx}/8 [{key}] VEIO VAZIA!")

    db.commit()
    db.close()

    print("=" * 65)
    if saved == 8:
        print("RESULTADO: 8/8 SEÇÕES GERADAS E SALVAS COM SUCESSO COMPLETO!")
        print("O Mapa da Alma para Carreira, Negócios e Amor está 100% OPERACIONAL!")
    else:
        print(f"ATENÇÃO: Apenas {saved}/8 seções foram salvas.")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(test_user_focus_generation())
