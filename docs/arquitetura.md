# Arquitetura do Sistema — SuporteRemoto

## 1. Visão Geral

O **SuporteRemoto** é estruturado como um **Monólito Modular** focado em facilidade de manutenção, baixo acoplamento entre domínios e alta coesão, permitindo escalabilidade futura para múltiplos técnicos e SaaS corporativo sem a sobrecarga inicial de microsserviços.

```text
suporte-remoto/
├── apps/
│   ├── api/          # Backend Java 21 / Spring Boot 3
│   └── web/          # Frontend React JS (sem TypeScript, JSX, Vite)
├── infra/            # Docker Compose (PostgreSQL 16)
└── docs/             # Documentação técnica e operacional
```

## 2. Módulos de Domínio do Backend

- **`identity`**: Autenticação stateless via JWT, papéis de autorização (`ADMIN`, `TECHNICIAN`, `CUSTOMER`), codificação de senhas com BCrypt e controle de contas.
- **`customer` & `company`**: Entidades e relacionamentos com suporte a múltiplos usuários por empresa.
- **`catalog`**: Gestão de serviços padronizados, categorias, preços de referência e tempos estimados.
- **`ticket`**: Tramitação completa de estados (`NEW`, `TRIAGE`, `IN_PROGRESS`, `WAITING_APPROVAL`, `RESOLVED`, `CLOSED`, etc.), mensagens públicas e notas internas estritamente segregadas.
- **`remote_session`**: Ciclo de vida de conexões AnyDesk, cronômetro persistido no servidor com cálculo preciso de segundos acumulados e faturáveis.
- **`billing`**: Modelos de cobrança (fixo, hora técnica, pacotes de horas), orçamentos e faturas com cálculo em `BigDecimal`.
- **`reporting`**: Agregação de métricas reais para o dashboard.
- **`shared`**: Wrapper padronizado de resposta (`ApiResponse<T>`) e tratamento global de exceções.

## 3. Frontend React

- Desenvolvido em **React puro** utilizando JavaScript/JSX (sem TypeScript), conforme especificado.
- Empacotado com Vite 5 para alta velocidade em desenvolvimento e build de produção enxuto.
- Design System customizado integrado visualmente com o Artboard criado no **Paper MCP**.
- Componentes modulares com sincronização do cronômetro de sessão em tempo real.
