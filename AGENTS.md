# INSTRUÇÕES PARA AGENTES DE IA (AGENTS.md)

Este documento contém convenções persistentes e diretrizes de engenharia para qualquer agente ou desenvolvedor que for iterar sobre a plataforma **SuporteRemoto**.

## 1. Arquitetura e Decisões Fundamentais

- **Monólito Modular**:
  - `apps/api`: Backend Java 21 LTS com Spring Boot 3, Flyway, Spring Security, JPA/Hibernate, Jakarta Validation e Swagger/OpenAPI 3.
  - `apps/web`: Frontend em React puro (JavaScript com JSX, **sem TypeScript**), empacotado via Vite, integrado via cliente centralizado resiliente com o backend.
  - `infra/`: Infraestrutura local Docker Compose com PostgreSQL 16.
  - `docs/`: Documentação viva do sistema.

## 2. Princípios de Segurança e Regras de Negócio

1. **Isolamento de Dados**:
   - Clientes (`CUSTOMER`) só podem visualizar chamados e dados aos quais estão vinculados. O mero conhecimento do código público (`CH-2026-XXXXXX`) não concede permissão.
2. **Segregação de Mensagens e Notas Internas**:
   - Uma nota interna (`is_internal = true`) **jamais** pode ser exibida ou retornada a clientes.
   - Qualquer endpoint de consulta por perfil `CUSTOMER` deve filtrar mensagens com `is_internal = false`.
3. **Cadastro Seguro**:
   - Todo cadastro público gera contas com perfil `CUSTOMER`. Nunca conceda perfil `ADMIN` via formulário de cadastro.
4. **Precisão Financeira**:
   - Valores monetários utilizam sempre `BigDecimal` no Java e `NUMERIC(12,2)` no PostgreSQL. Nunca use `float` ou `double`.
5. **Controle de Tempo de Sessões**:
   - O cronômetro oficial é calculado e persistido no servidor com timestamps UTC (`started_at`, `paused_at`, `last_resumed_at`, `ended_at`, `accumulated_seconds`).
   - Não confie unicamente no relógio do navegador.
6. **Integração com AnyDesk**:
   - O sistema organiza e audita o atendimento, tempo e consentimento; nunca armazene senhas ou senhas de acesso desassistido de AnyDesk.

## 3. Comandos de Validação e Execução

- **Backend (Compilação e Testes)**:
  ```powershell
  $env:JAVA_HOME = "C:\Java\jdk-21"; $env:PATH = "C:\Java\jdk-21\bin;" + $env:PATH
  cd apps/api
  mvn clean test
  ```
- **Frontend (Dependências e Build)**:
  ```powershell
  cd apps/web
  cmd /c npm install
  cmd /c npm run build
  cmd /c npm run dev
  ```
