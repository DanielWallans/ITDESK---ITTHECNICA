# IT ONE — Plataforma de Gestão de Suporte
### Desenvolvido por IT THECNICA (Assistência Técnica e Soluções em TI)

![Logo IT ONE](apps/web/public/assets/logo-it-one.png)

A **IT ONE** é a plataforma oficial de gestão de chamados, suporte técnico remoto (AnyDesk), controle de tempo com cronômetro persistido em tempo real, catálogo de serviços e faturamento da **IT THECNICA**.

---

## 🎨 Identidade Visual & Design System

- **Paleta de Cores**:
  - Background: Ultra Dark Carbon (`#07080a`, `#0d0f13`, `#13161c`) com malha cibernética sutil.
  - Acentos Principais: **Laranja Neon IT THECNICA** (`#ff7417`, `#ff9b35`) com efeitos de glow e pulsação cibernética.
  - Tipografia: **DM Sans**, **Rajdhani** e **JetBrains Mono** para o cronômetro oficial HUD.
- **Efeitos e UX/UI**:
  - Animações fluidas em **Framer Motion** com micro-interações ao pairar e clicar.
  - Telemetria AnyDesk com cronômetro de alta precisão em tempo real persistido no servidor.
  - Segregação de notas técnicas internas confidenciais exclusivas para os especialistas da IT THECNICA.

---

## 🚀 Como Executar

### 1. Iniciar o Frontend (React + Vite)
```powershell
npm run dev
```
Acesse em: **http://localhost:3000**

### 2. Iniciar o Backend (Spring Boot 3 + Java 21)
```powershell
npm run api
```
Acesse a documentação OpenAPI/Swagger em: **http://localhost:8080/swagger-ui.html**
