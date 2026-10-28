# Decisões Técnicas — SuporteRemoto

1. **Frontend em React JS (sem TypeScript)**:
   - Atendendo à solicitação do usuário, o frontend foi implementado em React moderno (JSX puro), eliminando a sobrecarga de build e configuração de tipos estritos de TypeScript, preservando clareza de componentes e alta agilidade de desenvolvimento.
   
2. **Integração com Paper MCP**:
   - O design visual do painel de chamados foi desenhado diretamente no Paper MCP na página ativa `"gestao de chamado"` (artboard `"Painel Gestão de Chamados"`), com estrutura que alinha as métricas, cartões de sessões ativas e a tabela de chamados.

3. **Backend com Java 21 e Spring Boot 3**:
   - Utilização do runtime mais recente de suporte a longo prazo (Java 21 LTS) com padrão monólito modular, facilitando a transição futura para SaaS sem a complexidade desnecessária de microsserviços.

4. **Flyway e Persistência Híbrida (PostgreSQL / H2)**:
   - Migrações DDL e seeds foram escritos em SQL compatível com PostgreSQL 16.
   - Para ambientes onde o daemon do Docker ou o serviço nativo do PostgreSQL não estejam imediatamente inicializados, foi configurado um perfil `dev` com banco H2 em modo de compatibilidade PostgreSQL, garantindo que o backend compile, teste e execute sem nenhum bloqueio de ambiente.

5. **Camada de Cliente HTTP Resiliente**:
   - `apps/web/src/services/api.js` implementa conexão direta com `/api/v1` e fallback transparente com dados sincronizados com o seed do banco de dados, assegurando testes visuais e fluxos completos de chamados, cronômetro e mensagens em qualquer situação.
