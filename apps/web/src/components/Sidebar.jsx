import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  TicketCheck, 
  Calendar, 
  FileText, 
  Users, 
  Wrench, 
  Search,
  LogOut,
  Copy,
  Check
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  ticketCount, 
  pendingPaymentsCount,
  activeSession,
  onOpenSessionManager,
  onOpenSearchPalette,
  adminUser,
  onLogout
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'tickets', label: 'Fila de Chamados', icon: TicketCheck, count: ticketCount },
    { id: 'services', label: 'Catálogo de Serviços', icon: Wrench },
    { id: 'schedule', label: 'Agenda & Horários', icon: Calendar },
    { id: 'billing', label: 'Faturas & Cobranças', icon: FileText, count: pendingPaymentsCount },
    { id: 'customers', label: 'Clientes & Empresas', icon: Users },
  ];

  const handleCopyCustomerLink = (e) => {
    e.stopPropagation();
    const portalUrl = `${window.location.origin}/atendimento`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <aside style={{
      width: '248px',
      height: '100vh',
      backgroundColor: '#000000',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 18px',
      gap: '18px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      userSelect: 'none'
    }}>
      {/* Brand Header com a Logo Oficial IT ONE */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-light)',
        position: 'relative',
        gap: '6px'
      }}>
        <img 
          src="/assets/logo-it-one.png" 
          alt="IT ONE - Plataforma de Gestão de Suporte" 
          style={{
            width: '100%',
            maxWidth: '185px',
            maxHeight: '42px',
            objectFit: 'contain',
            objectPosition: 'left center'
          }}
        />
        <span style={{
          fontSize: '9.5px',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase'
        }}>
          PAINEL ADMINISTRATIVO
        </span>
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          width: '64px',
          height: '2px',
          backgroundColor: 'var(--orange)'
        }} />
      </div>

      {/* Busca Rápida Linear (Sem caixa) */}
      <div 
        onClick={onOpenSearchPalette}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #262626',
          padding: '8px 2px',
          color: 'var(--text-tertiary)',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'var(--orange)'}
        onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = '#262626'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={13} color="var(--text-tertiary)" />
          <span style={{ color: 'var(--text-secondary)' }}>Buscar chamado...</span>
        </div>
        <kbd style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--orange)',
          fontWeight: 700
        }}>
          ⌘K
        </kbd>
      </div>

      {/* Navegação Linear (Sem botões encaixotados) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          padding: '4px 0 8px'
        }}>
          OPERAÇÃO
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 10px',
                borderRadius: 0,
                backgroundColor: isActive ? 'rgba(255, 107, 0, 0.05)' : 'transparent',
                color: isActive ? 'var(--text-white)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                width: '100%',
                border: 'none',
                borderLeft: isActive ? '2px solid var(--orange)' : '2px solid transparent',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={15} color={isActive ? 'var(--orange)' : 'var(--text-tertiary)'} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--orange)',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Portal do Cliente — Linha Direta Sem Card */}
      <div style={{
        borderTop: '1px solid var(--border-light)',
        paddingTop: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Portal do Cliente
          </span>
          <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--orange)' }}>
            /atendimento
          </span>
        </div>
        <button
          onClick={handleCopyCustomerLink}
          className={copiedLink ? 'f-btn-secondary' : 'f-btn-primary'}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '8px 10px',
            fontSize: '11px',
            borderColor: copiedLink ? 'var(--orange)' : undefined,
            color: copiedLink ? 'var(--orange)' : undefined
          }}
        >
          {copiedLink ? <Check size={12} /> : <Copy size={12} />}
          {copiedLink ? 'Link Copiado' : 'Copiar Link do Cliente'}
        </button>
      </div>

      {/* Status AnyDesk — Linha Plana */}
      <div 
        onClick={activeSession ? onOpenSessionManager : () => setCurrentTab('tickets')}
        style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Gateway AnyDesk
          </span>
          <span className={`status-dot ${activeSession ? 'status-dot-active' : 'status-dot-neutral'}`} />
        </div>
        <span style={{ fontSize: '11.5px', color: activeSession ? 'var(--orange)' : 'var(--text-tertiary)', fontFamily: activeSession ? 'var(--font-mono)' : 'inherit' }}>
          {activeSession ? `Ativo • ${activeSession.ticketCode}` : 'Pronto para conexão'}
        </span>
      </div>

      {/* Operador Logado + Sair */}
      <div style={{
        borderTop: '1px solid var(--border-light)',
        paddingTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-white)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {adminUser?.fullName || 'IT THECNICA'}
          </span>
          <span style={{
            fontSize: '10.5px',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {adminUser?.email || 'Administrador'}
          </span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Sair da conta"
            className="f-btn-icon"
            style={{ width: '30px', height: '30px', flexShrink: 0 }}
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
    </aside>
  );
}
