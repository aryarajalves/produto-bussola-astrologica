import sys
import os
import asyncio
from datetime import datetime

# Adiciona o diretório do backend ao path para importação
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Configuração de logging
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s — %(message)s")
logger = logging.getLogger("beta_tester")

async def run_tests():
    print("=" * 60)
    print("    SIRIUS ACADEMY - SUITE DE TESTES BETA INTEGRADA")
    print("=" * 60)
    print(f"Horario do Teste: {datetime.now().isoformat()}")
    print(f"Diretorio: {os.getcwd()}")
    print("-" * 60)

    errors = []

    # 1. Teste de Variáveis de Ambiente
    print("[TESTE 1/5] Verificando Variaveis de Ambiente...")
    required_envs = ["DATABASE_URL", "OPENAI_API_KEY", "RESEND_API_KEY"]
    for env in required_envs:
        val = os.getenv(env)
        if val:
            # Mostra apenas os caracteres iniciais e finais por segurança
            masked = val[:8] + "..." + val[-8:] if len(val) > 16 else "***"
            print(f"  [OK] {env}: Configurada ({masked})")
        else:
            print(f"  [FAIL] {env}: Ausente!")
            errors.append(f"Variavel de ambiente {env} nao configurada.")
    print("-" * 60)

    # 2. Teste de Banco de Dados
    print("[TESTE 2/5] Verificando Conexao com o Banco de Dados...")
    try:
        from database import SessionLocal
        db = SessionLocal()
        # Executa uma query simples
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("  [OK] Banco de Dados: Conexao bem-sucedida!")
        db.close()
    except Exception as e:
        print(f"  [FAIL] Banco de Dados: Falha na conexao! Erro: {e}")
        errors.append(f"Conexao com o banco de dados falhou: {e}")
    print("-" * 60)

    # 3. Teste de Geocodificação (Open-Meteo com Fallback)
    print("[TESTE 3/5] Verificando Geolocalizacao (Busca de Cidades)...")
    try:
        from services.geocoding_service import search_cities, city_to_coordinates
        # Teste 1: busca por autocomplete
        cities = search_cities("Passo Fundo")
        if cities:
            print(f"  [OK] search_cities: OK. Encontrou '{cities[0]['display']}' (Timezone: {cities[0]['tz_str']})")
        else:
            print("  [FAIL] search_cities: Retornou lista vazia para 'Passo Fundo'.")
            errors.append("search_cities retornou lista vazia para 'Passo Fundo'.")

        # Teste 2: busca direta de coordenadas
        coords = city_to_coordinates("Passo Fundo", "RS", "Brasil")
        print(f"  [OK] city_to_coordinates: OK. Coordenadas: {coords}")
    except Exception as e:
        print(f"  [FAIL] Geolocalizacao: Falha no servico! Erro: {e}")
        errors.append(f"Servico de geocodificacao falhou: {e}")
    print("-" * 60)

    # 4. Teste de Astrologia (Kerykeion / generate_birth_chart)
    print("[TESTE 4/5] Verificando Geracao de Mapa Astral (Kerykeion)...")
    try:
        from services.astro_service import generate_birth_chart
        astro = generate_birth_chart(
            name="Teste Beta",
            year=1995,
            month=5,
            day=15,
            hour=12,
            minute=0,
            lat=-23.5475,
            lng=-46.6361,
            tz_str="America/Sao_Paulo",
            is_dst=False,
            city_name="Sao Paulo",
            country_name="Brasil"
        )
        sun_sign = astro["chart_data"]["sun"]["sign"]
        rising_sign = astro["chart_data"]["rising"]["sign"]
        print(f"  [OK] Calculo Astrologico: OK. Sol em {sun_sign}, Ascendente em {rising_sign}")
        if astro.get("svg"):
            print("  [OK] Renderizacao SVG: OK. Grafico do mapa gerado com sucesso.")
        else:
            print("  [FAIL] Renderizacao SVG: SVG veio vazio!")
            errors.append("Calculo astrologico nao gerou o grafico SVG.")
    except Exception as e:
        print(f"  [FAIL] Astrologia: Falha no calculo! Erro: {e}")
        errors.append(f"Calculo astrologico falhou: {e}")
    print("-" * 60)

    # 5. Teste de Inteligência Artificial (OpenAI gpt-4o)
    print("[TESTE 5/5] Verificando Leitura com Inteligencia Artificial (OpenAI)...")
    try:
        from services.ai_service import client, _SYSTEM_PROMPT
        # Faz um teste rápido e barato com gpt-4o
        print("  Enviando requisicao curta para a OpenAI (gpt-4o)...")
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": "Isto e um teste beta. Responda apenas com: 'OpenAI OK'"}
            ],
            max_completion_tokens=10,
            temperature=0.0
        )
        res_text = response.choices[0].message.content.strip()
        print(f"  [OK] OpenAI gpt-4o: OK. Resposta da IA: '{res_text}'")
    except Exception as e:
        print(f"  [FAIL] OpenAI: Falha na requisicao! Erro: {e}")
        errors.append(f"Conexao ou chamada a OpenAI falhou: {e}")
    print("-" * 60)

    # Conclusao
    print("=" * 60)
    if not errors:
        print("TODOS OS TESTES PASSARAM COM SUCESSO!")
        print("O sistema esta 100% operacional e pronto para producao.")
        print("=" * 60)
        return True
    else:
        print("HA PONTOS FALHOS NO SISTEMA QUE PRECISAM DE ATENCAO:")
        for err in errors:
            print(f"  - {err}")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
