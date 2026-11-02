<div align="center">

<img src="apps/web/public/assets/logo-it-desk.png" alt="IT DESK" width="520" />

<br />
<br />

**Plataforma de gestão de suporte técnico e atendimento remoto**

Chamados, sessões remotas cronometradas, cobrança via Pix e comunicação com o cliente em um só lugar.

<br />

<img src="https://img.shields.io/badge/status-em%20produ%C3%A7%C3%A3o-e8732a?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-262a30?style=flat-square" alt="Licença" />
<img src="https://img.shields.io/badge/PWA-iOS%20%7C%20Android%20%7C%20Desktop-262a30?style=flat-square" alt="PWA" />

<br />
<br />

[Visão geral](#visão-geral) &nbsp;·&nbsp;
[Como utilizar](#como-utilizar) &nbsp;·&nbsp;
[Tecnologias](#tecnologias) &nbsp;·&nbsp;
[Arquitetura](#arquitetura) &nbsp;·&nbsp;
[System design](#system-design) &nbsp;·&nbsp;
[Segurança](#segurança)

</div>

<br />

## Visão geral

O IT DESK é a plataforma da **IT THECNICA** para atender clientes de TI de ponta a ponta. O cliente abre o chamado, o técnico conecta por AnyDesk com o tempo registrado automaticamente, e o atendimento termina com a cobrança via Pix e a avaliação do serviço.

A plataforma tem duas faces:

| | Console operacional | Portal do cliente |
|:--|:--|:--|
| **Endereço** | `/login` | `/atendimento` |
| **Para quem** | Administradores e técnicos | Clientes da IT THECNICA |
| **Função** | Operar a fila, conduzir sessões, cobrar e gerir clientes | Abrir chamados, acompanhar ao vivo e pagar |

<br />

<table>
  <tr>
    <td width="50%"><img src="docs/assets/login.png" alt="Console operacional" /></td>
    <td width="50%"><img src="docs/assets/atendimento.png" alt="Portal do cliente" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Console operacional</sub></td>
    <td align="center"><sub>Portal do cliente</sub></td>
  </tr>
</table>

<br />

## Como utilizar

### Console operacional (equipe)

**Primeiro acesso.** Abra `/login` e escolha *Criar conta*. A primeira conta criada vira a do administrador. Depois disso o cadastro de administradores é bloqueado, e as próximas entradas são feitas em *Entrar*.

O menu lateral organiza o trabalho do dia:

| Seção | O que fazer nela |
|:--|:--|
| **Visão Geral** | Ver em um relance a fila aberta, os atendimentos em curso, as horas técnicas e o valor recebido e a receber. |
| **Fila de Chamados** | Abrir cada chamado para ler o diagnóstico do cliente, conversar pelo chat (com notas internas que o cliente não vê) e mudar o status. |
| **Catálogo de Serviços** | Cadastrar serviços com preço de referência, modelo de cobrança (valor fixo ou por hora) e perguntas de diagnóstico que o cliente responde ao abrir o chamado. |
| **Agenda & Horários** | Acompanhar os atendimentos programados. |
| **Faturas & Cobranças** | Cadastrar as chaves Pix, conferir os comprovantes enviados pelos clientes e confirmar os pagamentos. A confirmação lança a receita no caixa. |
| **Clientes & Empresas** | Consultar e cadastrar clientes, empresas, CNPJ e o último ID AnyDesk usado. |
| **App no Celular** | Instalar o IT DESK na tela inicial do celular e ativar as notificações de novos chamados, mensagens e comprovantes. |

**Conduzir um atendimento remoto**

1. Na fila, abra o chamado e copie o ID AnyDesk informado pelo cliente.
2. Inicie a sessão. O cronômetro começa a contar e o cliente vê o mesmo tempo no portal.
3. Pause quando o trabalho for interrompido. O tempo pausado não é cobrado.
4. Ao encerrar, escreva o resumo da solução. O chamado passa para *Resolvido* e a cobrança é calculada a partir do serviço e do tempo registrado.

Use **Ctrl + K** em qualquer tela para buscar chamados e navegar entre as seções.

### Portal do cliente

Envie ao cliente o link `/atendimento`, que fica disponível para cópia no rodapé do menu do console.

1. **Criar acesso.** O cliente informa nome, telefone, e-mail e uma senha de pelo menos 8 caracteres. Os dados ficam salvos para os próximos atendimentos.
2. **Abrir o chamado.** Ele escolhe o serviço, responde às perguntas de diagnóstico e informa o ID AnyDesk.
3. **Acompanhar.** O status, o cronômetro da sessão e o chat com o técnico atualizam sozinhos.
4. **Pagar.** Ao final, o portal mostra o valor e o QR Code Pix. O cliente paga e anexa o comprovante (imagem ou PDF).
5. **Avaliar.** O cliente dá uma nota ao técnico e ao sistema e deixa um comentário.

### Ciclo de um chamado

```mermaid
stateDiagram-v2
    direction LR
    [*] --> NEW: cliente abre
    NEW --> TRIAGE: técnico analisa
    TRIAGE --> IN_PROGRESS: sessão iniciada
    NEW --> IN_PROGRESS: sessão iniciada
    IN_PROGRESS --> WAITING_APPROVAL: aguarda o cliente
    WAITING_APPROVAL --> IN_PROGRESS
    IN_PROGRESS --> RESOLVED: sessão encerrada
    RESOLVED --> CLOSED: equipe encerra
    NEW --> CANCELLED
    CLOSED --> [*]
```

O pagamento segue um ciclo próprio: **PENDING** (aguardando) → **REPORTED** (cliente enviou o comprovante) → **PAID** (equipe confirmou).

<br />

## Tecnologias

<table>
  <tr>
    <td><b>Interface</b></td>
    <td>
      <img src="https://img.shields.io/badge/React%2018-20232a?style=flat-square&logo=react&logoColor=61dafb" alt="React" />
      <img src="https://img.shields.io/badge/Vite%205-20232a?style=flat-square&logo=vite&logoColor=ffd62e" alt="Vite" />
      <img src="https://img.shields.io/badge/Framer%20Motion-20232a?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion" />
      <img src="https://img.shields.io/badge/Lucide%20Icons-20232a?style=flat-square&logo=lucide&logoColor=f56565" alt="Lucide" />
    </td>
  </tr>
  <tr>
    <td><b>API</b></td>
    <td>
      <img src="https://img.shields.io/badge/Node.js-20232a?style=flat-square&logo=nodedotjs&logoColor=5fa04e" alt="Node.js" />
      <img src="https://img.shields.io/badge/Vercel%20Functions-20232a?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
      <img src="https://img.shields.io/badge/Web%20Push%20(VAPID)-20232a?style=flat-square&logo=pwa&logoColor=5a0fc8" alt="Web Push" />
    </td>
  </tr>
  <tr>
    <td><b>Dados</b></td>
    <td>
      <img src="https://img.shields.io/badge/PostgreSQL-20232a?style=flat-square&logo=postgresql&logoColor=4169e1" alt="PostgreSQL" />
      <img src="https://img.shields.io/badge/Supabase-20232a?style=flat-square&logo=supabase&logoColor=3ecf8e" alt="Supabase" />
    </td>
  </tr>
  <tr>
    <td><b>Pagamentos</b></td>
    <td>
      <img src="https://img.shields.io/badge/Pix%20(BR%20Code)-20232a?style=flat-square&logo=pix&logoColor=32bcad" alt="Pix" />
      <img src="https://img.shields.io/badge/QR%20Code-20232a?style=flat-square&logo=qrcode&logoColor=white" alt="QR Code" />
    </td>
  </tr>
  <tr>
    <td><b>Acesso remoto</b></td>
    <td>
      <img src="https://img.shields.io/badge/AnyDesk-20232a?style=flat-square&logo=anydesk&logoColor=ef443b" alt="AnyDesk" />
    </td>
  </tr>
</table>

<br />

## Arquitetura

O IT DESK é uma aplicação de página única servida pela CDN da Vercel, com uma API serverless na mesma origem e PostgreSQL gerenciado pelo Supabase.

```mermaid
flowchart LR
    subgraph Clientes
        A[Console operacional<br/>/login]
        B[Portal do cliente<br/>/atendimento]
        C[PWA no celular<br/>Service Worker]
    end

    subgraph Vercel
        D[CDN<br/>React + Vite build]
        E[API serverless<br/>/api/v1]
    end

    subgraph Supabase
        F[(PostgreSQL<br/>pooler transacional)]
    end

    G[Serviço de push<br/>Apple / Google / Mozilla]
    H[AnyDesk]

    A & B --> D
    A & B -- HTTPS + token assinado --> E
    E --> F
    E -- Web Push VAPID --> G --> C
    A -. sessão remota .-> H
```

| Camada | Responsabilidade |
|:--|:--|
| **Interface** | Duas experiências (console e portal) no mesmo build, separadas pela rota. O estado é atualizado por consultas periódicas, com intervalo curto nas telas ao vivo. |
| **API** | Uma única função serverless com roteamento próprio. Concentra autenticação, regras de acesso, cálculo de sessão e cobrança. |
| **Banco** | PostgreSQL no Supabase, acessado pelo pooler em modo transação (porta 6543), adequado a funções que abrem e fecham conexões a cada chamada. |
| **Notificações** | Web Push com chaves VAPID. Assinaturas expiradas são removidas automaticamente. |

<br />

## System design

### Modelo de dados

```mermaid
erDiagram
    companies ||--o{ users : "agrupa"
    users ||--o{ tickets : "abre (cliente)"
    users ||--o{ tickets : "atende (técnico)"
    service_categories ||--o{ services : "classifica"
    services ||--o{ tickets : "define preço"
    tickets ||--o{ remote_sessions : "registra"
    tickets ||--o{ ticket_messages : "conversa"
    tickets ||--o{ financial_entries : "gera receita"
    payment_methods ||--o{ tickets : "recebe"

    tickets {
        bigint id
        varchar code
        varchar status
        varchar payment_status
        numeric estimated_price
        jsonb checklist_data
    }
    remote_sessions {
        bigint id
        varchar status
        int accumulated_seconds
        int billable_seconds
        timestamptz last_resumed_at
    }
```

### Fluxo de um atendimento

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente (portal)
    participant API as API IT DESK
    participant DB as PostgreSQL
    participant T as Técnico (console)

    C->>API: abre chamado (serviço, diagnóstico, ID AnyDesk)
    API->>DB: grava o chamado com status NEW
    API-->>T: notificação push "Novo chamado"
    T->>API: inicia sessão remota
    API->>DB: sessão IN_PROGRESS, começa a contar o tempo
    C->>API: consulta a sessão ativa
    API-->>C: cronômetro ao vivo
    T->>API: encerra com o resumo da solução
    API->>DB: grava o tempo cobrável e marca o chamado como RESOLVED
    C->>API: envia o comprovante Pix
    API-->>T: notificação push "Comprovante Pix"
    T->>API: confirma o pagamento
    API->>DB: PAID e lançamento de receita no caixa
```

### Decisões de projeto

- **Tempo calculado no servidor.** A sessão guarda o tempo acumulado e o momento da última retomada. O total é sempre calculado pela API, então fechar o navegador ou trocar de dispositivo não altera a cobrança.
- **Cobrança a partir do catálogo.** Se o chamado não tem valor definido, o preço vem do serviço escolhido no momento da resolução.
- **Receita lançada uma única vez.** A confirmação de pagamento só gera o lançamento financeiro na primeira transição para PAID.
- **Uma conexão por função.** O pool usa uma conexão por instância, com encerramento rápido quando ociosa, para não esgotar o limite do banco com muitas funções simultâneas.
- **Um único build, duas experiências.** Console e portal compartilham o mesmo pacote, o que simplifica o deploy e mantém o visual consistente.

<br />

## Segurança

| Controle | Como funciona |
|:--|:--|
| **Autenticação** | Token assinado com HMAC-SHA256, emitido no login e válido por 30 dias. Toda rota, exceto login, cadastro e catálogo público, exige o token. |
| **Controle de acesso** | A equipe acessa tudo. O cliente só alcança os próprios chamados, mensagens e sessões, não vê notas internas e só pode *informar* um pagamento, nunca confirmá-lo. |
| **Senhas** | Armazenadas com scrypt e sal individual, comparadas em tempo constante. Mínimo de 8 caracteres. |
| **Força bruta** | Limite de tentativas de login por IP e por e-mail. |
| **Arquivos** | Comprovantes aceitos só como imagem (PNG, JPG, WEBP) ou PDF, com até 6 MB. PDFs são exibidos em quadro isolado. |
| **Segredos** | Credenciais do banco, chaves VAPID e chave de assinatura ficam apenas em variáveis de ambiente da Vercel. |
| **Acesso remoto** | Toda sessão exige autorização do cliente. A plataforma não armazena senhas nem acessos não assistidos do AnyDesk. |

<br />

---

<div align="center">

<img src="apps/web/public/assets/app-icon-512.png" alt="IT DESK" width="56" />

**IT DESK** é um produto da **IT THECNICA** — Soluções em TI

Idealizado e desenvolvido por **Daniel Wallans**, CEO da IT THECNICA

<sub>© 2026 IT THECNICA. Todos os direitos reservados. Software proprietário: uso, cópia e distribuição dependem de autorização.</sub>

</div>
