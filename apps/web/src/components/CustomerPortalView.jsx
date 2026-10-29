import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  LogOut,
  Star,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import PixPayment from './PixPayment';
import './customerPortal.css';
function getChecklistForService(service) {
  if (!service) return [];
  if (Array.isArray(service.checklistQuestions) && service.checklistQuestions.length > 0) {
    return service.checklistQuestions;
  }
  const n = (service.name || '').toLowerCase();
  if (n.includes('impressora')) {
    return [
      'Qual a marca e o modelo da impressora?',
      'Como ela está conectada (USB, Wi-Fi ou Cabo de Rede)?',
      'Precisa compartilhar com outros computadores?',
      'Qual o problema atual?'
    ];
  }
  if (n.includes('certificado')) {
    return [
      'O certificado é arquivo A1 ou token/cartão A3?',
      'Qual a certificadora emissora?',
      'Você está com a senha PIN ou senha de instalação em mãos?',
      'Em qual sistema ou site precisa utilizar?'
    ];
  }
  if (n.includes('formata') || n.includes('lentid') || n.includes('otimiza')) {
    return [
      'O equipamento é notebook ou computador de mesa?',
      'Qual versão do Windows está instalada?',
      'Em qual momento nota mais lentidão?',
      'Aparece alguma mensagem de erro?'
    ];
  }
  return [];
}

export default function CustomerPortalView() {
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('itdesk_customer_user') || localStorage.getItem('itone_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('signup');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    password: ''
  });

  const [services, setServices] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [showAnydeskHelp, setShowAnydeskHelp] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [checklistAnswers, setChecklistAnswers] = useState({});
  const [activeTicket, setActiveTicket] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'new' | 'ticket'
  const [justClosed, setJustClosed] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [reportingPayment, setReportingPayment] = useState(false);
  const [receiptFileData, setReceiptFileData] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const viewRef = useRef('home');
  const prevTicketsMapRef = useRef(null);
  useEffect(() => { viewRef.current = view; }, [view]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [liveSession, setLiveSession] = useState(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  const [techRating, setTechRating] = useState(5);
  const [systemRating, setSystemRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    customSubject: '',
    description: '',
    remoteAccessId: '',
    priority: 'MEDIUM'
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadCatalog();
    const catInterval = setInterval(loadCatalog, 5000);
    return () => clearInterval(catInterval);
  }, []);

  useEffect(() => {
    if (customerUser?.id) {
      loadCustomerData(customerUser.id);
      const interval = setInterval(() => {
        loadCustomerData(customerUser.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [customerUser]);

  useEffect(() => {
    if (!liveSession) {
      setLiveSeconds(0);
      return;
    }
    setLiveSeconds(liveSession.currentTotalSeconds ?? 0);

    if (liveSession.status === 'IN_PROGRESS') {
      const timer = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [liveSession?.id, liveSession?.status, liveSession?.currentTotalSeconds]);

  useEffect(() => {
    if (!activeTicket?.id) return;
    loadTicketChat(activeTicket.id);
    const interval = setInterval(() => {
      loadTicketChat(activeTicket.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTicket?.id]);

  // Rolagem automática quando chegam mensagens novas + aviso de não lidas
  const [unread, setUnread] = useState(0);
  const lastMsgIdRef = useRef(null);
  const lastTicketRef = useRef(null);

  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : null;
    const sameTicket = lastTicketRef.current === activeTicket?.id;
    if (lastId !== lastMsgIdRef.current) {
      if (sameTicket && lastMsgIdRef.current !== null) {
        const fresh = messages.filter((m) => m.id > lastMsgIdRef.current && m.authorRole !== 'CUSTOMER');
        if (fresh.length && document.hidden) setUnread((u) => u + fresh.length);
      }
      chatEndRef.current?.scrollIntoView({ behavior: sameTicket ? 'smooth' : 'auto', block: 'nearest' });
      lastMsgIdRef.current = lastId;
    }
    lastTicketRef.current = activeTicket?.id;
  }, [messages, activeTicket?.id]);

  useEffect(() => {
    const clear = () => { if (!document.hidden) setUnread(0); };
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('focus', clear);
    return () => {
      document.removeEventListener('visibilitychange', clear);
      window.removeEventListener('focus', clear);
    };
  }, []);

  useEffect(() => {
    const base = 'IT DESK · Atendimento';
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread]);

  const loadCatalog = async () => {
    api.getPaymentMethods(true).then(setPaymentMethods);
    try {
      const list = await api.getServices();
      setServices(list);
      setSelectedService((prev) => {
        if (!prev) return null;
        const updated = list.find((s) => s.id === prev.id);
        return updated || null;
      });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadCustomerData = async (customerId) => {
    const [list, sessionData, methods] = await Promise.all([
      api.getCustomerTickets(customerId),
      api.getActiveSession({ customerId }),
      api.getPaymentMethods(true)
    ]);
    setMyTickets(list);
    setLiveSession(sessionData || null);
    setPaymentMethods(methods);
    setJustClosed((prev) => (prev ? list.find((t) => t.id === prev.id) || prev : prev));

    // Detecta qualquer chamado do cliente que acabou de ser finalizado pelo técnico e abre a tela de Pix
    if (prevTicketsMapRef.current) {
      const newlyClosed = list.find((t) => {
        const oldStatus = prevTicketsMapRef.current.get(t.id);
        const wasOpen = oldStatus && oldStatus !== 'RESOLVED' && oldStatus !== 'CLOSED';
        const nowDone = t.status === 'RESOLVED' || t.status === 'CLOSED';
        return wasOpen && nowDone;
      });
      if (newlyClosed) {
        setJustClosed(newlyClosed);
      }
    }
    prevTicketsMapRef.current = new Map(list.map((t) => [t.id, t.status]));

    // Mantém o chamado aberto atualizado
    setActiveTicket((prev) => {
      if (!prev) return prev;
      const updated = list.find((t) => t.id === prev.id);
      return updated || prev;
    });
  };

  const openPaymentScreen = (ticket) => {
    api.getPaymentMethods(true).then(setPaymentMethods);
    setReceiptFileData('');
    setReceiptFileName('');
    setJustClosed(ticket);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setJustClosed(null);
    setActiveTicket(null);
    setMessages([]);
    setView('home');
    window.scrollTo({ top: 0 });
  };

  const openTicket = (t) => {
    setActiveTicket(t);
    setView('ticket');
    window.scrollTo({ top: 0 });
  };

  const openNewTicket = () => {
    setSelectedService(null);
    setChecklistAnswers({});
    setView('new');
    window.scrollTo({ top: 0 });
  };

  const loadTicketChat = async (ticketId) => {
    const msgs = await api.getMessages(ticketId, 'CUSTOMER');
    setMessages(msgs);
  };

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectServiceCard = (svc) => {
    if (selectedService?.id === svc?.id) {
      setSelectedService(null);
      setChecklistAnswers({});
    } else {
      setSelectedService(svc);
      setChecklistAnswers({});
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const res = await api.registerCustomer(authForm);
        localStorage.setItem('itdesk_customer_user', JSON.stringify(res.user));
        setCustomerUser(res.user);
      } else {
        const res = await api.login({
          email: authForm.email,
          password: authForm.password
        });
        localStorage.setItem('itdesk_customer_user', JSON.stringify(res.user));
        setCustomerUser(res.user);
      }
    } catch (err) {
      setAuthError(err.message || 'Não foi possível entrar. Verifique seus dados.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('itdesk_customer_user');
    localStorage.removeItem('itone_customer_user');
    setCustomerUser(null);
    setMyTickets([]);
    setActiveTicket(null);
    setMessages([]);
    setLiveSession(null);
    setJustClosed(null);
    setView('home');
  };

  const handleCreateSupportRequest = async (e) => {
    e.preventDefault();
    if (!customerUser) return;

    const questions = getChecklistForService(selectedService);
    const checklistData = questions
      .map((q, idx) => ({
        question: q,
        answer: (checklistAnswers[idx] || '').trim()
      }))
      .filter((item) => item.answer !== '');

    const title = selectedService
      ? selectedService.name
      : (ticketForm.customSubject.trim() || 'Suporte Técnico');

    const checklistSummaryText = checklistData.length > 0
      ? `\n\n Informações preenchidas:\n` + checklistData.map((c) => `- ${c.question}: ${c.answer}`).join('\n')
      : '';

    const fullDescription = `${ticketForm.description.trim() || 'Solicitação de atendimento'}${checklistSummaryText}`;

    setSubmittingTicket(true);
    try {
      const created = await api.createTicket({
        customerId: customerUser.id,
        customerName: customerUser.fullName,
        customerEmail: customerUser.email,
        customerPhone: customerUser.phone,
        companyName: customerUser.companyName,
        serviceId: selectedService ? selectedService.id : null,
        serviceName: selectedService ? selectedService.name : 'Suporte Avulso',
        title,
        description: fullDescription,
        priority: ticketForm.priority,
        remoteAccessTool: 'ANYDESK',
        remoteAccessId: ticketForm.remoteAccessId,
        estimatedPrice: selectedService ? selectedService.referencePrice : 0,
        checklistData
      });

      await api.addMessage(
        created.id,
        `Solicitação aberta: ${title}.${ticketForm.description ? `\n${ticketForm.description}` : ''}${checklistSummaryText}${ticketForm.remoteAccessId ? `\nAnyDesk: ${ticketForm.remoteAccessId}` : ''}`,
        false,
        customerUser.id
      );

      setTicketForm({ customSubject: '', description: '', remoteAccessId: '', priority: 'MEDIUM' });
      setChecklistAnswers({});
      await loadCustomerData(customerUser.id);
      setActiveTicket(created);
      setView('ticket');
      await loadTicketChat(created.id);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleReopenFromHistory = (oldTicket) => {
    const matchedService = services.find((s) => s.id === oldTicket.serviceId || s.name === oldTicket.serviceName);
    setSelectedService(matchedService || null);
    setTicketForm({
      customSubject: matchedService ? '' : oldTicket.title,
      description: `Novo atendimento referente ao chamado anterior (${oldTicket.title}).`,
      remoteAccessId: oldTicket.remoteAccessId || '',
      priority: 'MEDIUM'
    });
    setView('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeTicket || !customerUser) return;
    setSendingChat(true);
    try {
      const text = chatInput.trim();
      setChatInput('');
      await api.addMessage(activeTicket.id, text, false, customerUser.id);
      await loadTicketChat(activeTicket.id);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setSendingChat(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!justClosed) return;
    setSubmittingRating(true);
    try {
      await api.rateTicket(justClosed.id, {
        techRating,
        systemRating,
        ratingComment
      });
      setRatingComment('');
      if (customerUser?.id) {
        await loadCustomerData(customerUser.id);
      }
      goHome();
    } finally {
      setSubmittingRating(false);
    }
  };

  const statusLabels = {
    NEW: 'Aguardando atendimento',
    TRIAGE: 'Em análise',
    IN_PROGRESS: 'Em atendimento remoto',
    WAITING_CUSTOMER: 'Aguardando retorno',
    RESOLVED: 'Finalizado',
    CLOSED: 'Encerrado'
  };

  const completedTickets = myTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const isDone = (t) => t.status === 'RESOLVED' || t.status === 'CLOSED';
  const openTickets = myTickets.filter((t) => !isDone(t));
  const closedTickets = myTickets.filter(isDone);
  const unpaidClosedTickets = closedTickets.filter((t) => t.paymentStatus !== 'PAID');
  const pendingRating = closedTickets.find((t) => !t.techRating);
  const activeMethod = paymentMethods.find((pm) => pm.id === selectedMethodId) || paymentMethods[0] || null;

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('O comprovante deve ter no máximo 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptFileData(String(reader.result || ''));
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleReportPayment = async () => {
    if (!justClosed) return;
    setReportingPayment(true);
    try {
      const updated = await api.updateTicketPayment(
        justClosed.id,
        'REPORTED',
        activeMethod?.id,
        receiptFileData || null,
        receiptFileName || null
      );
      setJustClosed(updated);
      setReceiptFileData('');
      setReceiptFileName('');
      if (customerUser?.id) await loadCustomerData(customerUser.id);
    } finally {
      setReportingPayment(false);
    }
  };
  const totalPaid = closedTickets
    .filter((t) => t.paymentStatus === 'PAID')
    .reduce((acc, t) => acc + Number(t.estimatedPrice || 0), 0);
  const totalPendingPayment = unpaidClosedTickets
    .reduce((acc, t) => acc + Number(t.estimatedPrice || 0), 0);
  const totalOpen = openTickets.reduce((acc, t) => acc + Number(t.estimatedPrice || 0), 0);
  const steps = [
    { key: 'NEW', label: 'Aberto' },
    { key: 'TRIAGE', label: 'Em análise' },
    { key: 'IN_PROGRESS', label: 'Em atendimento' },
    { key: 'RESOLVED', label: 'Finalizado' }
  ];
  const stepIndex = (status) => {
    if (status === 'WAITING_CUSTOMER') return 2;
    if (status === 'CLOSED') return 3;
    return Math.max(0, steps.findIndex((s) => s.key === status));
  };
  const hourlyService = services.find((s) => s.billingModel === 'HOURLY');
  const currentChecklistQuestions = getChecklistForService(selectedService);

  const money = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
  const isPaused = liveSession?.status === 'PAUSED';

  const renderServiceRow = (svc, clickable) => {
    const isSel = clickable && selectedService?.id === svc.id;
    return (
      <li
        key={svc.id}
        className={`cp-row${clickable ? ' clickable' : ''}${isSel ? ' selected' : ''}`}
        onClick={clickable ? () => handleSelectServiceCard(svc) : undefined}
      >
        <div>
          <h4>{svc.name}</h4>
          <p>{svc.description}</p>
        </div>
        <div className="cp-price">
          <b>{money(svc.referencePrice)}</b>
          <small>{svc.billingModel === 'HOURLY' ? 'por hora' : 'por serviço'}</small>
        </div>
      </li>
    );
  };

  return (
    <div className="cp">
      <header className="cp-header">
        <div className="cp-brand">
          <img src="/assets/logo-it-desk.png" alt="IT DESK" />
          <span>Central de Atendimento</span>
        </div>
        {customerUser && (
          <div className="cp-user">
            <div style={{ textAlign: 'right' }}>
              {customerUser.fullName}
              <small>{customerUser.email}</small>
            </div>
            <button className="cp-link" onClick={handleLogout}>
              <LogOut size={13} /> Sair
            </button>
          </div>
        )}
      </header>

      {customerUser && liveSession && (
        <div className={`cp-live${isPaused ? ' paused' : ''}`}>
          <div>
            <strong>{isPaused ? 'Acesso remoto pausado pelo técnico' : 'Acesso remoto em andamento'}</strong>
            <span>
              {isPaused ? 'O cronômetro está pausado.' : `${liveSession.ticketCode} — ${liveSession.ticketTitle}`}
            </span>
          </div>
          <div className="cp-live-timer">{formatTimer(liveSeconds)}</div>
        </div>
      )}

      <main className="cp-main">
        {!customerUser ? (
          /* VISITANTE */
          <div className="cp-grid">
            <section>
              <div className="cp-eyebrow">IT DESK · Suporte remoto</div>
              <h1 className="cp-h1">Suporte técnico<br />direto com o especialista.</h1>
              <p className="cp-sub" style={{ marginBottom: 28 }}>
                Consulte os serviços e valores praticados. Entre ou crie seu acesso para abrir um chamado.
              </p>

              {/* Como funciona: 3 passos numerados em texto corrido sem cards */}
              <div className="cp-how">
                <div className="cp-how-step">
                  <span className="cp-how-num">01 · CHAMADO</span>
                  <strong>Abra sua solicitação</strong>
                  <p>Escolha o serviço ou descreva o problema que está ocorrendo no equipamento.</p>
                </div>
                <div className="cp-how-step">
                  <span className="cp-how-num">02 · CONEXÃO</span>
                  <strong>Informe o ID AnyDesk</strong>
                  <p>O especialista conecta com a sua autorização. Nenhuma senha fica salva.</p>
                </div>
                <div className="cp-how-step">
                  <span className="cp-how-num">03 · TRANSPARÊNCIA</span>
                  <strong>Acompanhe em tempo real</strong>
                  <p>Converse pelo chat, veja o cronômetro ao vivo e pague via Pix ao finalizar.</p>
                </div>
              </div>

              <div className="cp-section-head">
                <h2 className="cp-h2">Serviços</h2>
                <span className="cp-status">Valores de referência</span>
              </div>
              {loadingCatalog && services.length === 0 ? (
                <div aria-busy="true">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="cp-skeleton-row">
                      <div style={{ flex: 1 }}>
                        <div className="cp-sk-bar" style={{ width: `${45 + n * 10}%` }} />
                        <div className="cp-sk-bar sub" style={{ width: `${65 + n * 6}%` }} />
                      </div>
                      <div style={{ width: 84 }}>
                        <div className="cp-sk-bar" style={{ width: '100%' }} />
                        <div className="cp-sk-bar sub" style={{ width: '70%', marginLeft: 'auto' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="cp-rows">{services.map((svc) => renderServiceRow(svc, false))}</ul>
              )}
            </section>

            <section className="cp-auth">
              <h2 className="cp-h2">{authMode === 'signup' ? 'Criar acesso' : 'Entrar'}</h2>
              <p className="cp-sub">
                {authMode === 'signup'
                  ? 'Seus dados ficam salvos para os próximos atendimentos.'
                  : 'Informe seu e-mail e senha cadastrados.'}
              </p>

              <div className="cp-tabs">
                <button type="button" className={`cp-tab${authMode === 'signup' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Criar conta</button>
                <button type="button" className={`cp-tab${authMode === 'login' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}>Já tenho conta</button>
              </div>

              {authError && <div className="cp-error">{authError}</div>}

              <form onSubmit={handleAuthSubmit} className="cp-form">
                {authMode === 'signup' && (
                  <>
                    <div>
                      <label className="cp-label">Nome completo</label>
                      <input className="cp-input" type="text" required placeholder="Seu nome"
                        value={authForm.fullName}
                        onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} />
                    </div>
                    <div className="cp-two">
                      <div>
                        <label className="cp-label">Telefone / WhatsApp</label>
                        <input className="cp-input" type="text" required placeholder="(11) 99999-9999"
                          value={authForm.phone}
                          onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="cp-label">Empresa (opcional)</label>
                        <input className="cp-input" type="text" placeholder="Nome da empresa"
                          value={authForm.companyName}
                          onChange={(e) => setAuthForm({ ...authForm, companyName: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="cp-label">E-mail</label>
                  <input className="cp-input" type="email" required placeholder="seu@email.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="cp-label">Senha</label>
                  <input className="cp-input" type="password" required placeholder="Mínimo 4 caracteres"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                </div>
                <button type="submit" disabled={authLoading} className="cp-btn" style={{ marginTop: 8 }}>
                  {authLoading ? 'Aguarde...' : authMode === 'signup' ? 'Continuar' : 'Entrar'}
                </button>
              </form>
            </section>
          </div>
        ) : (
          /* CLIENTE LOGADO */
          <>
            {/* ===== TELA: ATENDIMENTO FINALIZADO & PAGAMENTO PIX ===== */}
            {justClosed ? (
              <section className="cp-done">
                <button type="button" className="cp-back" onClick={goHome}>← Voltar ao início</button>
                <div className="cp-eyebrow">Chamado {justClosed.code}</div>
                <h1 className="cp-h1">Atendimento finalizado.</h1>
                <p className="cp-sub" style={{ marginBottom: 32 }}>
                  Confira o resumo do suporte e realize o pagamento via Pix abaixo.
                </p>

                <dl className="cp-summary">
                  <div><dt>Serviço</dt><dd>{justClosed.title}</dd></div>
                  <div><dt>Duração</dt><dd>{justClosed.totalSessionSeconds > 0 ? formatTimer(Number(justClosed.totalSessionSeconds)) : '—'}</dd></div>
                  <div><dt>Valor a pagar</dt><dd className="accent">{money(justClosed.estimatedPrice)}</dd></div>
                  {justClosed.resolutionSummary && (
                    <div className="wide"><dt>Serviço executado</dt><dd>{justClosed.resolutionSummary}</dd></div>
                  )}
                </dl>

                {justClosed.paymentStatus !== 'PAID' ? (
                  <section className="cp-pay">
                    <div className="cp-section-head">
                      <div>
                        <h2 className="cp-h2">Pagamento via Pix</h2>
                        <p className="cp-sub">Escaneie o QR Code ou use o código copia e cola no app do seu banco.</p>
                      </div>
                      <strong className="cp-pay-amount">{money(justClosed.estimatedPrice)}</strong>
                    </div>

                    {paymentMethods.length > 1 && (
                      <div className="cp-tabs" style={{ margin: '0 0 8px' }}>
                        {paymentMethods.map((pm) => (
                          <button key={pm.id} type="button"
                            className={`cp-tab${activeMethod?.id === pm.id ? ' active' : ''}`}
                            onClick={() => setSelectedMethodId(pm.id)}>{pm.label}</button>
                        ))}
                      </div>
                    )}

                    {activeMethod ? (
                      <PixPayment method={activeMethod} amount={justClosed.estimatedPrice} ticketCode={justClosed.code} />
                    ) : (
                      <div className="cp-pending" style={{ margin: '20px 0' }}>
                        <span>A chave Pix está sendo configurada pelo administrador. Você pode pagar depois pelo seu painel inicial.</span>
                      </div>
                    )}

                    {/* Anexo de Comprovante do Pix (Foto ou PDF) */}
                    <div style={{ margin: '20px 0 24px', paddingTop: 16, borderTop: '1px solid var(--cp-line)' }}>
                      <label className="cp-label">Comprovante do Pix (Foto ou PDF)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 16px',
                            border: '1px solid var(--cp-orange)',
                            color: 'var(--cp-orange)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {receiptFileName || justClosed.paymentReceiptName ? 'Trocar comprovante (Foto/PDF)' : '+ Anexar comprovante (Foto ou PDF)'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {(receiptFileName || justClosed.paymentReceiptName) && (
                          <span style={{ fontSize: 12.5, color: 'var(--cp-text)' }}>
                            Arquivo: <strong style={{ color: 'var(--cp-orange)' }}>{receiptFileName || justClosed.paymentReceiptName}</strong>
                          </span>
                        )}
                      </div>

                      {(receiptFileData || justClosed.paymentReceiptUrl) && (
                        <div style={{ marginTop: 12 }}>
                          {(receiptFileData || justClosed.paymentReceiptUrl).startsWith('data:image/') ? (
                            <img
                              src={receiptFileData || justClosed.paymentReceiptUrl}
                              alt="Comprovante Pix"
                              style={{ maxHeight: 140, border: '1px solid var(--cp-line2)', display: 'block' }}
                            />
                          ) : (
                            <a
                              href={receiptFileData || justClosed.paymentReceiptUrl}
                              download={receiptFileName || justClosed.paymentReceiptName || 'comprovante-pix.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 12.5, color: 'var(--cp-orange)', textDecoration: 'underline' }}
                            >
                              Visualizar PDF do comprovante anexado
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {justClosed.paymentStatus === 'REPORTED' && !receiptFileData ? (
                      <div className="cp-pending" style={{ marginBottom: 0 }}>
                        <span>
                          Pagamento informado{justClosed.paymentReceiptName ? ` (comprovante: ${justClosed.paymentReceiptName})` : ''}! Aguardando confirmação do técnico.
                        </span>
                        <button type="button" className="cp-btn-ghost" onClick={goHome}>Voltar ao início →</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="cp-btn" disabled={reportingPayment} onClick={handleReportPayment}>
                          {reportingPayment
                            ? 'Enviando...'
                            : receiptFileData
                              ? 'Enviar comprovante e confirmar pagamento'
                              : 'Já fiz o pagamento'}
                        </button>
                        <button type="button" className="cp-btn-ghost" onClick={goHome}>
                          Pagar depois (voltar ao início)
                        </button>
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="cp-pending" style={{ marginBottom: 32 }}>
                    <span>Pagamento confirmado pelo técnico. Obrigado!</span>
                  </div>
                )}

                {!justClosed.techRating ? (
                  <div className="cp-rating">
                    <h2 className="cp-h2">Como foi o atendimento?</h2>
                    <p className="cp-sub" style={{ marginBottom: 16 }}>Sua avaliação ajuda a manter a qualidade do suporte.</p>
                    <form onSubmit={handleSubmitRating} className="cp-form">
                      <div className="cp-two">
                        {[['Técnico', techRating, setTechRating], ['Sistema', systemRating, setSystemRating]].map(([lbl, val, setter]) => (
                          <div key={lbl}>
                            <label className="cp-label">{lbl}</label>
                            <div className="cp-stars">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} type="button" onClick={() => setter(n)}>
                                  <Star size={20} color="#ff6b00" fill={n <= val ? '#ff6b00' : 'transparent'} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <input className="cp-input" type="text" placeholder="Comentário opcional..."
                        value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <button type="submit" disabled={submittingRating} className="cp-btn">
                          {submittingRating ? 'Enviando...' : 'Enviar avaliação'}
                        </button>
                        <button type="button" className="cp-btn-ghost" onClick={goHome}>Avaliar depois</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button type="button" className="cp-btn" onClick={goHome}>Voltar ao início</button>
                )}
              </section>
            ) : view === 'new' ? (
              /* ===== TELA: NOVO CHAMADO ===== */
              <section className="cp-narrow">
                <button type="button" className="cp-back" onClick={goHome}>← Início</button>
                <div className="cp-eyebrow">Novo chamado</div>
                <h1 className="cp-h1" style={{ marginBottom: 28 }}>Como podemos ajudar?</h1>

                <div className="cp-section-head"><h2 className="cp-h2">Serviço</h2></div>
                <ul className="cp-rows" style={{ marginBottom: 32 }}>
                  {services.map((svc) => renderServiceRow(svc, true))}
                  <li
                    className={`cp-row clickable${selectedService === null ? ' selected' : ''}`}
                    onClick={() => handleSelectServiceCard(null)}
                  >
                    <div>
                      <h4>Outro problema / Suporte avulso</h4>
                      <p>Descreva livremente o que está acontecendo.</p>
                    </div>
                    <div className="cp-price"><small>Sob consulta</small></div>
                  </li>
                </ul>

                <form onSubmit={handleCreateSupportRequest} className="cp-form">
                  {selectedService && currentChecklistQuestions.length > 0 && (
                    <div className="cp-checklist">
                      <span className="cp-checklist-title">Sobre {selectedService.name}</span>
                      {currentChecklistQuestions.map((question, idx) => (
                        <div key={idx}>
                          <label className="cp-label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12.5, color: '#d4d4d4' }}>
                            {question}
                          </label>
                          <input className="cp-input" type="text" required placeholder="Sua resposta"
                            value={checklistAnswers[idx] || ''}
                            onChange={(e) => setChecklistAnswers({ ...checklistAnswers, [idx]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  )}

                  {!selectedService && (
                    <div>
                      <label className="cp-label">Assunto</label>
                      <input className="cp-input" type="text" required placeholder="Resumo do problema"
                        value={ticketForm.customSubject}
                        onChange={(e) => setTicketForm({ ...ticketForm, customSubject: e.target.value })} />
                    </div>
                  )}

                  <div>
                    <label className="cp-label">{selectedService ? 'Observações (opcional)' : 'Descrição'}</label>
                    <textarea className="cp-input" rows={3} required={!selectedService}
                      placeholder="Detalhe o que está ocorrendo..."
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <label className="cp-label" style={{ marginBottom: 0 }}>ID AnyDesk (opcional)</label>
                      <button
                        type="button"
                        className="cp-btn-ghost"
                        style={{ color: 'var(--cp-orange)', fontSize: 11.5 }}
                        onClick={() => setShowAnydeskHelp((v) => !v)}
                      >
                        {showAnydeskHelp ? 'Ocultar ajuda' : 'Onde encontro meu ID? · Baixar AnyDesk'}
                      </button>
                    </div>
                    <input className="cp-input" type="text" placeholder="000 000 000"
                      style={{ fontFamily: 'var(--font-mono)', marginTop: 6 }}
                      value={ticketForm.remoteAccessId}
                      onChange={(e) => setTicketForm({ ...ticketForm, remoteAccessId: e.target.value })} />
                    {showAnydeskHelp && (
                      <div className="cp-anydesk-help">
                        <strong>Como informar seu ID AnyDesk:</strong> Abra o aplicativo AnyDesk no computador e copie o número de 9 dígitos exibido em{' '}
                        <strong>"Este puesto de trabalho / Seu endereço"</strong> (ex.: <code>123 456 789</code>). Ainda não tem o programa?{' '}
                        <a href="https://anydesk.com/pt/downloads" target="_blank" rel="noopener noreferrer">
                          Baixar AnyDesk oficial →
                        </a>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={submittingTicket} className="cp-btn">
                    {submittingTicket ? 'Enviando...' : 'Abrir chamado'}
                  </button>
                </form>
              </section>
            ) : view === 'ticket' && activeTicket ? (
              /* ===== TELA: CHAMADO (CHAT) ===== */
              <section className="cp-narrow">
                <button type="button" className="cp-back" onClick={goHome}>← Início</button>
                <div className="cp-section-head" style={{ borderBottom: 'none' }}>
                  <div>
                    <div className="cp-eyebrow" style={{ fontFamily: 'var(--font-mono)' }}>{activeTicket.code}</div>
                    <h1 className="cp-h1" style={{ fontSize: 26, marginBottom: 0 }}>
                      {activeTicket.title}
                      {unread > 0 && <span className="cp-dot" />}
                    </h1>
                  </div>
                  <span className="cp-status">{statusLabels[activeTicket.status] || activeTicket.status}</span>
                </div>

                <ol className="cp-steps" style={{ borderTop: '1px solid var(--cp-line)' }}>
                  {steps.map((s, i) => {
                    const cur = stepIndex(activeTicket.status);
                    return (
                      <li key={s.key} className={i < cur ? 'done' : i === cur ? 'current' : ''}>
                        <span>{i === cur && activeTicket.status === 'WAITING_CUSTOMER' ? 'Aguardando você' : s.label}</span>
                      </li>
                    );
                  })}
                </ol>

                <div className="cp-chat" style={{ borderTop: 'none' }}>
                  <div className="cp-msgs">
                    {messages.length === 0 ? (
                      <div className="cp-empty">Nenhuma mensagem ainda.</div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.authorRole === 'CUSTOMER';
                        return (
                          <div key={m.id} className={`cp-msg${isMe ? ' me' : ''}`}>
                            <div className="cp-msg-head">
                              <b>{isMe ? 'Você' : m.authorName}</b>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="cp-msg-body">{m.message}</div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {isDone(activeTicket) ? (
                    <div className="cp-closed-note">Atendimento encerrado · somente leitura</div>
                  ) : (
                    <form onSubmit={handleSendChatMessage} className="cp-composer">
                      <input className="cp-input" type="text" placeholder="Escreva uma mensagem..."
                        value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ flex: 1 }} />
                      <button type="submit" disabled={sendingChat} className="cp-btn" style={{ padding: '10px 16px' }}>
                        <Send size={13} /> Enviar
                      </button>
                    </form>
                  )}
                </div>
              </section>
            ) : (
              /* ===== TELA: INÍCIO ===== */
              <>
                <div className="cp-home-head">
                  <div>
                    <div className="cp-eyebrow">Olá, {customerUser.fullName?.split(' ')[0]}</div>
                    <h1 className="cp-h1" style={{ marginBottom: 0 }}>
                      Central do cliente{customerUser.companyName ? ` · ${customerUser.companyName}` : ''}
                    </h1>
                  </div>
                  <button type="button" className="cp-btn" onClick={openNewTicket}>+ Abrir novo chamado</button>
                </div>

                {/* Como funciona (3 passos numerados em texto corrido sem cards) */}
                <div className="cp-how">
                  <div className="cp-how-step">
                    <span className="cp-how-num">01 · CHAMADO</span>
                    <strong>Abra sua solicitação</strong>
                    <p>Escolha o serviço ou descreva o problema que está ocorrendo no equipamento.</p>
                  </div>
                  <div className="cp-how-step">
                    <span className="cp-how-num">02 · CONEXÃO</span>
                    <strong>Informe o ID AnyDesk</strong>
                    <p>O especialista conecta com a sua autorização. Nenhuma senha fica salva.</p>
                  </div>
                  <div className="cp-how-step">
                    <span className="cp-how-num">03 · TRANSPARÊNCIA</span>
                    <strong>Acompanhe em tempo real</strong>
                    <p>Converse pelo chat, veja o cronômetro ao vivo e pague via Pix ao finalizar.</p>
                  </div>
                </div>

                <div className="cp-stats">
                  <div className="cp-stat">
                    <label>Atendimentos</label>
                    <strong>{completedTickets.length}<span style={{ color: 'var(--cp-dim)' }}> / {myTickets.length}</span></strong>
                  </div>
                  <div className="cp-stat">
                    <label>Pago / concluído</label>
                    <strong>{money(totalPaid)}</strong>
                  </div>
                  <div
                    className="cp-stat"
                    onClick={unpaidClosedTickets.length > 0 ? () => openPaymentScreen(unpaidClosedTickets[0]) : undefined}
                    style={{ cursor: unpaidClosedTickets.length > 0 ? 'pointer' : 'default' }}
                    title={unpaidClosedTickets.length > 0 ? 'Clique para abrir o pagamento via Pix' : undefined}
                  >
                    <label style={{ color: unpaidClosedTickets.length > 0 ? 'var(--cp-orange)' : undefined }}>
                      Pagamento pendente {unpaidClosedTickets.length > 0 ? '· Pagar →' : ''}
                    </label>
                    <strong style={{ color: unpaidClosedTickets.length > 0 ? 'var(--cp-orange)' : 'var(--cp-dim)' }}>
                      {money(totalPendingPayment)}
                    </strong>
                  </div>
                  <div className="cp-stat">
                    <label>Em aberto (estimado)</label>
                    <strong style={{ color: totalOpen > 0 ? 'var(--cp-text)' : 'var(--cp-dim)' }}>
                      {money(totalOpen)}
                    </strong>
                  </div>
                  {hourlyService && (
                    <div className="cp-stat">
                      <label>Hora técnica</label>
                      <strong className="accent">{money(hourlyService.referencePrice)}/h</strong>
                    </div>
                  )}
                </div>

                {/* Pagamentos Pendentes (Atendimentos finalizados aguardando Pix) */}
                {unpaidClosedTickets.length > 0 && (
                  <section style={{ marginBottom: 48 }}>
                    <div className="cp-section-head">
                      <div>
                        <h2 className="cp-h2" style={{ color: 'var(--cp-orange)' }}>Pagamento pendente</h2>
                        <p className="cp-sub">Clique em um atendimento finalizado abaixo para abrir o QR Code e a chave Pix.</p>
                      </div>
                      <span className="cp-status" style={{ color: 'var(--cp-orange)' }}>
                        {unpaidClosedTickets.length} pendente(s)
                      </span>
                    </div>
                    <ul className="cp-rows">
                      {unpaidClosedTickets.map((t) => (
                        <li key={t.id} className="cp-row clickable selected" onClick={() => openPaymentScreen(t)}>
                          <div>
                            <h4><span className="cp-code">{t.code}</span>{t.title}</h4>
                            <p>
                              Finalizado em {new Date(t.resolvedAt || t.createdAt).toLocaleDateString('pt-BR')}
                              {t.paymentStatus === 'REPORTED' ? ' · Pagamento informado (aguardando confirmação)' : ' · Aguardando pagamento via Pix'}
                            </p>
                          </div>
                          <div className="cp-price">
                            <b>{money(t.estimatedPrice)}</b>
                            <small style={{ color: 'var(--cp-orange)', fontWeight: 600 }}>
                              {t.paymentStatus === 'REPORTED' ? 'Ver QR Code Pix →' : 'Pagar com Pix →'}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Chamados em andamento */}
                <section style={{ marginBottom: 56 }}>
                  <div className="cp-section-head">
                    <h2 className="cp-h2">Em andamento</h2>
                    <span className="cp-status">{openTickets.length} chamado(s)</span>
                  </div>
                  {openTickets.length === 0 ? (
                    <div className="cp-empty" style={{ textAlign: 'left', padding: '24px 0', margin: 0 }}>
                      Nenhum chamado em aberto. Precisa de ajuda?{' '}
                      <button type="button" className="cp-btn-ghost" style={{ color: 'var(--cp-orange)' }} onClick={openNewTicket}>
                        Abrir chamado →
                      </button>
                    </div>
                  ) : (
                    <ul className="cp-rows">
                      {openTickets.map((t) => (
                        <li key={t.id} className="cp-row clickable" onClick={() => openTicket(t)}>
                          <div>
                            <h4><span className="cp-code">{t.code}</span>{t.title}</h4>
                            <p>Aberto em {new Date(t.createdAt).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="cp-price">
                            <span className="cp-status" style={{ color: 'var(--cp-orange)' }}>{statusLabels[t.status] || t.status}</span>
                            <small style={{ display: 'block', marginTop: 4 }}>Abrir conversa →</small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {pendingRating && (
                  <div className="cp-pending">
                    <span>Você ainda não avaliou o atendimento <b>{pendingRating.code}</b>.</span>
                    <button type="button" className="cp-btn-ghost" style={{ color: 'var(--cp-orange)' }}
                      onClick={() => openPaymentScreen(pendingRating)}>Avaliar agora →</button>
                  </div>
                )}

                {/* Histórico */}
                <section>
                  <div className="cp-section-head" style={{ borderBottom: 'none' }}>
                    <div>
                      <h2 className="cp-h2">Histórico</h2>
                      <p className="cp-sub">Atendimentos concluídos na sua conta.</p>
                    </div>
                  </div>
                  {closedTickets.length === 0 ? (
                    <div className="cp-empty" style={{ borderTop: '1px solid var(--cp-line)' }}>
                      Nenhum atendimento concluído até o momento.
                    </div>
                  ) : (
                    <div className="cp-table-wrap">
                      <table className="cp-table">
                        <thead>
                          <tr>
                            <th>Código</th><th>Data</th><th>Serviço</th>
                            <th>Pagamento</th><th className="num">Duração</th><th className="num">Valor</th><th />
                          </tr>
                        </thead>
                        <tbody>
                          {closedTickets.map((t) => {
                            const mins = Math.max(1, Math.round(Number(t.totalSessionSeconds || 0) / 60));
                            const isPaid = t.paymentStatus === 'PAID';
                            const isReported = t.paymentStatus === 'REPORTED';
                            return (
                              <tr key={t.id}>
                                <td className="mono" data-label="Código">{t.code}</td>
                                <td data-label="Data" style={{ whiteSpace: 'nowrap', color: 'var(--cp-muted)' }}>
                                  {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="svc-cell" data-label="Serviço">
                                  <span>{t.title}</span>
                                  <small>
                                    {t.resolutionSummary || 'Atendimento concluído.'}
                                    {t.techRating ? ` · Avaliação: técnico ${t.techRating}/5, sistema ${t.systemRating}/5` : ''}
                                  </small>
                                </td>
                                <td data-label="Pagamento">
                                  <span className="cp-status" style={{ color: isPaid ? 'var(--cp-muted)' : 'var(--cp-orange)' }}>
                                    {isPaid ? 'Pago' : isReported ? 'Em confirmação' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="num" data-label="Duração">{t.totalSessionSeconds > 0 ? `${mins} min` : '—'}</td>
                                <td className="num" data-label="Valor" style={{ fontWeight: 600 }}>{money(t.estimatedPrice)}</td>
                                <td className="actions">
                                  {!isPaid && (
                                    <button type="button" className="cp-btn-ghost" style={{ color: 'var(--cp-orange)', fontWeight: 600 }}
                                      onClick={() => openPaymentScreen(t)}>
                                      Pagar Pix
                                    </button>
                                  )}
                                  <button type="button" className="cp-btn-ghost" onClick={() => openTicket(t)}>Ver conversa</button>
                                  <button type="button" className="cp-btn-ghost" onClick={() => handleReopenFromHistory(t)}>
                                    <RefreshCw size={12} /> Solicitar novamente
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      {/* Rodapé institucional com dados operacionais e compromisso de privacidade */}
      <footer className="cp-footer">
        <dl className="cp-footer-cols" style={{ margin: 0 }}>
          <div className="cp-footer-col">
            <dt>IT DESK · Suporte Técnico</dt>
            <dd>
              Plataforma de atendimento remoto especializado e gestão de chamados.<br />
              IT THECNICA · Soluções em TI
            </dd>
          </div>
          <div className="cp-footer-col">
            <dt>Horário de Atendimento</dt>
            <dd>
              Segunda a Sexta · 08h às 18h<br />
              Sábados e plantão sob agendamento
            </dd>
          </div>
          <div className="cp-footer-col">
            <dt>Canais de Contato</dt>
            <dd>
              Atendimento via chat na plataforma<br />
              Suporte e cobrança via WhatsApp
            </dd>
          </div>
          <div className="cp-footer-col">
            <dt>Privacidade &amp; Segurança</dt>
            <dd>
              Toda sessão remota exige sua autorização e é auditada com cronômetro oficial. <strong>Nunca armazenamos senhas ou acessos desassistidos do AnyDesk.</strong>
            </dd>
          </div>
        </dl>

        <div className="cp-footer-bottom">
          <span>© {new Date().getFullYear()} IT DESK — Todos os direitos reservados a Daniel Wallans · CEO IT THECNICA.</span>
          <span>Conexão segura · Pagamento via Pix auditado</span>
        </div>
      </footer>
    </div>
  );
}
