import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TicketsTable from './components/TicketsTable';
import TicketDetailModal from './components/TicketDetailModal';
import NewTicketModal from './components/NewTicketModal';
import SessionManagerModal from './components/SessionManagerModal';
import DashboardView from './components/DashboardView';
import ServicesView from './components/ServicesView';
import ScheduleView from './components/ScheduleView';
import BillingView from './components/BillingView';
import CustomersView from './components/CustomersView';
import CommandPaletteModal from './components/CommandPaletteModal';
import AdminAuthView from './components/AdminAuthView';
import CustomerPortalView from './components/CustomerPortalView';
import { api } from './services/api';
import { 
  Plus, 
  Bell, 
  ChevronRight, 
  X
} from 'lucide-react';

export default function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('itone_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Verifica se o link acessado é o link exclusivo enviado para o cliente (/atendimento)
  const isCustomerLandingRoute = (() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    return (
      path.startsWith('/atendimento') ||
      path.startsWith('/cliente') ||
      params.get('portal') === 'cliente'
    );
  })();

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [ticketsInitialFilter, setTicketsInitialFilter] = useState('ALL');
  const [dashboardSummary, setDashboardSummary] = useState(null);

  useEffect(() => {
    if (adminUser && !isCustomerLandingRoute) {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [adminUser, isCustomerLandingRoute]);

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    const [ticketsData, sessionData, summaryData] = await Promise.all([
      api.getTickets(),
      api.getActiveSession(),
      api.getDashboardSummary()
    ]);
    setTickets(ticketsData);
    setActiveSession(sessionData);
    setDashboardSummary(summaryData);
  };

  const handleAdminAuthenticated = (user) => {
    localStorage.setItem('itone_admin_user', JSON.stringify(user));
    setAdminUser(user);
    if (window.location.pathname.toLowerCase().startsWith('/login')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('itone_admin_user');
    setAdminUser(null);
    window.history.replaceState({}, '', '/login');
  };

  // Se o acesso for pelo link do cliente (/atendimento), renderiza apenas a Landing Page do Cliente
  if (isCustomerLandingRoute) {
    return <CustomerPortalView />;
  }

  // Se for o painel do Administrador e não estiver logado, renderiza o Login/Cadastro Admin
  if (!adminUser) {
    return (
      <AdminAuthView
        onAuthenticated={handleAdminAuthenticated}
      />
    );
  }

  const handleStartSession = async (ticketId) => {
    const session = await api.startSession(ticketId, 'ANYDESK');
    setActiveSession(session);
    setIsSessionManagerOpen(true);
    await loadData();
    if (selectedTicket && selectedTicket.id === Number(ticketId)) {
      setSelectedTicket(prev => ({ ...prev, status: 'IN_PROGRESS' }));
    }
  };

  const handlePauseSession = async (sessionId) => {
    const session = await api.pauseSession(sessionId);
    setActiveSession({ ...session });
  };

  const handleResumeSession = async (sessionId) => {
    const session = await api.resumeSession(sessionId);
    setActiveSession({ ...session });
  };

  const handleEndSession = async (sessionId, resolutionSummary) => {
    await api.endSession(sessionId, resolutionSummary);
    setActiveSession(null);
    setIsSessionManagerOpen(false);
    await loadData();
    if (selectedTicket && selectedTicket.status === 'IN_PROGRESS') {
      setSelectedTicket(prev => ({ ...prev, status: 'RESOLVED', resolutionSummary: resolutionSummary || prev.resolutionSummary }));
    }
  };

  const handleStatusChange = async (ticketId, newStatus, resolutionSummary) => {
    const updated = await api.updateTicketStatus(ticketId, newStatus, null, resolutionSummary);
    await loadData();
    if (selectedTicket && selectedTicket.id === Number(ticketId)) {
      setSelectedTicket(prev => ({ ...prev, ...(updated || {}), status: newStatus }));
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Deseja excluir este chamado?')) return;
    await api.deleteTicket(ticketId);
    if (selectedTicket && selectedTicket.id === Number(ticketId)) {
      setSelectedTicket(null);
    }
    await loadData();
  };

  const handleTicketCreated = async () => {
    await loadData();
    setTicketsInitialFilter('ALL');
    setCurrentTab('tickets');
  };

  const handleNavigateToTickets = (filter = 'ALL') => {
    setTicketsInitialFilter(filter);
    setCurrentTab('tickets');
  };

  const handleNavigateTab = (tab) => {
    setCurrentTab(tab);
  };

  const openQueueCount = tickets.filter(t => t.status === 'NEW' || t.status === 'TRIAGE' || t.status === 'WAITING_APPROVAL').length;
  const pendingPaymentsCount = tickets.filter(t => (t.status === 'RESOLVED' || t.status === 'CLOSED') && t.paymentStatus !== 'PAID').length;

  const tabLabels = {
    dashboard: 'Visão Geral',
    tickets: 'Fila de Chamados',
    services: 'Catálogo de Serviços',
    schedule: 'Agenda Técnica',
    billing: 'Faturamento & Cobranças',
    customers: 'Clientes & Empresas'
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar do Administrador */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        ticketCount={openQueueCount}
        pendingPaymentsCount={pendingPaymentsCount}
        activeSession={activeSession}
        onOpenSessionManager={() => setIsSessionManagerOpen(true)}
        onOpenSearchPalette={() => setIsCommandPaletteOpen(true)}
        adminUser={adminUser}
        onLogout={handleAdminLogout}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflowX: 'hidden'
      }}>
        {/* Top Navbar */}
        <header style={{
          height: '60px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          {/* Breadcrumb minimalista */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span style={{ color: 'var(--orange)', fontWeight: 800, fontStyle: 'italic' }}>IT ONE</span>
            <ChevronRight size={13} color="var(--text-tertiary)" />
            <span style={{ color: 'var(--text-white)', fontWeight: 700 }}>
              {tabLabels[currentTab]}
            </span>
          </div>

          {/* Ações da Direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Banner HUD de Sessão Ativa Global */}
            {activeSession && (
              <button
                onClick={() => setIsSessionManagerOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 107, 0, 0.08)',
                  border: '1px solid var(--orange)',
                  borderRadius: '2px',
                  padding: '6px 12px',
                  color: 'var(--orange)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span className="status-dot status-dot-active" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>AnyDesk {activeSession.remoteAccessId || 'ATIVO'}</span>
                <span style={{ color: 'var(--text-white)', marginLeft: '4px', fontSize: '11px' }}>
                  • Gerenciar
                </span>
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <button 
                className="f-btn-icon" 
                title="Notificações"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <Bell size={15} />
              </button>

              {/* Popover de Notificações */}
              {isNotificationsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '320px',
                  backgroundColor: '#050505',
                  border: '1px solid #262626',
                  borderTop: '2px solid var(--orange)',
                  borderRadius: '2px',
                  padding: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Notificações Operacionais
                    </span>
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {tickets.length === 0 && !activeSession ? (
                      <div style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>
                        Nenhuma notificação pendente.
                      </div>
                    ) : (
                      <>
                        {activeSession && (
                          <div style={{ padding: '8px 0 8px 10px', borderLeft: '2px solid var(--orange)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--text-white)' }}>Sessão AnyDesk ativa</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{activeSession.ticketCode} em execução no momento</p>
                          </div>
                        )}
                        {tickets.slice(0, 3).map(t => (
                          <div key={t.id} style={{ padding: '8px 0 8px 10px', borderLeft: '2px solid #262626' }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-white)' }}>{t.code} • {t.customerName}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{t.title}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsNewTicketModalOpen(true)} 
              className="f-btn-primary"
            >
              <Plus size={14} /> Novo Chamado
            </button>
          </div>
        </header>

        {/* Corpo de Conteúdo */}
        <div style={{ padding: '28px', flex: 1, maxWidth: '1440px', width: '100%', boxSizing: 'border-box' }}>
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={dashboardSummary}
              tickets={tickets}
              activeSession={activeSession}
              onSelectTicket={(ticket) => setSelectedTicket(ticket)}
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onResumeSession={handleResumeSession}
              onOpenSessionManager={() => setIsSessionManagerOpen(true)}
              onNavigateToTickets={handleNavigateToTickets}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {currentTab === 'tickets' && (
            <TicketsTable
              tickets={tickets}
              initialFilter={ticketsInitialFilter}
              onSelectTicket={(ticket) => setSelectedTicket(ticket)}
              onOpenNewTicketModal={() => setIsNewTicketModalOpen(true)}
              onStartSession={handleStartSession}
              onDeleteTicket={handleDeleteTicket}
            />
          )}

          {currentTab === 'services' && (
            <ServicesView
              onSelectServiceToOpenTicket={() => setIsNewTicketModalOpen(true)}
            />
          )}

          {currentTab === 'schedule' && (
            <ScheduleView
              tickets={tickets}
              onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
              onStartSession={handleStartSession}
            />
          )}

          {currentTab === 'billing' && (
            <BillingView
              tickets={tickets}
              onStatusChange={handleStatusChange}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
              onStartSession={handleStartSession}
            />
          )}
        </div>
      </main>

      {/* Modal de Detalhe de Chamado (Com Chat em Tempo Real com o Cliente) */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
          onStartSession={handleStartSession}
          adminUser={adminUser}
        />
      )}

      {/* Modal de Novo Chamado */}
      {isNewTicketModalOpen && (
        <NewTicketModal
          onClose={() => setIsNewTicketModalOpen(false)}
          onCreated={handleTicketCreated}
        />
      )}

      {/* Modal de Gerenciamento de Sessão AnyDesk */}
      {isSessionManagerOpen && activeSession && (
        <SessionManagerModal
          session={activeSession}
          ticket={tickets.find(t => t.id === activeSession.ticketId) || selectedTicket}
          onClose={() => setIsSessionManagerOpen(false)}
          onPause={handlePauseSession}
          onResume={handleResumeSession}
          onEnd={handleEndSession}
        />
      )}

      {/* Command Palette (⌘K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tickets={tickets}
        onSelectTicket={(t) => setSelectedTicket(t)}
        onNavigateTab={handleNavigateTab}
      />
    </div>
  );
}
