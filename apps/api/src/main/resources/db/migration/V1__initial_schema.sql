-- ============================================================
-- V1__initial_schema.sql: Suporte Remoto Core Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL, -- 'ADMIN', 'TECHNICIAN', 'CUSTOMER'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

CREATE TABLE IF NOT EXISTS service_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES service_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    billing_model VARCHAR(50) NOT NULL, -- 'FIXED', 'HOURLY', 'SUBSCRIPTION'
    reference_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estimated_minutes INT DEFAULT 60,
    instructions_for_customer TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- ex: CH-2026-000101
    customer_id BIGINT NOT NULL REFERENCES users(id),
    technician_id BIGINT REFERENCES users(id),
    service_id BIGINT REFERENCES services(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    remote_access_tool VARCHAR(50), -- ex: 'ANYDESK', 'TEAMVIEWER', 'RUSTDESK'
    remote_access_id VARCHAR(100),  -- ex: 984 291 032 (identificador para conexão)
    estimated_price NUMERIC(12, 2),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Notas internas visíveis apenas por técnicos/admin
    attachment_name VARCHAR(255),
    attachment_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_status_history (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by_id BIGINT REFERENCES users(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    technician_id BIGINT NOT NULL REFERENCES users(id),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'CANCELLED', 'COMPLETED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_tech_time ON appointments(technician_id, scheduled_start, scheduled_end);

CREATE TABLE IF NOT EXISTS remote_sessions (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id BIGINT NOT NULL REFERENCES users(id),
    tool_used VARCHAR(50) NOT NULL DEFAULT 'ANYDESK',
    started_at TIMESTAMPTZ NOT NULL,
    paused_at TIMESTAMPTZ,
    last_resumed_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'
    accumulated_seconds BIGINT NOT NULL DEFAULT 0,
    billable_seconds BIGINT NOT NULL DEFAULT 0,
    customer_consent BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remote_sessions_ticket ON remote_sessions(ticket_id);

CREATE TABLE IF NOT EXISTS time_entries (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    remote_session_id BIGINT REFERENCES remote_sessions(id) ON DELETE SET NULL,
    technician_id BIGINT NOT NULL REFERENCES users(id),
    duration_minutes INT NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    created_by_id BIGINT NOT NULL REFERENCES users(id),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    valid_until TIMESTAMPTZ NOT NULL,
    customer_notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_items (
    id BIGSERIAL PRIMARY KEY,
    quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE SET NULL,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(100) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'PIX', 'CREDIT_CARD', 'BOLETO', 'TRANSFER'
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    transaction_reference VARCHAR(255),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_entries (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INCOME',
    description VARCHAR(255) NOT NULL,
    party_name VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PAID',
    payment_method VARCHAR(50) DEFAULT 'PIX',
    entry_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
