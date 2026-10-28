# Regras de Negócio — SuporteRemoto

## 1. Ciclo de Vida do Chamado e Transições de Status
- **`NEW`**: Chamado criado pelo cliente ou triagem inicial.
- **`TRIAGE`**: Chamado sendo avaliado para atribuição ou orçamento.
- **`WAITING_CUSTOMER`**: Aguardando resposta ou dados adicionais do cliente.
- **`WAITING_APPROVAL`**: Orçamento gerado, aguardando aprovação financeira.
- **`READY_TO_SCHEDULE` / `SCHEDULED`**: Atendimento com data/hora confirmada.
- **`IN_PROGRESS`**: Técnico conectado remotamente via AnyDesk com sessão ativa.
- **`RESOLVED`**: Serviço técnico concluído com sucesso.
- **`CLOSED`**: Chamado conferido e encerrado.
- **`CANCELLED`**: Cancelado por solicitação justificada.

## 2. Segregação de Mensagens e Notas Internas
- O campo `is_internal` marca mensagens confidenciais da equipe técnica.
- Ao requisitar mensagens (`GET /api/v1/tickets/{id}/messages`), se o usuário autenticado possuir o papel `CUSTOMER`, a consulta executa `findByTicketIdAndInternalFalseOrderByCreatedAtAsc`.
- Notas internas jamais transitam na camada de rede para clientes.

## 3. Cronômetro Persistido de Sessão Remota
- O tempo oficial de atendimento é mantido no backend.
- Uma sessão armazena `started_at`, `paused_at`, `last_resumed_at` e `accumulated_seconds`.
- Recarregar a página, fechar o navegador ou reiniciar a máquina do técnico não perde nem reinicia o tempo trabalhado.
- Ajustes manuais de tempo exigem justificativa e registro auditável.

## 4. Regras Financeiras
- Moeda base: BRL.
- Tipos de dados monetários: `BigDecimal` no Java e `NUMERIC(12,2)` no PostgreSQL.
- O preço praticado em um chamado ou fatura permanece congelado a partir da contratação/orçamento, garantindo que alterações posteriores no catálogo de serviços não modifiquem valores históricos.
