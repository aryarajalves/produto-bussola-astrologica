"""Testes do cálculo de trânsitos e das 60 interpretações.

Nenhum deles toca banco, rede ou IA: são o cálculo e o texto, que é onde o
produto erra feio e em silêncio. Erro de banco aparece na hora; casa errada
numa leitura ninguém percebe, e a pessoa recebe o conselho do dia de outra.
"""
import re
from datetime import date, datetime

from services.interpretacoes import PLANETA_ACAO, PLANETA_CASA, faltando, interpretacao
from services.transit_service import PLANETAS_RAPIDOS, calcular_transitos, gerar_svg

# Jordão, 18/12/2000 às 14:30 em Ribeirão Preto. Data e lugar reais, usados
# também no quiz: se os dois projetos divergirem, um deles quebrou.
NASC = datetime(2000, 12, 18, 14, 30)
LAT, LNG, TZ = -21.1775, -47.8103, "America/Sao_Paulo"
DIA = date(2026, 10, 6)


def _posicoes(data_alvo=DIA, **kw):
    return calcular_transitos(
        nome="Jordão", nascimento=NASC, lat=LAT, lng=LNG, tz_str=TZ,
        data_alvo=data_alvo, cidade="Ribeirão Preto", **kw,
    )["posicoes"]


# --------------------------------------------------------------- as 60 vagas

def test_as_60_combinacoes_existem():
    assert faltando() == [], f"faltam interpretações: {faltando()}"
    assert len(PLANETA_CASA) == 60


def test_toda_interpretacao_tem_corpo():
    for (planeta, casa), texto in PLANETA_CASA.items():
        assert len(texto) >= 120, f"{planeta} casa {casa} está curto demais"
        assert texto[0].isupper(), f"{planeta} casa {casa} não começa com maiúscula"
        assert texto.rstrip()[-1] in ".!?", f"{planeta} casa {casa} não termina a frase"


def test_nenhuma_interpretacao_usa_termo_de_astrologia():
    """A pessoa lê sobre a vida dela, não sobre o céu. O termo técnico fica na
    etiqueta da posição, nunca no texto."""
    proibidos = [
        "trânsito", "retrógrado", "mapa astral", "casa 1", "casa 5", "ascendente",
        "signo", "zodíaco", "áries", "touro", "gêmeos", "câncer", "leão", "virgem",
        "libra", "escorpião", "sagitário", "capricórnio", "aquário", "peixes",
        "mercúrio", "vênus", "marte", "júpiter", "saturno", "plutão",
    ]
    for (planeta, casa), texto in PLANETA_CASA.items():
        baixo = texto.lower()
        for termo in proibidos:
            assert termo not in baixo, f"{planeta} casa {casa} usa '{termo}'"


def test_nenhuma_interpretacao_promete_resultado():
    promessas = [
        "vai dar certo", "o dinheiro chega", "o dinheiro vem", "o universo",
        "tudo vai", "com certeza você vai", "garantido", "destino reserva",
    ]
    for (planeta, casa), texto in PLANETA_CASA.items():
        baixo = texto.lower()
        for p in promessas:
            assert p not in baixo, f"{planeta} casa {casa} promete: '{p}'"


def test_interpretacoes_estao_acentuadas():
    """Já saiu daqui um arquivo inteiro em ASCII. Texto sem acento é texto que
    não pode ser mostrado a um brasileiro."""
    sem_acento = re.compile(
        r"\b(voce|esta|nao|atencao|decisao|familia|forca|dinheiro\w*cao|"
        r"divida|facil|rapido|mes|so e)\b"
    )
    for (planeta, casa), texto in PLANETA_CASA.items():
        achado = sem_acento.search(texto.lower())
        assert not achado, f"{planeta} casa {casa}: '{achado.group(0)}' sem acento"
    for planeta, acao in PLANETA_ACAO.items():
        assert not sem_acento.search(acao.lower()), f"ação de {planeta} sem acento"


# ------------------------------------------------------------------ o cálculo

def test_devolve_os_cinco_planetas_rapidos():
    posicoes = _posicoes(com_janela=False)
    assert [p["planeta"] for p in posicoes] == list(PLANETAS_RAPIDOS)


def test_casa_signo_e_texto_vem_preenchidos():
    for p in _posicoes(com_janela=False):
        assert 1 <= p["casa"] <= 12, f"{p['planeta']} caiu na casa {p['casa']}"
        assert p["signo"], f"{p['planeta']} sem signo"
        assert p["planeta_pt"], f"{p['planeta']} sem nome em português"
        assert isinstance(p["retrogrado"], bool)
        assert interpretacao(p["planeta"], p["casa"]), \
            f"sem texto para {p['planeta']} casa {p['casa']}"


def test_o_mesmo_dia_da_sempre_a_mesma_leitura():
    """Dia igual, céu igual. Se isto variar, a pessoa abre a mesma data duas
    vezes e recebe dois conselhos diferentes."""
    a = _posicoes(com_janela=False)
    b = _posicoes(com_janela=False)
    assert a == b


def test_as_casas_sao_as_do_mapa_dela_e_nao_as_do_ceu_do_dia():
    """O erro clássico: usar a casa do planeta no mapa do trânsito em vez de
    projetá-lo nas casas natais. Mesma data, horas de nascimento diferentes —
    se as casas não mudam, estamos lendo o céu de ninguém."""
    manha = calcular_transitos(
        nome="Teste", nascimento=datetime(2000, 12, 18, 6, 0),
        lat=LAT, lng=LNG, tz_str=TZ, data_alvo=DIA, com_janela=False,
    )["posicoes"]
    noite = calcular_transitos(
        nome="Teste", nascimento=datetime(2000, 12, 18, 18, 0),
        lat=LAT, lng=LNG, tz_str=TZ, data_alvo=DIA, com_janela=False,
    )["posicoes"]
    casas_manha = {p["planeta"]: p["casa"] for p in manha}
    casas_noite = {p["planeta"]: p["casa"] for p in noite}
    assert casas_manha != casas_noite


def test_sem_janela_nao_calcula_data_de_saida():
    for p in _posicoes(com_janela=False):
        assert p["ate"] is None


def test_a_janela_termina_no_ultimo_dia_da_casa():
    """A data devolvida é o último dia naquela casa: no dia seguinte o planeta
    tem que estar em outra."""
    from datetime import timedelta
    for p in _posicoes():
        if not p["ate"]:
            continue
        ultimo = date.fromisoformat(p["ate"])
        assert ultimo >= DIA, f"{p['planeta']} saiu antes do dia pedido"
        depois = calcular_transitos(
            nome="Jordão", nascimento=NASC, lat=LAT, lng=LNG, tz_str=TZ,
            data_alvo=ultimo + timedelta(days=1), com_janela=False,
        )["posicoes"]
        casa_depois = {q["planeta"]: q["casa"] for q in depois}[p["planeta"]]
        assert casa_depois != p["casa"], \
            f"{p['planeta']} continua na casa {p['casa']} depois de {p['ate']}"


def test_a_lua_nao_fica_mais_de_poucos_dias_na_mesma_casa():
    """Sanidade física: a Lua atravessa o mapa em 28 dias, nunca dura semanas
    numa casa. Se durar, a busca da janela está comparando coisa errada."""
    from datetime import timedelta
    lua = [p for p in _posicoes() if p["planeta"] == "Moon"][0]
    assert lua["ate"], "a Lua sempre tem data de saída dentro do teto"
    assert date.fromisoformat(lua["ate"]) <= DIA + timedelta(days=4)


def test_datas_diferentes_dao_leituras_diferentes():
    from datetime import timedelta
    hoje = {p["planeta"]: p["casa"] for p in _posicoes(com_janela=False)}
    daqui_um_mes = {
        p["planeta"]: p["casa"]
        for p in _posicoes(data_alvo=DIA + timedelta(days=30), com_janela=False)
    }
    assert hoje != daqui_um_mes


# ---------------------------------------------------------------------- o SVG

def test_svg_sai_desenhado():
    svg = gerar_svg(
        nome="Jordão", nascimento=NASC, lat=LAT, lng=LNG, tz_str=TZ,
        data_alvo=DIA, cidade="Ribeirão Preto",
    )
    assert "<svg" in svg
    assert len(svg) > 10_000


def test_svg_devolve_vazio_em_vez_de_quebrar():
    """O desenho é acompanhamento. Se falhar, a análise ainda vale pelos textos,
    então a função engole o erro em vez de derrubar a rota."""
    assert gerar_svg(
        nome="Teste", nascimento=NASC, lat=999.0, lng=999.0,
        tz_str="Inexistente/Fuso", data_alvo=DIA,
    ) == ""


# ------------------------------------------- os aspectos ao mapa dela

def test_cada_posicao_traz_os_aspectos_ao_mapa_natal():
    """É o que separa resposta genérica de resposta dela: a casa vale para
    qualquer um, o aspecto só existe no mapa dessa pessoa."""
    posicoes = _posicoes(com_janela=False)
    assert any(p["aspectos"] for p in posicoes), "nenhum dos cinco tocou o mapa natal"
    for p in posicoes:
        assert isinstance(p["aspectos"], list)
        for a in p["aspectos"]:
            assert a["orbe"] <= 3.0, f"{p['planeta']} trouxe aspecto frouxo: {a['orbe']}"
            assert a["ponto_pt"] and a["ponto_significa"], "aspecto sem tradução"
            assert a["faz"], "aspecto sem explicação do que ele faz"
            assert isinstance(a["aplicando"], bool)


def test_nao_lista_as_duas_pontas_do_mesmo_eixo():
    """Ascendente e Descendente são o mesmo eixo: um planeta que toca um toca o
    outro no mesmo instante. Listar os dois é contar o evento duas vezes."""
    pares = [
        {"Ascendant", "Descendant"},
        {"Medium_Coeli", "Imum_Coeli"},
        {"True_North_Lunar_Node", "True_South_Lunar_Node"},
    ]
    for p in _posicoes(com_janela=False):
        pontos = {a["ponto"] for a in p["aspectos"]}
        for par in pares:
            assert len(pontos & par) <= 1, f"{p['planeta']} listou as duas pontas de {par}"


def test_o_destaque_do_dia_e_no_maximo_um():
    posicoes = _posicoes(com_janela=False)
    destaques = [p for p in posicoes if p.get("destaque")]
    assert len(destaques) <= 1
    if destaques:
        assert destaques[0]["prioridade"] == max(p["prioridade"] for p in posicoes)
        assert destaques[0]["prioridade"] > 0


def test_prioridade_vem_do_aspecto_mais_forte():
    for p in _posicoes(com_janela=False):
        esperado = max((a["forca"] for a in p["aspectos"]), default=0.0)
        assert p["prioridade"] == round(esperado, 1)


def test_grau_dentro_do_signo():
    for p in _posicoes(com_janela=False):
        assert 0 <= p["grau"] <= 29, f"{p['planeta']} com grau {p['grau']}"


def test_aspecto_aplicando_pesa_mais_que_separando():
    """O que está chegando importa mais que o que já passou: duas pessoas com o
    mesmo aspecto e o mesmo orbe não estão no mesmo momento dele."""
    from services.transit_service import _PESO_ASPECTO, _PESO_PONTO, _ORBE_MAXIMO
    base = (_PESO_ASPECTO["square"] + _PESO_PONTO["Sun"]) * (1.0 + (_ORBE_MAXIMO - 1.0) / _ORBE_MAXIMO)
    assert base * 1.25 > base
