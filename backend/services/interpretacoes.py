"""As 60 interpretações: cinco planetas rápidos por doze casas.

=============================================================================
ATENÇÃO, CRASSUS: ESTE ARQUIVO É UM RASCUNHO E PRECISA DA SUA REVISÃO.
=============================================================================

O texto abaixo foi composto a partir do vocabulário que já usamos no quiz
(CASA_VIDA e PLANETA_VIDA), no registro que afinamos lá: popular, direto,
prático, sem misticismo passivo e sem promessa de resultado.

O que cada texto precisa fazer, e só isso:
  - dizer a ÁREA DA VIDA que acendeu (vem da casa)
  - dizer O QUE ESSE PLANETA FAZ ali (vem do planeta), com profundidade real
  - terminar em algo que a pessoa possa FAZER ou PARAR DE FAZER

O que nenhum deles pode fazer:
  - prometer resultado ("vai dar certo", "o dinheiro chega")
  - prever evento fechado ("você vai conhecer alguém")
  - citar planeta, casa, signo ou qualquer termo técnico
  - soar como horóscopo de revista
"""
from __future__ import annotations

# O que cada planeta FAZ onde passa. Entra na síntese, não no texto da pessoa.
PLANETA_ACAO = {
    "Sun":     "põe holofote: o assunto da vez, onde a atenção vai sozinha",
    "Moon":    "mexe no humor: o que você sente antes de pensar",
    "Mercury": "movimenta a cabeça: conversa, combinado, papel, decisão",
    "Venus":   "facilita e atrai: o que flui com menos atrito",
    "Mars":    "dá força e pressa: onde a energia vai e onde ela briga",
}

# chave (planeta, casa) -> texto que a pessoa lê
PLANETA_CASA: dict[tuple[str, int], str] = {

    # ---------------------------------------------------------------- SOL
    ("Sun", 1): (
        "O holofote está inteiro em você, na sua postura e no seu poder de decisão pessoal. "
        "É o momento de dar a cara a tapa, assumir a frente das suas escolhas e parar de pedir permissão para agir. "
        "Comece hoje mesmo por aquela decisão que depende exclusivamente da sua vontade e que você vinha adiando."
    ),
    ("Sun", 2): (
        "A atenção vai direto para o seu bolso, sua estrutura financeira e o quanto você valoriza a própria entrega. "
        "É hora de olhar para a planilha sem medo, cortar ralos de dinheiro e reajustar o que está barato demais. "
        "Revise seus preços ou suas despesas fixas hoje e pare de cobrar o valor de dois anos atrás."
    ),
    ("Sun", 3): (
        "O jogo acontece nas conversas diretas, propostas comerciais, mensagens e combinados rápidos do dia a dia. "
        "Ideias engavetadas perdem força se não forem ditas com clareza para as pessoas certas ao seu redor. "
        "Mande agora aquela mensagem importante ou proposta que ficou parada no rascunho em vez de ensaiar mais uma vez."
    ),
    ("Sun", 4): (
        "A luz se volta para a sua base: casa, família, patrimônio e o que sustenta a sua paz quando fecha a porta. "
        "Se o alicerce doméstico está bagunçado, o resto da vida perde tração sem você perceber o motivo. "
        "Resolva uma pendência prática dentro de casa ou tenha aquela conversa franca com quem divide o teto com você."
    ),
    ("Sun", 5): (
        "Acende a sua capacidade de criar, colocar a sua marca no mundo e ter gosto pelo que está construindo. "
        "Projetos autorais, ideias originais e até a vida afetiva ganham fôlego quando você para de se esconder. "
        "Tire da gaveta algo que você criou e coloque na rua hoje, mesmo que ainda não pareça cem por cento perfeito."
    ),
    ("Sun", 6): (
        "A rotina de trabalho, a organização diária e o cuidado com o corpo entram no centro do palco agora. "
        "Não é hora de inventar planos mirabolantes, mas de consertar a engrenagem prática que trava a sua produtividade. "
        "Ajuste seus horários, elimine uma tarefa inútil da agenda e marque o cuidado de saúde que você vem empurrando."
    ),
    ("Sun", 7): (
        "O foco vai para quem caminha ao seu lado: sócios, clientes, contratos e a pessoa que divide a vida com você. "
        "Acordos subentendidos costumam gerar desgaste quando ninguém coloca as cartas na mesa com maturidade. "
        "Chame a pessoa envolvida para alinhar expectativas às claras, sem ficar tentando adivinhar a reação dela antes."
    ),
    ("Sun", 8): (
        "Ilumina o que fica debaixo do tapete: dinheiro compartilhado, dívidas, impostos, comissões e cortes necessários. "
        "Fugir de conversas espinhosas sobre valores ou limites só faz o problema crescer no escuro com juros. "
        "Encare de frente o acerto financeiro ou emocional mais difícil da semana e feche esse ralo de uma vez."
    ),
    ("Sun", 9): (
        "A visão se abre para horizontes maiores: novos mercados, especialização, viagens e direção de longo prazo. "
        "Quando você olha apenas para o incêndio de hoje, perde a chance de construir o salto dos próximos meses. "
        "Escolha um único conhecimento estratégico ou plano de expansão e dedique uma hora inteira a ele hoje."
    ),
    ("Sun", 10): (
        "O holofote está na sua carreira, na sua reputação profissional e nos resultados concretos que todo mundo vê. "
        "Sua entrega ganha visibilidade máxima e quem decide está prestando atenção em como você conduz o barco. "
        "Posicione-se como autoridade, apresente seu trabalho mais forte e peça com clareza o espaço ou valor que merece."
    ),
    ("Sun", 11): (
        "A força está nas alianças, grupos, comunidade e nas pessoas que compartilham objetivos parecidos com os seus. "
        "Tentar resolver tudo no braço e sozinho agora limita o alcance do que você pode construir em conjunto. "
        "Acione sua rede de contatos, proponha uma parceria estratégica e peça aquela indicação que abre portas."
    ),
    ("Sun", 12): (
        "O movimento mais inteligente acontece nos bastidores, longe do barulho e da pressa de mostrar resultado imediato. "
        "É tempo de fechar pontas soltas em silêncio, descansar a mente e preparar o terreno antes do próximo passo. "
        "Desmarque um compromisso desnecessário, proteja sua energia e planeje sua próxima jogada sem contar para ninguém."
    ),

    # ---------------------------------------------------------------- LUA
    ("Moon", 1): (
        "O humor está à flor da pele e suas reações saem no automático antes mesmo de você filtrar o pensamento. "
        "Suas vontades e incômodos reais aparecem sem máscara, mostrando exatamente onde o sapato está apertando. "
        "Perceba o que está incomodando de verdade hoje, mas espere a poeira baixar antes de tomar uma atitude definitiva."
    ),
    ("Moon", 2): (
        "Sua sensação de segurança fica colada na conta bancária e no retorno material do seu esforço diário. "
        "Bate aquela oscilação entre querer economizar cada centavo ou gastar por impulso só para aliviar a tensão. "
        "Segure o cartão hoje para compras por ansiedade e anote com calma onde o orçamento precisa de ajuste."
    ),
    ("Moon", 3): (
        "Você absorve o tom das conversas, mensagens e comentários ao redor com muito mais intensidade que o normal. "
        "É fácil interpretar silêncio ou resposta curta como descaso quando a cabeça está acelerada demais. "
        "Pergunte diretamente o que a pessoa quis dizer antes de criar uma história inteira na cabeça e responder atravessado."
    ),
    ("Moon", 4): (
        "O coração puxa para dentro de casa, para as raízes familiares e para o ambiente onde você se sente seguro. "
        "Forçar um ritmo pesado na rua quando o emocional pede abrigo só gera cansaço dobrado e irritação. "
        "Respeite seu limite hoje, organize seu canto e dê atenção para quem é a sua base de verdade."
    ),
    ("Moon", 5): (
        "O estado de espírito pede prazer genuíno, expressão criativa e espaço para fazer algo que não seja só obrigação. "
        "Quando a rotina vira apenas boleto e cobrança, a criatividade seca e até o trabalho perde o brilho. "
        "Coloque sua personalidade no que estiver criando hoje e reserve tempo para o que faz você se sentir vivo."
    ),
    ("Moon", 6): (
        "O corpo funciona como termômetro imediato das suas emoções: tensão, sono picado ou cansaço avisam o excesso. "
        "Bagunça na mesa de trabalho ou lista de tarefas infinita pesa o dobro no seu humor neste momento. "
        "Simplifique sua lista do dia para apenas três prioridades reais e cuide da sua alimentação e descanso hoje."
    ),
    ("Moon", 7): (
        "Você sente muito mais o clima de quem está do outro lado, seja no relacionamento, na sociedade ou no atendimento. "
        "Existe a tentação de ceder demais para evitar cara feia ou de cobrar que o outro adivinhe o que você precisa. "
        "Ouça com atenção o que seu parceiro ou cliente está trazendo, mas diga com calma o que funciona para você."
    ),
    ("Moon", 8): (
        "Assuntos guardados no fundo do peito, medos financeiros ou desconfianças antigas sobem para a superfície. "
        "A intuição fica afiada para perceber o que não está sendo dito nas entrelinhas de um acordo ou relação. "
        "Observe os sinais em silêncio, anote o que veio à tona e evite entrar em cabo de guerra emocional hoje."
    ),
    ("Moon", 9): (
        "Bate uma inquietação forte com a mesmice e uma vontade de respirar novos ares, aprender ou mudar a rota. "
        "O segredo é diferenciar a vontade legítima de crescer da simples vontade de fugir de um problema chato. "
        "Alimente sua mente com uma referência nova ou planeje seu próximo passo sem abandonar o que precisa entregar hoje."
    ),
    ("Moon", 10): (
        "Sua sensibilidade fica ligada diretamente à imagem profissional, aos resultados e ao reconhecimento do seu trabalho. "
        "Qualquer crítica parece maior do que é, mas sua percepção do que o público ou cliente quer está certeira. "
        "Use essa leitura fina para melhorar sua entrega profissional e separe o seu valor pessoal de um tropeço pontual."
    ),
    ("Moon", 11): (
        "O humor oscila entre querer estar no meio da galera trocando ideias ou querer desligar o celular e sumir do grupo. "
        "A convivência mostra quem realmente soma nos seus planos futuros e quem só drena o seu tempo com conversa fiada. "
        "Aproxime-se de quem puxa você para cima e filtre os grupos que só trazem barulho para a sua cabeça."
    ),
    ("Moon", 12): (
        "O emocional pede pausa, silêncio e um tempo sem precisar dar satisfação ou sustentar personagem para ninguém. "
        "Insistir em reuniões longas ou ambientes carregados hoje consome uma bateria que faz falta no resto da semana. "
        "Reduza o ritmo no fim do dia, fique um pouco no seu canto e deixe a cabeça decantar antes de decidir qualquer coisa."
    ),

    # ------------------------------------------------------------ MERCÚRIO
    ("Mercury", 1): (
        "Sua mente está rápida, cheia de iniciativa e pronta para defender seus pontos de vista com firmeza. "
        "É o momento ideal para atualizar a forma como você apresenta seu trabalho, seu discurso e suas ideias. "
        "Escreva e fale em primeira pessoa com clareza, sem esperar que os outros traduzam o valor do que você faz."
    ),
    ("Mercury", 2): (
        "O raciocínio vira uma calculadora prática voltada para negócios, margem de lucro, vendas e organização financeira. "
        "Ideias para rentabilizar melhor o que você já sabe fazer surgem com facilidade se você olhar para os números. "
        "Coloque no papel uma estratégia nova de venda ou cobrança e feche os combinados comerciais por escrito hoje."
    ),
    ("Mercury", 3): (
        "O fluxo mental acelera no máximo: telefonemas, mensagens, reuniões curtas, textos e negociações rápidas. "
        "O perigo é abrir vinte conversas ao mesmo tempo e não concluir nenhuma por excesso de estímulo. "
        "Faça uma limpa nas pendências de comunicação e resolva hoje os três contatos que trazem resultado direto."
    ),
    ("Mercury", 4): (
        "Os pensamentos voltam para questões de casa, documentos de família, imóvel ou organização do ambiente pessoal. "
        "Conversas com parentes ou decisões sobre a estrutura doméstica fluem com mais objetividade e menos nostalgia. "
        "Coloque ordem na papelada ou nas contas da casa e defina o combinado prático com quem mora com você."
    ),
    ("Mercury", 5): (
        "A inteligência fica criativa, persuasiva e excelente para criar ofertas, roteiros, aulas ou apresentações envolventes. "
        "Você encontra o jeito certo de falar para prender a atenção das pessoas e vender sua ideia sem parecer forçado. "
        "Escreva aquele texto, grave aquele conteúdo ou desenhe a estrutura criativa do projeto que estava na cabeça."
    ),
    ("Mercury", 6): (
        "A cabeça funciona no modo cirúrgico para analisar processos, corrigir falhas operacionais e organizar o trabalho. "
        "Pequenos gargalos que roubam horas da sua semana ficam visíveis na hora se você parar para observar o fluxo. "
        "Padronize uma etapa repetitiva do seu trabalho hoje e corte a bagunça que atrasa a sua entrega."
    ),
    ("Mercury", 7): (
        "O foco do pensamento vai para negociações, contratos, atendimento a clientes e alinhamento com parceiros. "
        "Bons acordos nascem agora porque fica mais simples enxergar o argumento do outro e construir um meio-termo inteligente. "
        "Puxe aquela conversa de alinhamento ou revisão de proposta e deixe cada cláusula clara preto no branco."
    ),
    ("Mercury", 8): (
        "A mente fica investigativa e vai direto no ponto cego: taxas, cláusulas escondidas, objeções reais e verdade nua. "
        "Nada de conversa rasa funciona agora; você enxerga o motivo real por trás do comportamento das pessoas. "
        "Analise a fundo os números de uma parceria ou dívida e faça a pergunta direta que ninguém teve coragem de fazer."
    ),
    ("Mercury", 9): (
        "O pensamento ganha visão panorâmica para planejar próximos passos, estudar algo avançado ou expandir o negócio. "
        "Cuidado apenas para não se perder em teorias infinitas e esquecer de transformar o aprendizado em prática. "
        "Aplique hoje mesmo uma ideia que você estudou recentemente num teste real dentro do seu trabalho."
    ),
    ("Mercury", 10): (
        "A mente está focada em estratégia de carreira, posicionamento no mercado, metas grandes e conversas com quem decide. "
        "O que você diz ou publica agora tem peso profissional dobrado e constrói autoridade diante do público. "
        "Apresente seu plano de trabalho, envie aquela proposta comercial de maior valor ou alinhe metas com clareza."
    ),
    ("Mercury", 11): (
        "As melhores ideias nascem da troca com outras cabeças, grupos profissionais, amigos e parcerias de rede. "
        "Um contato acionado na hora certa encurta em semanas um caminho que você levaria meses tentando desvendar sozinho. "
        "Converse com alguém da sua área, compartilhe um plano para ouvir opiniões francas e reative contatos estratégicos."
    ),
    ("Mercury", 12): (
        "O raciocínio trabalha melhor em silêncio, juntando peças nos bastidores onde ninguém está interrompendo. "
        "Forçar respostas rápidas no meio da confusão faz você esquecer detalhes que já sabia de cor. "
        "Tire meia hora com o celular no silencioso para colocar as ideias no papel antes de tomar qualquer decisão."
    ),

    # ---------------------------------------------------------------- VÊNUS
    ("Venus", 1): (
        "Sua presença fica magnética, simpática e as portas se abrem com muito menos esforço na conversa pessoal. "
        "As pessoas recebem melhor a sua imagem, o seu trabalho e os seus pedidos quando você aparece de verdade. "
        "Cuide da sua apresentação, mostre a cara e aproveite a boa recepção para fazer um convite ou proposta."
    ),
    ("Venus", 2): (
        "Momento favorável para movimentar dinheiro, fechar vendas, valorizar seu passe e atrair oportunidades materiais. "
        "O outro lado da moeda é a vontade de se recompensar gastando sem fazer conta porque o clima está confiante. "
        "Faça uma oferta comercial, cobre pelo seu trabalho com segurança e evite compras por puro impulso hoje."
    ),
    ("Venus", 3): (
        "A diplomacia entra na ponta da língua: fica fácil destravar conversas delicadas, convencer clientes e fazer bons acordos. "
        "Uma palavra bem colocada hoje desarma resistências que a força bruta jamais conseguiria vencer. "
        "Retome contato com um cliente, parceiro ou pessoa próxima usando um tom leve e proponha um bom negócio."
    ),
    ("Venus", 4): (
        "O clima dentro de casa e na família suaviza, trazendo vontade de deixar seu espaço mais bonito e confortável. "
        "Atritos antigos com pessoas de casa encontram terreno fértil para trégua se você baixar a guarda primeiro. "
        "Melhore o ambiente onde você trabalha ou descansa em casa e faça um gesto simples de paz com a família."
    ),
    ("Venus", 5): (
        "Criatividade, carisma e prazer estão em alta: tudo o que leva sua assinatura pessoal ganha brilho e atrai olhares. "
        "No trabalho criativo ou na vida afetiva, a espontaneidade conquista muito mais do que qualquer roteiro engessado. "
        "Mostre seu talento sem timidez, lance uma ideia autoral na rua ou reserve a noite para curtir sem culpa."
    ),
    ("Venus", 6): (
        "O ambiente de trabalho e a rotina diária pedem mais harmonia, organização agradável e menos correria cega. "
        "Tratar bem a equipe, os fornecedores e o próprio corpo faz o dia render o dobro sem pesar nos ombros. "
        "Melhore um detalhe do seu espaço de trabalho hoje e escolha um hábito saudável que você consiga manter com gosto."
    ),
    ("Venus", 7): (
        "Excelente janela para parcerias, fechamento de contratos, conciliação e fortalecimento de vínculos importantes. "
        "Quem está do outro lado fica mais aberto a ouvir, colaborar e encontrar um caminho onde os dois ganham. "
        "Agende aquela reunião com sócio, cliente ou par afetivo para selar um acordo bom para os dois lados."
    ),
    ("Venus", 8): (
        "Facilita negociações financeiras complexas, parcelamentos, comissões, sociedades e conversas profundas de confiança. "
        "Onde havia tensão por causa de dinheiro compartilhado ou intimidade, surge espaço para renegociar sem briga. "
        "Proponha um novo formato de divisão ou pagamento que destrave o acordo sem você abrir mão do que é justo."
    ),
    ("Venus", 9): (
        "Atrai boas conexões com pessoas de fora, novos aprendizados, viagens e oportunidades que ampliam seu mercado. "
        "Você sente prazer em enxergar mais longe e sair da caixinha estreita dos problemas repetitivos da semana. "
        "Converse com alguém mais experiente, explore um novo canal de divulgação ou invista em algo que expanda sua visão."
    ),
    ("Venus", 10): (
        "Sua reputação profissional ganha brilho, simpatia e portas abertas diante de clientes, chefes e do mercado. "
        "Elogios, indicações e boas oportunidades de negócio surgem com mais facilidade quando seu trabalho está visível. "
        "Mostre seus melhores resultados em público hoje e peça aquela recomendação ou reunião estratégica."
    ),
    ("Venus", 11): (
        "Amizades, eventos, grupos e redes de contato trazem boas notícias, apoio e conexões que valem ouro. "
        "A solução para o que você quer construir agora provavelmente passa por alguém que você já conhece. "
        "Participe da roda, mande mensagem para um parceiro querido e movimente sua rede com generosidade."
    ),
    ("Venus", 12): (
        "O bem-estar verdadeiro vem do sossego, dos bastidores e de cuidar de si longe da vitrine e das cobranças. "
        "Gestos discretos e preparativos feitos em silêncio rendem frutos melhores do que fazer alarde antes da hora. "
        "Guarde seus melhores planos para amadurecer no privado e tire um momento de descanso real hoje."
    ),

    # ---------------------------------------------------------------- MARTE
    ("Mars", 1): (
        "Uma carga forte de iniciativa, coragem e pressa corre nas veias: você quer ver as coisas andando agora. "
        "Se essa energia toda não tiver um alvo produtivo claro, ela vira impaciência e resposta atravessada. "
        "Ataque de frente a tarefa mais pesada da sua lista hoje e gaste essa força construindo, não discutindo."
    ),
    ("Mars", 2): (
        "Aciona a garra para fazer dinheiro, defender sua margem, bater meta e parar de trabalhar de graça. "
        "Ao mesmo tempo, aumenta o risco de gastar no calor do momento ou brigar feio por causa de valores. "
        "Direcione essa ambição para fechar vendas ou cobrar o que é seu, mantendo o controle frio sobre os gastos."
    ),
    ("Mars", 3): (
        "A comunicação fica direta, rápida e sem filtro: você fala na lata o que pensa e não tem paciência para enrolação. "
        "Ótimo para destravar negociações lentas e cobrar respostas, perigoso para responder mensagem de cabeça quente. "
        "Use a firmeza para resolver pendências práticas hoje, mas releia duas vezes antes de apertar enviar."
    ),
    ("Mars", 4): (
        "Movimenta a energia dentro de casa: vontade de reformar, arrumar, mudar móveis ou resolver atrito familiar antigo. "
        "Ficar trancado ruminando irritação doméstica transforma qualquer detalhe pequeno em discussão desnecessária. "
        "Canalize a força para resolver um conserto ou mudança física na casa e escolha a hora fria para conversar."
    ),
    ("Mars", 5): (
        "Dá ousadia criativa, espírito competitivo e vontade de assumir riscos calculados nos seus projetos autorais. "
        "Você não quer fazer mais do mesmo; quer colocar energia e paixão naquilo que leva o seu nome. "
        "Lance aquela ideia corajosa, lidere a frente criativa do seu trabalho e não espere unanimidade para agir."
    ),
    ("Mars", 6): (
        "A capacidade de execução no trabalho vai lá no teto: dia de limpar a mesa e resolver o que estava acumulado. "
        "O ponto de atenção é exigir que todo mundo acompanhe a sua velocidade e acabar estourando o próprio corpo. "
        "Mergulhe na execução das entregas mais importantes do dia e descarregue a tensão restante em movimento físico."
    ),
    ("Mars", 7): (
        "Coloca energia — e às vezes faísca — nas parcerias, sociedades, casamentos e negociações com clientes. "
        "Assuntos que você vinha engolindo em seco pedem definição clara de limites para a relação continuar saudável. "
        "Troque o confronto pelo posicionamento firme: diga o que espera do acordo sem transformar o parceiro em inimigo."
    ),
    ("Mars", 8): (
        "Traz coragem cirúrgica para cortar gastos inúteis, encerrar ciclos que drenam energia e renegociar dívidas. "
        "É força de transformação profunda para mexer exatamente naquilo que dava medo ou preguiça de encarar. "
        "Corte hoje uma despesa, ferramenta ou compromisso que não dá retorno e limpe o terreno para o novo."
    ),
    ("Mars", 9): (
        "Dá combustível para defender suas ideias, desbravar novos mercados, estudar com afinco e bancar sua visão. "
        "A armadilha é achar que só o seu jeito está certo e gastar saliva tentando converter quem pensa diferente. "
        "Coloque sua energia em expandir o alcance do seu trabalho e deixe que os resultados falem por você."
    ),
    ("Mars", 10): (
        "Ambição profissional e pulso de liderança no volume máximo: hora de buscar conquista, destaque e crescimento real. "
        "Você tem força para assumir responsabilidades maiores e abrir espaço no mercado pela própria competência. "
        "Tome a frente do projeto principal, estabeleça uma meta ousada e dê o passo profissional que exige coragem."
    ),
    ("Mars", 11): (
        "Energia para mobilizar pessoas, liderar projetos em grupo, organizar ações coletivas e abrir frentes futuras. "
        "Cuidado apenas com disputas de ego dentro de equipes ou grupos onde todo mundo quer mandar ao mesmo tempo. "
        "Puxe a responsabilidade de colocar o plano do grupo em movimento e foque na meta compartilhada."
    ),
    ("Mars", 12): (
        "A força age por trás da cortina: excelente para trabalhar focado em silêncio e eliminar sabotagens internas. "
        "Quando você tenta forçar portas que ainda estão amadurecendo, sente um cansaço sem explicação aparente. "
        "Adiante o trabalho pesado nos bastidores hoje e respeite a hora de desligar para recarregar a bateria."
    ),
}


def interpretacao(planeta: str, casa: int) -> str:
    """O texto daquele planeta naquela casa. Vazio quando falta a combinação."""
    return PLANETA_CASA.get((planeta, int(casa)), "")


def faltando() -> list:
    """Quais das 60 combinações ainda não têm texto. Usado pelo teste."""
    fora = []
    for pl in PLANETA_ACAO:
        for casa in range(1, 13):
            if not PLANETA_CASA.get((pl, casa), "").strip():
                fora.append((pl, casa))
    return fora
