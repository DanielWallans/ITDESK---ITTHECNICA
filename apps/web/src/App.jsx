import React, { useState, useEffect, useRef } from 'react';
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
import MobileAppView from './components/MobileAppView';
import CommandPaletteModal from './components/CommandPaletteModal';
import AdminAuthView from './components/AdminAuthView';
import CustomerPortalView from './components/CustomerPortalView';
import { api } from './services/api';
import { playNotificationChime } from './utils/sound';
import { 
  Plus, 
  Bell, 
  ChevronRight, 
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Menu,
  Copy,
  Check,
  Search,
  LogOut,
  Wrench,
  Calendar
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

  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'tickets', 'services', 'schedule', 'billing', 'customers', 'mobile'].includes(tabParam)) {
      return tabParam;
    }
    return 'dashboard';
  });
  const [tickets, setTickets] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedPortalMobile, setCopiedPortalMobile] = useState(false);
  const [ticketsInitialFilter, setTicketsInitialFilter] = useState('ALL');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('itone_sound_enabled') !== 'false';
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveToast, setLiveToast] = useState(null);
  const [pushSubscribed, setPushSubscribed] = useState(true); // oculto até checar
  const [enablingPushBanner, setEnablingPushBanner] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootFadeOut, setBootFadeOut] = useState(false);
  const [bootProgress, setBootProgress] = useState(12);

  const initialLoadDoneRef = useRef(false);
  const knownTicketIdsRef = useRef(new Set());
  const knownReportedPaymentsRef = useRef(new Set());
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    if (!booting) return;
    setBootFadeOut(false);
    setBootProgress(15);
    const t1 = setTimeout(() => setBootProgress(48), 320);
    const t2 = setTimeout(() => setBootProgress(82), 750);
    const t3 = setTimeout(() => setBootProgress(100), 1150);
    const t4 = setTimeout(() => setBootFadeOut(true), 1400);
    const t5 = setTimeout(() => setBooting(false), 1780);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [booting]);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const syncPushSubscription = async (interactive = false) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushSubscribed(false);
        if (interactive) {
          alert(
            'Atenção iPhone (Safari): A Apple só libera notificações com o App Fechado / Tela Bloqueada quando você instala pelo Safari tocando em "Compartilhar" -> "Adicionar à Tela de Início". Adicione à Tela de Início, abra o novo ícone IT DESK com a logo oficial e toque neste botão novamente!'
          );
        }
        return false;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.subscribePush(existing).catch(() => {});
        setPushSubscribed(true);
        if (interactive) {
          await api.sendTestPush().catch(() => {});
        }
        return true;
      }

      if (!interactive && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        setPushSubscribed(false);
        return false;
      }

      if (interactive && typeof Notification !== 'undefined') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setPushSubscribed(false);
          alert('Permissão de notificação negada. Ative as notificações para o app IT DESK nos Ajustes do iPhone.');
          return false;
        }
      }

      const cfg = await api.getPushConfig();
      const vapidKey =
        cfg?.publicKey ||
        'BDAH9v7vNy72F160kTuKcCYR_U9lsXwpCEWYY8HcsPu7jqT26xgBCZ0XrRtslyVXyz8pd-__CaxnMtsLo4OLTcg';

      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      await api.subscribePush(newSub);
      setPushSubscribed(true);
      if (interactive) {
        playNotificationChime();
        await api.sendTestPush().catch(() => {});
      }
      return true;
    } catch (err) {
      setPushSubscribed(false);
      if (interactive) {
        alert(err.message || 'Para receber com o app fechado no iPhone, instale pelo Safari em Compartilhar -> Adicionar à Tela de Início.');
      }
      return false;
    }
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('itone_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (adminUser && !isCustomerLandingRoute) {
      syncPushSubscription(false);
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 4000);
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

  const triggerAdminAlert = (title, subtitle, ticketObj = null) => {
    if (soundEnabledRef.current) {
      playNotificationChime();
    }
    setUnreadCount((prev) => prev + 1);
    setLiveToast({ title, subtitle, ticket: ticketObj, id: Date.now() });
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body: subtitle });
      } catch {
        // Ignora erro de notificação nativa
      }
    }
  };

  const loadData = async () => {
    const [ticketsData, sessionData, summaryData] = await Promise.all([
      api.getTickets(),
      api.getActiveSession(),
      api.getDashboardSummary()
    ]);

    const list = Array.isArray(ticketsData) ? ticketsData : [];

    if (!initialLoadDoneRef.current) {
      list.forEach((t) => {
        knownTicketIdsRef.current.add(t.id);
        if (t.paymentStatus === 'REPORTED' || t.paymentReceiptUrl) {
          knownReportedPaymentsRef.current.add(t.id);
        }
      });
      initialLoadDoneRef.current = true;
    } else {
      list.forEach((t) => {
        if (!knownTicketIdsRef.current.has(t.id)) {
          knownTicketIdsRef.current.add(t.id);
          triggerAdminAlert(
            `Novo Chamado • ${t.code}`,
            `${t.customerName}: ${t.title}`,
            t
          );
        } else if (
          (t.paymentStatus === 'REPORTED' || t.paymentReceiptUrl) &&
          !knownReportedPaymentsRef.current.has(t.id)
        ) {
          knownReportedPaymentsRef.current.add(t.id);
          triggerAdminAlert(
            `Comprovante Pix Recebido • ${t.code}`,
            `${t.customerName} enviou comprovante / informou pagamento Pix`,
            t
          );
        }
      });
    }

    setTickets(list);
    setActiveSession(sessionData);
    setDashboardSummary(summaryData);
  };

  const handleAdminAuthenticated = (user) => {
    localStorage.setItem('itone_admin_user', JSON.stringify(user));
    setAdminUser(user);
    setBooting(true);
    if (window.location.pathname.toLowerCase().startsWith('/login')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('itone_admin_user');
    setAdminUser(null);
    window.history.replaceState({}, '', '/login');
  };

  // Tela de Carregamento / Splash Screen Oficial IT DESK (Preto Absoluto + Efeitos Laranja + Barra de Progresso)
  if (booting && !isCustomerLandingRoute) {
    const bootStepLabel =
      bootProgress < 45
        ? 'INICIALIZANDO PLATAFORMA DE GESTÃO DE SUPORTE...'
        : bootProgress < 85
        ? 'SINCRONIZANDO CHAMADOS, GATEWAY ANYDESK & ALERTAS PUSH...'
        : 'AMBIENTE OPERACIONAL PRONTO';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px',
          zIndex: 99999,
          overflow: 'hidden',
          opacity: bootFadeOut ? 0 : 1,
          transition: 'opacity 0.38s ease',
          userSelect: 'none'
        }}
      >
        {/* Linha Laser Superior Laranja */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #ff6b00 50%, transparent 100%)',
            boxShadow: '0 0 18px #ff6b00'
          }}
        />

        {/* Efeito de Luz / Glow Radial Laranja ao Fundo */}
        <div
          style={{
            position: 'absolute',
            width: 'min(560px, 95vw)',
            height: 'min(560px, 95vw)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 107, 0, 0.24) 0%, rgba(255, 75, 0, 0.08) 40%, rgba(0, 0, 0, 0) 72%)',
            filter: 'blur(26px)',
            pointerEvents: 'none',
            animation: 'itonePulseGlow 2.8s ease-in-out infinite'
          }}
        />

        {/* Halo Secundário Laranja Inferior */}
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            width: 'min(680px, 100vw)',
            height: '240px',
            background: 'radial-gradient(ellipse at center, rgba(255, 107, 0, 0.16) 0%, transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }}
        />

        {/* Logo Oficial IT DESK — Plataforma de Gestão de Suporte */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <img
            src="/assets/logo-it-desk.png"
            alt="IT DESK — Plataforma de Gestão de Suporte"
            style={{
              width: '88%',
              maxWidth: '380px',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 32px rgba(255, 107, 0, 0.38))'
            }}
          />

          {/* Barra de Carregamento Arquitetural Laranja */}
          <div
            style={{
              marginTop: '40px',
              width: 'min(280px, 78vw)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '3px',
                backgroundColor: '#161616',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '2px'
              }}
            >
              <div
                style={{
                  width: `${bootProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff5100 0%, #ff6b00 60%, #ff9d4d 100%)',
                  boxShadow: '0 0 14px #ff6b00',
                  transition: 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}
            >
              <span style={{ color: '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bootStepLabel}
              </span>
              <span style={{ color: '#ff6b00', fontWeight: 800, flexShrink: 0 }}>
                {bootProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* Linha Laser Inferior Laranja */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 107, 0, 0.65) 50%, transparent 100%)'
          }}
        />
      </div>
    );
  }

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
    customers: 'Clientes & Empresas',
    mobile: 'App no Celular'
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
        <header className="adm-top-header" style={{
          height: '62px',
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
          {/* Breadcrumb / Brand Mobile com Logo Oficial Destacada */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 0 }}>
            <img
              src="/assets/logo-it-desk.png"
              alt="IT DESK"
              className="adm-mobile-only"
              onClick={() => setCurrentTab('dashboard')}
              style={{ height: '32px', maxWidth: '140px', width: 'auto', objectFit: 'contain', cursor: 'pointer', flexShrink: 0 }}
            />
            <span className="adm-desktop-only" style={{ color: 'var(--orange)', fontWeight: 800, fontStyle: 'italic' }}>IT DESK</span>
            <ChevronRight size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-white)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11.5px' }}>
              {tabLabels[currentTab]}
            </span>
          </div>

          {/* Ações da Direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Banner HUD de Sessão Ativa Global */}
            {activeSession && (
              <button
                onClick={() => setIsSessionManagerOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 107, 0, 0.08)',
                  border: '1px solid var(--orange)',
                  borderRadius: '2px',
                  padding: '6px 10px',
                  color: 'var(--orange)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span className="status-dot status-dot-active" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{activeSession.remoteAccessId || 'ATIVO'}</span>
                <span className="adm-desktop-only" style={{ color: 'var(--text-white)', marginLeft: '4px', fontSize: '11px' }}>
                  • Gerenciar
                </span>
              </button>
            )}

            <button
              className="f-btn-icon adm-desktop-only"
              title="App no Celular & Notificações Push (Safari / iPhone)"
              onClick={() => setCurrentTab('mobile')}
              style={{
                borderColor: currentTab === 'mobile' ? 'var(--orange)' : undefined,
                color: currentTab === 'mobile' ? 'var(--orange)' : undefined
              }}
            >
              <Smartphone size={15} />
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="f-btn-icon" 
                title="Notificações & Alerta Sonoro"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsMobileMenuOpen(false);
                  setUnreadCount(0);
                }}
                style={{
                  position: 'relative',
                  borderColor: unreadCount > 0 ? 'var(--orange)' : undefined,
                  color: unreadCount > 0 ? 'var(--orange)' : undefined
                }}
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: 'var(--orange)',
                    color: '#000000',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    lineHeight: 1.2
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Popover de Notificações */}
              {isNotificationsOpen && (
                <div style={{
                  position: 'fixed',
                  top: '58px',
                  right: '14px',
                  width: 'min(340px, calc(100vw - 28px))',
                  backgroundColor: '#050505',
                  border: '1px solid #262626',
                  borderTop: '2px solid var(--orange)',
                  borderRadius: '2px',
                  padding: '16px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
                  zIndex: 80,
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

                  {/* Controles de Alerta Sonoro ("Plim") */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #161616'
                  }}>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="f-btn-secondary"
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        borderColor: soundEnabled ? 'var(--orange)' : '#262626',
                        color: soundEnabled ? 'var(--orange)' : 'var(--text-secondary)'
                      }}
                    >
                      {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                      <span>{soundEnabled ? 'Som Ativo' : 'Som Mudo'}</span>
                    </button>

                    <button
                      onClick={() => playNotificationChime()}
                      className="f-btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '11px' }}
                      title="Ouvir o toque de novo chamado"
                    >
                      Testar Toque ♪
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {tickets.length === 0 && !activeSession ? (
                      <div style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>
                        Nenhuma notificação pendente. Assim que um cliente abrir um chamado em <code>/atendimento</code>, o alerta sonoro tocará automaticamente.
                      </div>
                    ) : (
                      <>
                        {activeSession && (
                          <div style={{ padding: '8px 0 8px 10px', borderLeft: '2px solid var(--orange)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--text-white)' }}>Sessão AnyDesk ativa</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{activeSession.ticketCode} em execução no momento</p>
                          </div>
                        )}
                        {tickets.slice(0, 4).map(t => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTicket(t);
                              setIsNotificationsOpen(false);
                            }}
                            style={{
                              padding: '8px 0 8px 10px',
                              borderLeft: t.status === 'NEW' ? '2px solid var(--orange)' : '2px solid #262626',
                              cursor: 'pointer'
                            }}
                          >
                            <p style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                              <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>{t.code}</span> • {t.customerName}
                            </p>
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
              style={{ padding: '8px 12px' }}
            >
              <Plus size={14} />
              <span className="adm-desktop-only">Novo Chamado</span>
            </button>

            {/* Botão Menu Gaveta Mobile (Acesso a Serviços, Agenda, Link Cliente, Busca e Logout) */}
            <button
              className="f-btn-icon adm-mobile-only"
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsNotificationsOpen(false);
              }}
              style={{
                borderColor: isMobileMenuOpen ? 'var(--orange)' : undefined,
                color: isMobileMenuOpen ? 'var(--orange)' : undefined
              }}
              title="Menu Operacional"
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </header>

        {/* Gaveta de Menu Rápido Mobile (Quando o usuário toca no ícone Menu no celular) */}
        {isMobileMenuOpen && (
          <div
            className="adm-mobile-only"
            style={{
              flexDirection: 'column',
              backgroundColor: '#050505',
              borderBottom: '2px solid var(--orange)',
              padding: '16px 14px',
              gap: '12px',
              zIndex: 39
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => {
                  setCurrentTab('services');
                  setIsMobileMenuOpen(false);
                }}
                className="f-btn-secondary"
                style={{ justifyContent: 'flex-start', borderColor: currentTab === 'services' ? 'var(--orange)' : undefined }}
              >
                <Wrench size={13} color="var(--orange)" /> Catálogo de Serviços
              </button>
              <button
                onClick={() => {
                  setCurrentTab('schedule');
                  setIsMobileMenuOpen(false);
                }}
                className="f-btn-secondary"
                style={{ justifyContent: 'flex-start', borderColor: currentTab === 'schedule' ? 'var(--orange)' : undefined }}
              >
                <Calendar size={13} color="var(--orange)" /> Agenda & Horários
              </button>
              <button
                onClick={() => {
                  setIsCommandPaletteOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="f-btn-secondary"
                style={{ justifyContent: 'flex-start' }}
              >
                <Search size={13} color="var(--orange)" /> Buscar Chamado
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/atendimento`);
                  setCopiedPortalMobile(true);
                  setTimeout(() => setCopiedPortalMobile(false), 2000);
                }}
                className="f-btn-primary"
                style={{ justifyContent: 'center', fontSize: '11px' }}
              >
                {copiedPortalMobile ? <Check size={13} /> : <Copy size={13} />}
                {copiedPortalMobile ? 'Link Copiado!' : 'Link /atendimento'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #1f1f1f' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>{adminUser?.fullName || 'IT THECNICA'}</span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>{adminUser?.email}</span>
              </div>
              <button onClick={handleAdminLogout} className="f-btn-secondary" style={{ padding: '6px 12px', color: '#fca5a5' }}>
                <LogOut size={13} /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Faixa de Ativação 1-Toque de Notificações com o App Fechado (Aparece automaticamente se o aparelho ainda não estiver inscrito no Push) */}
        {!pushSubscribed && (
          <div
            style={{
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
              borderBottom: '1px solid var(--orange)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ffffff' }}>
              <Bell size={14} color="var(--orange)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Alertas com o App Fechado:</strong> Toque ao lado para vincular este iPhone e receber notificações mesmo com a tela bloqueada.
              </span>
            </div>
            <button
              onClick={async () => {
                setEnablingPushBanner(true);
                await syncPushSubscription(true);
                setEnablingPushBanner(false);
              }}
              disabled={enablingPushBanner}
              className="f-btn-primary"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              {enablingPushBanner ? 'ATIVANDO...' : 'ATIVAR NOTIFICAÇÕES EM 2º PLANO'}
            </button>
          </div>
        )}

        {/* Corpo de Conteúdo */}
        <div className="adm-main-body" style={{ padding: '28px', flex: 1, maxWidth: '1440px', width: '100%', boxSizing: 'border-box' }}>
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

          {currentTab === 'mobile' && (
            <MobileAppView
              onNavigateTab={handleNavigateTab}
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

      {/* Alerta Flutuante em Tempo Real quando chega Novo Chamado / Comprovante */}
      {liveToast && (
        <div
          className="adm-live-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '340px',
            backgroundColor: '#050505',
            border: '1px solid #262626',
            borderTop: '2px solid var(--orange)',
            borderRadius: '2px',
            padding: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              ● {liveToast.title}
            </span>
            <button
              onClick={() => setLiveToast(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)', lineHeight: 1.4 }}>
            {liveToast.subtitle}
          </p>
          {liveToast.ticket && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  setSelectedTicket(liveToast.ticket);
                  setLiveToast(null);
                }}
                className="f-btn-primary"
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                Abrir Chamado
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
