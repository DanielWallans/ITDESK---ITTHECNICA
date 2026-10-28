# Documentação de Endpoints da API REST — SuporteRemoto

Prefix: `/api/v1`

## Autenticação (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Autentica com e-mail/senha e retorna token JWT + dados do usuário.
- `POST /api/v1/auth/register`: Cadastro público de novo cliente (criação mandatória de papel `CUSTOMER`).
- `GET /api/v1/auth/me`: Retorna dados do perfil do usuário autenticado no token.

## Catálogo de Serviços (`/api/v1/services`)
- `GET /api/v1/services`: Lista serviços ativos do catálogo com modelo de cobrança e preço de referência.
- `GET /api/v1/services/categories`: Lista categorias de serviços organizadas.
- `GET /api/v1/services/{id}`: Retorna detalhes e instruções ao cliente de um serviço específico.

## Chamados (`/api/v1/tickets`)
- `POST /api/v1/tickets`: Cria novo chamado de suporte com código legível (`CH-2026-000XXX`).
- `GET /api/v1/tickets`: Lista chamados (filtrados automaticamente por cliente ou operação técnica).
- `GET /api/v1/tickets/{id}`: Consulta dados detalhados com validação de permissão.
- `PATCH /api/v1/tickets/{id}/status`: Atualiza estado com validação de transição.
- `GET /api/v1/tickets/{id}/messages`: Lista histórico de mensagens (notas internas ocultas para clientes).
- `POST /api/v1/tickets/{id}/messages`: Adiciona mensagem ou nota interna confidencial.

## Sessões Remotas (`/api/v1/remote-sessions`)
- `POST /api/v1/remote-sessions/start`: Dispara sessão remota vinculada a um chamado e ativa cronômetro.
- `POST /api/v1/remote-sessions/{id}/pause`: Pausa contagem e acumula segundos no banco.
- `POST /api/v1/remote-sessions/{id}/resume`: Retoma atendimento pausado.
- `POST /api/v1/remote-sessions/{id}/end`: Finaliza atendimento, consolida tempo faturável e atualiza chamado.
- `GET /api/v1/remote-sessions/active`: Retorna a sessão remota atualmente ativa.
- `GET /api/v1/remote-sessions/ticket/{ticketId}`: Histórico de sessões do chamado.

## Dashboard (`/api/v1/dashboard`)
- `GET /api/v1/dashboard/summary`: Agregação de métricas reais para exibição no painel administrativo.
