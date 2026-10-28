# Modelo de Dados Relacional — SuporteRemoto

## 1. Diagrama Lógico de Tabelas

```
 companies (1) ────< (N) users (1) ────< (N) tickets
                           │                     │
                           │ (1)                 ├──< (N) ticket_messages
                           ▼                     ├──< (N) ticket_status_history
                    audit_logs                   ├──< (N) remote_sessions
                                                 ├──< (N) appointments
                                                 └──< (N) quotes ──< (N) invoices
```

## 2. Tabelas Principais e Campos Críticos

### `users`
- `id` (BIGSERIAL PRIMARY KEY)
- `company_id` (BIGINT REFERENCES companies)
- `full_name` (VARCHAR(255) NOT NULL)
- `email` (VARCHAR(255) NOT NULL UNIQUE)
- `password_hash` (VARCHAR(255) NOT NULL)
- `role` (VARCHAR(50) NOT NULL: ADMIN, TECHNICIAN, CUSTOMER)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)

### `tickets`
- `id` (BIGSERIAL PRIMARY KEY)
- `code` (VARCHAR(30) UNIQUE: ex: CH-2026-000104)
- `customer_id` (BIGINT REFERENCES users)
- `technician_id` (BIGINT REFERENCES users)
- `service_id` (BIGINT REFERENCES services)
- `title` (VARCHAR(255) NOT NULL)
- `description` (TEXT NOT NULL)
- `status` (VARCHAR(50) NOT NULL)
- `priority` (VARCHAR(50) NOT NULL)
- `remote_access_tool` (VARCHAR(50) DEFAULT 'ANYDESK')
- `remote_access_id` (VARCHAR(100))
- `estimated_price` (NUMERIC(12,2))

### `ticket_messages`
- `id` (BIGSERIAL PRIMARY KEY)
- `ticket_id` (BIGINT REFERENCES tickets ON DELETE CASCADE)
- `author_id` (BIGINT REFERENCES users)
- `message` (TEXT NOT NULL)
- `is_internal` (BOOLEAN NOT NULL DEFAULT FALSE)

### `remote_sessions`
- `id` (BIGSERIAL PRIMARY KEY)
- `ticket_id` (BIGINT REFERENCES tickets)
- `technician_id` (BIGINT REFERENCES users)
- `tool_used` (VARCHAR(50) NOT NULL)
- `started_at` (TIMESTAMPTZ NOT NULL)
- `paused_at` (TIMESTAMPTZ)
- `last_resumed_at` (TIMESTAMPTZ)
- `ended_at` (TIMESTAMPTZ)
- `accumulated_seconds` (BIGINT NOT NULL DEFAULT 0)
- `billable_seconds` (BIGINT NOT NULL DEFAULT 0)
- `customer_consent` (BOOLEAN NOT NULL DEFAULT TRUE)
- `status` (VARCHAR(50) NOT NULL: IN_PROGRESS, PAUSED, COMPLETED, CANCELLED)

## 3. Versionamento Flyway
- `V1__initial_schema.sql`: Definição de tabelas, índices e constraints relacionais.
- `V2__seed_data.sql`: Carga de dados iniciais, categorias de suporte, catálogo de serviços e chamados de demonstração.
