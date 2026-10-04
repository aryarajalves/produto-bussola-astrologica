---
trigger: always_on
---

# Regra de Reinício e Validação de Serviços

1. **Obrigatoriedade de Reinício dos Contêineres no Modo Rápido:**
   - Toda vez que for realizada qualquer alteração ou nova funcionalidade no sistema (seja em arquivos do frontend ou backend), os contêineres Docker (`bussolaapp_backend` e `bussolaapp_frontend`) **DEVEM ser sempre reiniciados** ao finalizar a tarefa.
   - Isso é obrigatório para garantir que todas as novas atualizações, rotas e estilos entrem em vigor imediatamente para o usuário.
   - Comando padrão de reinício:
     ```bash
     docker restart bussolaapp_backend bussolaapp_frontend
     ```

2. **Validação Obrigatória Pós-Reinício:**
   - Após reiniciar os contêineres, o agente deve obrigatoriamente validar que os serviços estão ativos e respondendo com status HTTP 200:
     - Backend: `http://localhost:8005/health`
     - Frontend: `http://localhost:3000/admin/` (ou rota pertinente)
