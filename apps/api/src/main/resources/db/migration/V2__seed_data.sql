-- ============================================================
-- V2__seed_data.sql: Inicialização Limpa (Sem dados fictícios)
-- ============================================================

-- Administrador Base IT THECNICA
INSERT INTO users (id, company_id, full_name, email, password_hash, phone, role, is_active, email_verified)
VALUES
(1, NULL, 'IT THECNICA', 'admin@itthecnica.com.br', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhiMtiJzQ211Y1U7KqQGqZf4dE6/EaQy', '', 'ADMIN', true, true)
ON CONFLICT DO NOTHING;
