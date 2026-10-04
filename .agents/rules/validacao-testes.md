---
trigger: always_on
---

# Regra de Validação de Testes Unitários e Modos de Execução

## 1. Modos de Execução: Modo Rápido (Padrão) vs Modo Completo

- **Modo Rápido (Foco em Agilidade, Testes Unitários e Reinício de Contêineres):**
  - O foco total é na implementação do código limpo, criação e execução dos **testes unitários** (Frontend Vitest e Backend Pytest) para garantir 100% de ausência de bugs e regressões.
  - **Reinício Obrigatório de Contêineres:** Os contêineres Docker (`bussolaapp_backend` e `bussolaapp_frontend`) **sempre devem ser reiniciados** (`docker restart bussolaapp_backend bussolaapp_frontend`) para garantir que as atualizações surtam efeito imediatamente para o usuário.
  - **Validação de Saúde:** Sempre verificar se as portas retornam HTTP 200 após o reinício.
  - **Dispensado:** Apenas a captura de prints visuais antes/depois (Playwright headless) é dispensada no Modo Rápido para manter a agilidade máxima na resposta.

- **Modo Completo (Apenas quando solicitado explicitamente):**
  - Inclui implementação, testes unitários, reinício completo dos contêineres e prova visual comparativa (prints via Playwright).

## 2. Protocolo de Pergunta ao Usuário
- Sempre que o usuário solicitar uma nova funcionalidade ou alteração e **NÃO** especificar se deseja o Modo Rápido ou Completo, o agente deve **perguntar ao usuário** para que ele possa escolher.
- Se o usuário já tiver especificado o modo na mensagem, o agente segue diretamente sem perguntar.

## 3. Garantia de Testes Unitários (MANDATÓRIO)
- Toda nova funcionalidade deve possuir testes unitários no Frontend (`npm test -- --run`) e/ou Backend (`docker exec backend pytest tests`).
- Se houver atualização em algo existente, os testes unitários correspondentes devem ser atualizados.
- O agente deve sempre rodar os testes e confirmar que passaram 100% sem erros.
