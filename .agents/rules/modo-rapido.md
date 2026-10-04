---
trigger: always_on
---

# Regra de Escolha de Modo (Modo Rápido vs Modo Completo)

Toda vez que o usuário pedir para criar algo novo ou realizar uma alteração no sistema:

1. **Se o usuário NÃO especificou o modo na mensagem:**
    - O agente DEVE perguntar ao usuário antes ou logo no início da resposta (ou usando a ferramenta interativa `ask_question`), oferecendo as opções:
     - **Modo Rápido (Recomendado):** Foco em implementar a alteração com rapidez, criar/executar os testes unitários (Frontend e Backend) para garantir ausência de bugs e **sempre reiniciar os contêineres do Docker** (`docker restart bussolaapp_backend bussolaapp_frontend`) para garantir que as novas atualizações surtam efeito imediatamente. Apenas sem captura de prints de tela headless (Playwright).
     - **Modo Completo:** Inclui implementação, testes unitários, reinício de contêineres Docker e prova visual comparativa (prints de antes e depois via Playwright).

2. **Se o usuário já especificou o modo (ex: "em modo rápido", "modo rápido", etc.):**
   - Não pergunte novamente. Siga diretamente no Modo Rápido:
     - Implementar o código limpo;
     - Criar/atualizar os testes unitários;
     - Rodar a suíte de testes unitários para comprovar que não há bugs (100% aprovados);
     - **Reiniciar sempre os contêineres Docker** (`docker restart bussolaapp_backend bussolaapp_frontend`) para que as atualizações entrem em vigor;
     - Validar que os serviços estão respondendo com HTTP 200;
     - Responder com agilidade e clareza ao usuário.
