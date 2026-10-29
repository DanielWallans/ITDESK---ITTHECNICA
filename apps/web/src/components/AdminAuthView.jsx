import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import './customerPortal.css';

export default function AdminAuthView({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    companyName: 'IT ONE'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await api.registerAdmin({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          companyName: formData.companyName || 'IT ONE'
        });
        onAuthenticated(res.user);
      } else {
        const res = await api.login({
          email: formData.email,
          password: formData.password
        });
        if (res.user.role !== 'ADMIN' && res.user.role !== 'TECHNICIAN') {
          throw new Error('Acesso restrito a administradores e técnicos.');
        }
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err.message || 'Não foi possível autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Barra superior minimalista sem cards */}
      <header className="cp-header">
        <div className="cp-brand">
          <img src="/assets/logo-it-one.png" alt="IT ONE" />
          <span>Console Operacional</span>
        </div>

        <a
          href="/atendimento"
          className="cp-link"
          style={{ textDecoration: 'none', letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
        >
          Portal do Cliente →
        </a>
      </header>

      {/* Corpo Principal Assimétrico — Logo Oficial IT ONE + Formulário Limpo */}
      <main
        className="cp-main cp-grid"
        style={{
          flex: 1,
          width: '100%',
          alignItems: 'center'
        }}
      >
        {/* Coluna Esquerda: Logo Oficial IT ONE */}
        <section>
          <div className="cp-eyebrow">Acesso Restrito · Ambiente Técnico</div>

          <div style={{ margin: '16px 0 24px' }}>
            <img
              src="/assets/logo-it-one.png"
              alt="IT ONE — Plataforma de Gestão de Suporte"
              style={{
                width: '100%',
                maxWidth: 380,
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
            />
          </div>

          <p className="cp-sub" style={{ maxWidth: 460, fontSize: 13.5, lineHeight: 1.65, marginBottom: 28 }}>
            Controle centralizado de chamados, sessões remotas auditadas, catálogo técnico e faturamento Pix em tempo real.
          </p>

          {/* Indicadores técnicos em linha (sem cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--cp-line)',
              borderBottom: '1px solid var(--cp-line)',
              padding: '14px 0',
              maxWidth: 480,
              gap: '8px'
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--cp-dim)' }}>
                Remoto
              </span>
              <strong style={{ fontSize: 12.5, color: 'var(--cp-text)', fontFamily: 'var(--font-mono)' }}>
                AnyDesk
              </strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--cp-line)', paddingLeft: 12 }}>
              <span style={{ display: 'block', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--cp-dim)' }}>
                Alertas
              </span>
              <strong style={{ fontSize: 12.5, color: 'var(--cp-orange)', fontFamily: 'var(--font-mono)' }}>
                Push iOS
              </strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--cp-line)', paddingLeft: 12 }}>
              <span style={{ display: 'block', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--cp-dim)' }}>
                Financeiro
              </span>
              <strong style={{ fontSize: 12.5, color: 'var(--cp-text)', fontFamily: 'var(--font-mono)' }}>
                Pix & Caixa
              </strong>
            </div>
          </div>
        </section>

        {/* Coluna Direita: Autenticação limpa com divisória vertical (sem card) */}
        <section className="cp-auth">
          <div className="cp-eyebrow">
            {mode === 'login' ? 'Credenciais de Operador' : 'Novo Operador'}
          </div>
          <h1 className="cp-h1" style={{ fontSize: 28, marginBottom: 6 }}>
            {mode === 'login' ? 'Entrar no painel' : 'Criar acesso admin'}
          </h1>
          <p className="cp-sub">
            {mode === 'login'
              ? 'Informe seu e-mail corporativo e senha para abrir a mesa de comando.'
              : 'Cadastre um novo administrador ou técnico responsável.'}
          </p>

          <div className="cp-tabs">
            <button
              type="button"
              className={`cp-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`cp-tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              Criar conta
            </button>
          </div>

          {error && <div className="cp-error">{error}</div>}

          <form onSubmit={handleSubmit} className="cp-form">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="cp-label">Nome completo</label>
                  <input
                    className="cp-input"
                    type="text"
                    required
                    placeholder="Nome do técnico / administrador"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div className="cp-two">
                  <div>
                    <label className="cp-label">Unidade / Empresa</label>
                    <input
                      className="cp-input"
                      type="text"
                      placeholder="IT ONE"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="cp-label">Telefone / WhatsApp</label>
                    <input
                      className="cp-input"
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="cp-label">E-mail</label>
              <input
                className="cp-input"
                type="email"
                required
                placeholder="admin@itone.com.br"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="cp-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="cp-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  style={{ paddingRight: 36 }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cp-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="cp-btn" style={{ marginTop: 10 }}>
              {loading ? 'Autenticando...' : mode === 'login' ? 'Acessar Painel' : 'Concluir Cadastro'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
