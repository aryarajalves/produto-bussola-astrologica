"""Transitos para uma data escolhida.

O astro_service responde "quem voce e": abre o mapa natal e para ali. Este
modulo responde a outra pergunta, que e o produto da plataforma: "como esta o
seu dia". Recebe uma data qualquer e devolve onde os cinco planetas rapidos
estao passando nas casas natais da pessoa.

Cinco planetas, e nao todos, por decisao do Crassus: Lua, Sol, Mercurio, Venus
e Marte sao os que se movem rapido o bastante para mudar de casa dentro de uma
vida comum. Os lentos ficam anos no mesmo lugar e nao servem para uma leitura
de dia.

A tecnica e a mesma do quiz (bussola-backend/servicos/astro.py), portada para o
padrao deste projeto: house_comparison com os pontos do mapa de transito
projetados nas casas do natal. O point_owner_house_number nao serve, porque e a
casa no mapa do transito, nao no dela.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

import pytz
from kerykeion import AstrologicalSubjectFactory, ChartDataFactory
from kerykeion.charts.chart_drawer import ChartDrawer

logger = logging.getLogger(__name__)

# Os cinco que andam. A ordem e a da leitura: a Lua abre porque e a mais
# rapida e a mais sentida no dia; Marte fecha porque e o que exige acao.
PLANETAS_RAPIDOS = ("Moon", "Sun", "Mercury", "Venus", "Mars")

PLANETA_PT = {
    "Moon": "Lua", "Sun": "Sol", "Mercury": "Mercúrio",
    "Venus": "Vênus", "Mars": "Marte",
}

# atributo do subject para cada ponto, para ler abs_pos e retrogrado
PONTO_ATTR = {
    "Moon": "moon", "Sun": "sun", "Mercury": "mercury",
    "Venus": "venus", "Mars": "mars",
}

CUSPIDE = {
    1: "first_house", 2: "second_house", 3: "third_house", 4: "fourth_house",
    5: "fifth_house", 6: "sixth_house", 7: "seventh_house", 8: "eighth_house",
    9: "ninth_house", 10: "tenth_house", 11: "eleventh_house", 12: "twelfth_house",
}

SIGNO_PT = {
    "Ari": "Áries", "Tau": "Touro", "Gem": "Gêmeos", "Can": "Câncer",
    "Leo": "Leão", "Vir": "Virgem", "Lib": "Libra", "Sco": "Escorpião",
    "Sag": "Sagitário", "Cap": "Capricórnio", "Aqu": "Aquário", "Pis": "Peixes",
}

# Quantos dias cada um leva, em media, para atravessar uma casa inteira. Serve
# so para limitar a busca da janela: a data exata sai do calculo dia a dia.
_DIAS_POR_CASA = {"Moon": 3, "Sun": 35, "Mercury": 40, "Venus": 40, "Mars": 70}

# =============================================================================
# O QUE O TRANSITO TOCA NO MAPA DELA
#
# A casa sozinha e uma resposta generica: "Mercurio na casa 10" vale para
# qualquer pessoa que tenha essa casa ativada hoje. O que torna a leitura DELA
# e o aspecto: "Mercurio em atrito com o teu Venus natal" so acontece no mapa
# dela, porque depende de onde Venus estava quando ela nasceu.
#
# Kerykeion ja calcula esses aspectos entre os dois mapas. Aqui a gente filtra
# os que importam (planeta rapido tocando ponto natal, orbe apertado) e traduz.
# =============================================================================

# Orbe maximo para o aspecto entrar na leitura. Acima disso ainda existe no
# ceu, mas a pessoa nao sente, e encher a tela de aspecto fraco e o jeito mais
# rapido de transformar precisao em ruido.
_ORBE_MAXIMO = 3.0

ASPECTO_PT = {
    "conjunction": "junto de",
    "sextile":     "abrindo porta com",
    "square":      "em atrito com",
    "trine":       "fluindo com",
    "opposition":  "puxando contra",
}

# O que cada aspecto FAZ. Entra na frase, nao e jargao solto.
ASPECTO_ACAO = {
    "conjunction": "funde os dois assuntos: vira o centro do dia",
    "sextile":     "abre uma porta, mas só se você empurrar",
    "square":      "cria atrito, e atrito obriga a decidir",
    "trine":       "corre sem esforço, e por isso passa batido se você não usar",
    "opposition":  "puxa para os dois lados e pede acordo, não vitória",
}

# Textos específicos por planeta em trânsito + aspecto para nunca repetir a mesma frase
# quando dois aspectos do mesmo tipo aparecem no mesmo cartão.
_ACAO_POR_PLANETA_ASPECTO = {
    ("Moon", "conjunction"): "mistura sua emoção de hoje diretamente com esse ponto para você sentir na pele",
    ("Moon", "sextile"): "dá um estalo emocional positivo aqui, mas você precisa agir antes do humor mudar",
    ("Moon", "square"): "cutuca onde dói ou incomoda para você parar de fingir que está tudo bem",
    ("Moon", "trine"): "traz segurança e fluidez emocional, deixando o terreno leve para você avançar",
    ("Moon", "opposition"): "coloca o que você sente de frente com a realidade e pede equilíbrio sem drama",

    ("Sun", "conjunction"): "joga luz total aqui: fica impossível ignorar e vira a prioridade da vez",
    ("Sun", "sextile"): "abre uma brecha clara de oportunidade, mas exige que você dê o primeiro passo",
    ("Sun", "square"): "aperta onde estava acomodado e cobra uma postura firme sua agora",
    ("Sun", "trine"): "destrava o caminho com naturalidade, facilitando seu avanço enquanto a maré está a favor",
    ("Sun", "opposition"): "mostra o outro lado da moeda e exige maturidade para negociar sem medir força",

    ("Mercury", "conjunction"): "liga sua mente no 220v sobre esse tema: ideias, conversas e decisões giram em torno disso",
    ("Mercury", "sextile"): "facilita o papo, destrava argumentos e traz a ideia certa se você puxar a conversa",
    ("Mercury", "square"): "gera ruído ou pressa para decidir: respire antes de falar e revise o combinado",
    ("Mercury", "trine"): "deixa o raciocínio afiado e a comunicação limpa para resolver pendências",
    ("Mercury", "opposition"): "traz um ponto de vista oposto ao seu para testar sua clareza e ajustar a rota",

    ("Venus", "conjunction"): "aumenta seu magnetismo, facilita ganhos e coloca prazer e valor no centro",
    ("Venus", "sextile"): "abre portas pela simpatia e pelo bom trato: peça, negocie ou apresente sua proposta",
    ("Venus", "square"): "testa o quanto você se valoriza de verdade ou se está cedendo demais para agradar",
    ("Venus", "trine"): "faz acordos, dinheiro e relações correrem macio: ótimo momento para colher frutos",
    ("Venus", "opposition"): "mostra onde a balança entre dar e receber está torta e pede um combinado justo",

    ("Mars", "conjunction"): "injeta coragem, pressa e força bruta aqui: use para construir, não para brigar",
    ("Mars", "sextile"): "dá o empurrão de iniciativa que faltava para tirar da gaveta e executar",
    ("Mars", "square"): "cria atrito direto e esquenta o sangue: transforme a irritação em decisão prática",
    ("Mars", "trine"): "entrega energia firme e produtiva para você resolver em horas o que levava semanas",
    ("Mars", "opposition"): "traz confronto ou resistência externa para você defender seu espaço com estratégia",
}

# Complemento por ponto natal para diferenciar ainda mais quando o mesmo planeta faz dois aspectos iguais
_COMPLEMENTO_PONTO = {
    "Sun": "mexendo direto na sua confiança e no seu brilho pessoal",
    "Moon": "tocando o que traz paz ou inquietação para o seu coração",
    "Mercury": "ativando suas ideias, vendas, papéis e o jeito de se explicar",
    "Venus": "influenciando seu bolso, seu valor e suas alianças",
    "Mars": "acionando seu pulso de execução e sua garra no dia a dia",
    "Jupiter": "ampliando sua visão de futuro e vontade de crescer",
    "Saturn": "cobrando estrutura real, responsabilidade e pé no chão",
    "Uranus": "pedindo que você saia do automático e teste um jeito novo",
    "Neptune": "mexendo na sua intuição e exigindo separar sonho de ilusão",
    "Pluto": "indo na raiz do problema para cortar o que não serve mais",
    "Chiron": "transformando uma insegurança antiga na sua maior habilidade",
    "Ascendant": "mudando a postura com que você chega e se posiciona",
    "Medium_Coeli": "impactando sua reputação, entrega profissional e onde você quer chegar",
    "Descendant": "refletindo nos seus clientes, sócios ou parcerias próximas",
    "Imum_Coeli": "mexendo na sua base emocional, casa e segurança íntima",
    "Mean_Lilith": "trazendo à tona desejos e verdades que você engolia calado",
    "True_North_Lunar_Node": "empurrando você na direção do seu próximo nível de vida",
    "True_South_Lunar_Node": "mostrando um hábito antigo que já deu o que tinha que dar",
}

# Peso de cada aspecto na hora de decidir qual dos cinco manda no dia.
_PESO_ASPECTO = {"conjunction": 5, "opposition": 4, "square": 4, "trine": 2, "sextile": 2}

# O que cada ponto natal E para a pessoa. Sem isso o aspecto vira sopa de
# letrinhas; com isso vira frase que ela entende sem saber astrologia.
PONTO_NATAL = {
    "Sun":        ("seu Sol",         "quem você é e de onde vem sua energia"),
    "Moon":       ("sua Lua",         "seu humor e o que te dá segurança"),
    "Mercury":    ("seu Mercúrio",    "sua cabeça e seu jeito de falar"),
    "Venus":      ("sua Vênus",       "o que você gosta e o quanto você se valoriza"),
    "Mars":       ("seu Marte",       "sua força e o jeito que você briga"),
    "Jupiter":    ("seu Júpiter",     "onde você cresce e no que você acredita"),
    "Saturn":     ("seu Saturno",     "sua estrutura, seu limite e sua cobrança"),
    "Uranus":     ("seu Urano",       "o que te tira do lugar de repente"),
    "Neptune":    ("seu Netuno",      "o que te confunde e o que te inspira"),
    "Pluto":      ("seu Plutão",      "o que você não solta de jeito nenhum"),
    "Chiron":     ("seu Quíron",      "sua ferida antiga e o dom que nasceu dela"),
    "Ascendant":  ("seu Ascendente",  "como você se apresenta e o seu corpo"),
    "Medium_Coeli": ("seu Meio do Céu", "sua carreira e o que os outros veem"),
    "Descendant": ("seu Descendente", "o outro: parceria, sociedade, casamento"),
    "Imum_Coeli": ("seu Fundo do Céu", "sua casa, sua família e sua base"),
    "Mean_Lilith": ("sua Lilith",     "o que você reprime e não confessa"),
    "True_North_Lunar_Node": ("seu Nodo Norte", "a direção para onde sua vida empurra"),
    "True_South_Lunar_Node": ("seu Nodo Sul",   "o que já está dominado e vira zona de conforto"),
}

# Peso do ponto tocado. Tocar o Sol ou a Lua dela pesa muito mais que tocar um
# ponto de fundo, e e isso que decide a prioridade do dia.
_PESO_PONTO = {
    "Sun": 5, "Moon": 5, "Ascendant": 5, "Medium_Coeli": 4, "Descendant": 4,
    "Imum_Coeli": 3, "Mercury": 3, "Venus": 3, "Mars": 3,
    "Saturn": 3, "Jupiter": 2, "Pluto": 2, "Uranus": 2, "Neptune": 2,
    "Chiron": 2, "Mean_Lilith": 1,
    "True_North_Lunar_Node": 2, "True_South_Lunar_Node": 1,
}


def _descrever_acao_aspecto(transitando: str, aspecto: str, natal_nome: str, indice: int = 0) -> str:
    """Retorna uma explicação viva e única do contato entre planeta e ponto natal."""
    base = _ACAO_POR_PLANETA_ASPECTO.get((transitando, aspecto)) or ASPECTO_ACAO.get(aspecto, "")
    comp = _COMPLEMENTO_PONTO.get(natal_nome, "")
    if indice > 0 and comp:
        return f"{base}, {comp}"
    return base


def _aspectos_ao_natal(chart, nome_transito: str) -> dict:
    """Agrupa por planeta rapido os aspectos dele ao mapa natal.

    Kerykeion devolve p1 sempre do primeiro subject (o natal) e p2 do segundo
    (o transito), mas a gente confere pelo owner em vez de confiar na ordem.
    """
    fora = {}
    for a in getattr(chart, "aspects", []) or []:
        if a.p1_owner == a.p2_owner:
            continue  # aspecto interno de um mapa so, nao interessa aqui
        if a.p2_owner == nome_transito:
            transitando, natal_nome = a.p2_name, a.p1_name
        else:
            transitando, natal_nome = a.p1_name, a.p2_name
        if transitando not in PLANETAS_RAPIDOS:
            continue
        # So os cinco aspectos maiores. Kerykeion calcula menores tambem
        # (quincuncio, semi-sextil), mas numa leitura de dia eles nao mudam
        # decisao nenhuma e so enchem a tela.
        if a.aspect not in ASPECTO_ACAO:
            continue
        orbe = float(a.orbit)
        if orbe > _ORBE_MAXIMO:
            continue
        if natal_nome not in PONTO_NATAL:
            continue

        aplicando = str(getattr(a, "aspect_movement", "")).lower().startswith("apply")
        rotulo, significa = PONTO_NATAL[natal_nome]
        # Forca: aspecto e ponto pesam, e orbe apertado pesa mais ainda.
        forca = (_PESO_ASPECTO.get(a.aspect, 1) + _PESO_PONTO.get(natal_nome, 1)) * (
            1.0 + (_ORBE_MAXIMO - orbe) / _ORBE_MAXIMO
        )
        if aplicando:
            forca *= 1.25  # o que esta chegando pesa mais que o que ja passou

        fora.setdefault(transitando, []).append({
            "aspecto": a.aspect,
            "aspecto_pt": ASPECTO_PT.get(a.aspect, a.aspect),
            "faz": ASPECTO_ACAO.get(a.aspect, ""),
            "ponto": natal_nome,
            "ponto_pt": rotulo,
            "ponto_significa": significa,
            "orbe": round(orbe, 1),
            "aplicando": aplicando,
            "exato": orbe <= 1.0,
            "forca": round(forca, 1),
        })

    for pl in fora:
        fora[pl] = _colapsa_eixos(fora[pl])
        fora[pl].sort(key=lambda x: -x["forca"])
        vistos_tipo = {}
        for item in fora[pl]:
            asp = item["aspecto"]
            idx = vistos_tipo.get(asp, 0)
            item["faz"] = _descrever_acao_aspecto(pl, asp, item["ponto"], idx)
            vistos_tipo[asp] = idx + 1
    return fora


# Pontos que sao as duas pontas de um mesmo eixo. Um planeta que toca uma ponta
# toca a outra no mesmo instante, entao listar as duas e contar o mesmo evento
# duas vezes. Cada par aparece uma vez so.
_EIXOS = (
    ("Ascendant", "Descendant"),
    ("Medium_Coeli", "Imum_Coeli"),
    ("True_North_Lunar_Node", "True_South_Lunar_Node"),
)


def _colapsa_eixos(aspectos: list) -> list:
    """Deixa so a leitura mais informativa de cada eixo.

    Marte oposto ao Ascendente e Marte junto do Descendente sao a mesma coisa
    dita de dois jeitos. Fica a conjuncao, que diz mais; num empate fica a
    primeira ponta do eixo.
    """
    melhor_do_eixo = {}
    soltos = []
    for a in aspectos:
        eixo = next((e for e in _EIXOS if a["ponto"] in e), None)
        if eixo is None:
            soltos.append(a)
            continue
        atual = melhor_do_eixo.get(eixo)
        if atual is None:
            melhor_do_eixo[eixo] = a
            continue
        novo_peso = _PESO_ASPECTO.get(a["aspecto"], 1)
        peso_atual = _PESO_ASPECTO.get(atual["aspecto"], 1)
        if novo_peso > peso_atual or (novo_peso == peso_atual and a["ponto"] == eixo[0]):
            melhor_do_eixo[eixo] = a
    return soltos + list(melhor_do_eixo.values())


def _grau_e_signo(ponto) -> tuple:
    """Grau dentro do signo (0 a 29) e o signo, para mostrar posicao exata."""
    try:
        return int(float(getattr(ponto, "position", 0))), getattr(ponto, "sign", "")
    except Exception:
        return 0, getattr(ponto, "sign", "")



def _subject_natal(usuario_nome: str, nasc: datetime, lat: float, lng: float,
                   tz_str: str, cidade: str = "", pais: str = "BR"):
    return AstrologicalSubjectFactory.from_birth_data(
        name=usuario_nome or "Cliente",
        year=nasc.year, month=nasc.month, day=nasc.day,
        hour=nasc.hour, minute=nasc.minute,
        lat=lat, lng=lng, tz_str=tz_str,
        city=cidade or "Desconhecida", nation=pais or "BR",
        online=False, zodiac_type="Tropical", houses_system_identifier="P",
    )


def _subject_transito(quando: datetime, lat: float, lng: float, tz_str: str):
    """O ceu daquele instante, no lugar onde a pessoa nasceu.

    O local do transito e o do nascimento de proposito: as casas sao as dela, e
    e nelas que os planetas de hoje estao pisando.
    """
    return AstrologicalSubjectFactory.from_birth_data(
        name="Transito",
        year=quando.year, month=quando.month, day=quando.day,
        hour=quando.hour, minute=quando.minute,
        lat=lat, lng=lng, tz_str=tz_str,
        city="Transito", nation="BR",
        online=False, zodiac_type="Tropical", houses_system_identifier="P",
    )


def _cuspides(natal) -> dict:
    fora = {}
    for n, attr in CUSPIDE.items():
        c = getattr(natal, attr, None)
        pos = getattr(c, "abs_pos", None) if c is not None else None
        if pos is not None:
            fora[n] = float(pos)
    return fora


def _casas_dos_rapidos(natal, transito) -> dict:
    """Em que casa natal cada um dos cinco esta pisando."""
    return _casas_do_chart(ChartDataFactory.create_transit_chart_data(natal, transito))


def _casas_do_chart(chart) -> dict:
    """A mesma leitura, a partir de um chart ja montado.

    second_points_in_first_houses projeta os pontos do SEGUNDO subject (o
    transito) nas casas do PRIMEIRO (o natal), que e exatamente a pergunta.
    Separado de _casas_dos_rapidos para o calculo principal nao montar o chart
    duas vezes: ele ja precisa do chart inteiro por causa dos aspectos.
    """
    hc = getattr(chart, "house_comparison", None)
    if not hc:
        logger.warning("house_comparison ausente: Kerykeion mudou a API?")
        return {}

    fora = {}
    for p in getattr(hc, "second_points_in_first_houses", []) or []:
        if p.point_name in PLANETAS_RAPIDOS:
            fora[p.point_name] = int(p.projected_house_number)
    return fora


def _casa_em(nome_planeta: str, quando: datetime, natal, lat, lng, tz_str) -> Optional[int]:
    t = _subject_transito(quando, lat, lng, tz_str)
    return _casas_dos_rapidos(natal, t).get(nome_planeta)


def _janela(nome_planeta: str, quando: datetime, casa_hoje: int,
            natal, lat, lng, tz_str) -> Optional[date]:
    """Ate que dia este planeta continua nesta casa.

    Busca dia a dia ate o limite do planeta. E caro para a Lua (3 dias) e
    barato para Marte, entao o teto vem de _DIAS_POR_CASA. Devolve None quando
    nao encontra saida dentro do teto, e a tela escreve "segue por mais tempo".
    """
    teto = _DIAS_POR_CASA.get(nome_planeta, 45)
    for n in range(1, teto + 2):
        d = quando + timedelta(days=n)
        casa = _casa_em(nome_planeta, d, natal, lat, lng, tz_str)
        if casa is not None and casa != casa_hoje:
            return (d - timedelta(days=1)).date()
    return None


def calcular_transitos(
    nome: str,
    nascimento: datetime,
    lat: float,
    lng: float,
    tz_str: str,
    data_alvo: date,
    cidade: str = "",
    pais: str = "BR",
    com_janela: bool = True,
) -> dict:
    """As cinco posicoes do dia escolhido, prontas para a IA e para a tela.

    data_alvo e o dia que a pessoa escolheu no calendario. A hora e fixada ao
    meio-dia local: a Lua anda meio grau por hora e o meio-dia e o ponto que
    melhor representa o dia inteiro.

    com_janela=False pula a busca da data de saida. Serve para o lote do
    painel, onde o custo de doze buscas por cliente nao se paga.
    """
    tz = pytz.timezone(tz_str or "America/Sao_Paulo")
    quando = tz.localize(datetime(data_alvo.year, data_alvo.month, data_alvo.day, 12, 0))

    natal = _subject_natal(nome, nascimento, lat, lng, tz_str, cidade, pais)
    transito = _subject_transito(quando, lat, lng, tz_str)

    # Um unico chart serve para as duas coisas: a casa onde cada planeta esta
    # pisando e os aspectos que ele faz ao mapa dela.
    chart = ChartDataFactory.create_transit_chart_data(natal, transito)
    casas = _casas_do_chart(chart)
    aspectos_por_planeta = _aspectos_ao_natal(chart, transito.name)

    posicoes = []
    for pl in PLANETAS_RAPIDOS:
        casa = casas.get(pl)
        if casa is None:
            logger.warning("sem casa para %s em %s", pl, data_alvo)
            continue

        ponto = getattr(transito, PONTO_ATTR[pl], None)
        signo = getattr(ponto, "sign", None) if ponto else None
        retro = bool(getattr(ponto, "retrograde", False)) if ponto else False
        grau, _ = _grau_e_signo(ponto) if ponto else (0, "")

        sai_em = None
        if com_janela:
            try:
                sai_em = _janela(pl, quando, casa, natal, lat, lng, tz_str)
            except Exception as exc:
                logger.warning("janela de %s falhou: %s", pl, exc)

        aspectos = aspectos_por_planeta.get(pl, [])
        # A prioridade do dia sai do aspecto mais forte que o planeta faz. Sem
        # aspecto nenhum ele continua valendo pela casa, mas vale menos.
        prioridade = round(max((a["forca"] for a in aspectos), default=0.0), 1)

        posicoes.append({
            "planeta": pl,
            "planeta_pt": PLANETA_PT[pl],
            "casa": casa,
            "signo": SIGNO_PT.get(signo, signo or ""),
            "grau": grau,
            "retrogrado": retro,
            "ate": sai_em.isoformat() if sai_em else None,
            "aspectos": aspectos,
            "prioridade": prioridade,
        })

    # Marca o planeta que manda no dia: o que tem o aspecto mais forte. Empate
    # ou dia sem aspecto nenhum nao marca ninguem, em vez de inventar destaque.
    if posicoes:
        topo = max(p["prioridade"] for p in posicoes)
        quantos_no_topo = sum(1 for p in posicoes if p["prioridade"] == topo)
        for p in posicoes:
            p["destaque"] = bool(topo > 0 and quantos_no_topo == 1 and p["prioridade"] == topo)

    return {
        "data": data_alvo.isoformat(),
        "posicoes": posicoes,
        "casas_confiaveis": bool(_cuspides(natal)),
    }


def gerar_svg(
    nome: str,
    nascimento: datetime,
    lat: float,
    lng: float,
    tz_str: str,
    data_alvo: date,
    cidade: str = "",
    pais: str = "BR",
) -> str:
    """A roda dupla: o mapa natal por dentro, o ceu do dia por fora.

    Mesmo tema escuro e mesma lingua do mapa natal do astro_service, para a
    plataforma nao ter dois visuais. Devolve "" quando falha: a analise se
    sustenta nos textos, o desenho e o acompanhamento.
    """
    try:
        tz = pytz.timezone(tz_str or "America/Sao_Paulo")
        quando = tz.localize(datetime(data_alvo.year, data_alvo.month, data_alvo.day, 12, 0))
        natal = _subject_natal(nome, nascimento, lat, lng, tz_str, cidade, pais)
        transito = _subject_transito(quando, lat, lng, tz_str)
        dados = ChartDataFactory.create_transit_chart_data(natal, transito)
        return ChartDrawer(chart_data=dados, theme="dark", chart_language="PT").generate_svg_string()
    except Exception as exc:
        logger.warning("SVG de transito falhou para %s em %s: %s", nome, data_alvo, exc)
        return ""


# =============================================================================
# O QUE ESTA EM JOGO AGORA
#
# O ceu nao sabe o que a pessoa esta decidindo. Venus em atrito com o
# Ascendente e o mesmo transito para quem vai pedir demissao e para quem vai
# terminar um namoro: a astrologia e identica, a aplicacao e oposta.
#
# Quando a pessoa diz qual area esta em jogo, a gente nao muda o calculo (isso
# seria inventar ceu). A gente muda a ORDEM: o planeta que esta mexendo
# naquela area sobe, porque e o que responde a pergunta dela.
# =============================================================================

# Cada area aponta para as casas que a tratam. Duas por area: a principal e a
# vizinha que quase sempre entra junto.
AREAS = {
    "carreira":  {"rotulo": "Carreira e trabalho",      "casas": (10, 6)},
    "dinheiro":  {"rotulo": "Dinheiro e valor",         "casas": (2, 8)},
    "relacao":   {"rotulo": "Relação e parceria",       "casas": (7, 5)},
    "familia":   {"rotulo": "Casa e família",           "casas": (4, 12)},
    "corpo":     {"rotulo": "Corpo e rotina",           "casas": (6, 1)},
    "direcao":   {"rotulo": "Direção de vida",          "casas": (9, 11)},
}

# Quanto o planeta que mexe na area escolhida sobe na fila. 1.6 foi escolhido
# para ele passar na frente de um aspecto medio sem atropelar um aspecto exato
# em outra area: se o ceu esta gritando em outro lugar, a pessoa precisa saber.
_IMPULSO_AREA = 1.6
_IMPULSO_VIZINHA = 1.25


def aplicar_contexto(posicoes: list, area: str) -> list:
    """Reordena as posicoes pelo que a pessoa disse estar em jogo.

    Nao altera casa, signo, grau nem aspecto: so a prioridade e o destaque.
    Area desconhecida ou vazia devolve a lista como estava.
    """
    config = AREAS.get((area or "").strip().lower())
    if not config:
        return posicoes

    principal, vizinha = config["casas"]
    for p in posicoes:
        peso = 1.0
        if p.get("casa") == principal:
            peso = _IMPULSO_AREA
        elif p.get("casa") == vizinha:
            peso = _IMPULSO_VIZINHA
        p["responde_a_pergunta"] = peso > 1.0
        # Planeta sem aspecto nenhum tem prioridade zero, e zero vezes qualquer
        # coisa continua zero. Dar um piso garante que ele suba na area certa.
        base = p.get("prioridade", 0.0) or 1.0
        p["prioridade"] = round(base * peso, 1)

    topo = max((p["prioridade"] for p in posicoes), default=0.0)
    no_topo = sum(1 for p in posicoes if p["prioridade"] == topo)
    for p in posicoes:
        p["destaque"] = bool(topo > 0 and no_topo == 1 and p["prioridade"] == topo)
    return posicoes


AREA_CASA_POPULAR = {
    1: "você mesmo, sua postura e iniciativa",
    2: "dinheiro no bolso, cobrança e valor próprio",
    3: "conversas diretas, vendas, propostas e contatos",
    4: "casa, família e base emocional",
    5: "criação, projetos autorais, prazer e exposição",
    6: "rotina de trabalho, método, organização e saúde",
    7: "parcerias, contratos, clientes e sociedade",
    8: "dinheiro compartilhado, acertos profundos e viradas",
    9: "expansão, estudos, visão de longo prazo e viagens",
    10: "carreira, reputação, liderança e metas grandes",
    11: "rede de contatos, grupos, alianças e projetos futuros",
    12: "bastidores, planejamento silencioso e descanso mental",
}


def calcular_movimentos_periodo(
    nome: str,
    nascimento: datetime,
    lat: float,
    lng: float,
    tz_str: str,
    data_inicio: date,
    data_fim: date,
    cidade: str = "",
    pais: str = "BR",
) -> list[dict]:
    """Mapeia as viradas e picos que acontecem dentro de um período [data_inicio, data_fim].

    Identifica:
      1. Quando Sol, Mercúrio, Vênus ou Marte mudam de casa natal durante o período.
      2. Os picos exatos dos aspectos mais fortes ao mapa natal dentro da janela.
    """
    if not data_fim or data_fim <= data_inicio:
        return []

    total_dias = min((data_fim - data_inicio).days, 90)
    passo = 1 if total_dias <= 21 else (2 if total_dias <= 45 else 3)

    tz = pytz.timezone(tz_str or "America/Sao_Paulo")
    natal = _subject_natal(nome, nascimento, lat, lng, tz_str, cidade, pais)

    planetas_monitorados = ("Sun", "Mercury", "Venus", "Mars")
    casas_anteriores: dict[str, int] = {}
    mudancas: list[dict] = []
    melhores_picos: dict[tuple[str, str, str], dict] = {}

    for offset in range(0, total_dias + 1, passo):
        dia_atual = data_inicio + timedelta(days=offset)
        quando = tz.localize(datetime(dia_atual.year, dia_atual.month, dia_atual.day, 12, 0))
        transito = _subject_transito(quando, lat, lng, tz_str)
        chart = ChartDataFactory.create_transit_chart_data(natal, transito)
        casas = _casas_do_chart(chart)
        aspectos_map = _aspectos_ao_natal(chart, transito.name)

        for pl in planetas_monitorados:
            c_atual = casas.get(pl)
            if c_atual is not None:
                c_ant = casas_anteriores.get(pl)
                if c_ant is not None and c_ant != c_atual:
                    area_ant = AREA_CASA_POPULAR.get(c_ant, f"casa {c_ant}")
                    area_nova = AREA_CASA_POPULAR.get(c_atual, f"casa {c_atual}")
                    mudancas.append({
                        "tipo": "mudanca_casa",
                        "data": dia_atual.isoformat(),
                        "planeta": pl,
                        "planeta_pt": PLANETA_PT[pl],
                        "de_casa": c_ant,
                        "para_casa": c_atual,
                        "area_anterior": area_ant,
                        "area_nova": area_nova,
                        "titulo": f"{PLANETA_PT[pl]} passa a movimentar {area_nova}",
                        "descricao": (
                            f"A partir de {dia_atual.strftime('%d/%m')}, {PLANETA_PT[pl]} troca de terreno: "
                            f"sai de {area_ant} e vira o foco principal para {area_nova}."
                        ),
                        "forca": 18.0,
                    })
                casas_anteriores[pl] = c_atual

            for asp in aspectos_map.get(pl, []):
                if asp["orbe"] > 1.8:
                    continue
                chave = (pl, asp["aspecto"], asp["ponto"])
                existente = melhores_picos.get(chave)
                if existente is None or asp["orbe"] < existente["orbe"]:
                    melhores_picos[chave] = {
                        "tipo": "pico_aspecto",
                        "data": dia_atual.isoformat(),
                        "planeta": pl,
                        "planeta_pt": PLANETA_PT[pl],
                        "aspecto": asp["aspecto"],
                        "aspecto_pt": asp["aspecto_pt"],
                        "ponto": asp["ponto"],
                        "ponto_pt": asp["ponto_pt"],
                        "ponto_significa": asp["ponto_significa"],
                        "faz": asp["faz"],
                        "orbe": asp["orbe"],
                        "forca": asp["forca"],
                        "titulo": f"Pico de {PLANETA_PT[pl]} {asp['aspecto_pt']} {asp['ponto_pt']}",
                        "descricao": f"{asp['ponto_significa'].capitalize()} — {asp['faz']}.",
                    }

    picos_ordenados = sorted(melhores_picos.values(), key=lambda x: -x["forca"])[:6]
    eventos = mudancas + picos_ordenados
    eventos.sort(key=lambda x: (x["data"], -x.get("forca", 0)))
    return eventos[:8]

