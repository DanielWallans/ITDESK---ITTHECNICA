import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  Monitor, 
  RotateCw,
  Search,
  Play,
  Pause,
  Copy,
  Check
} from 'lucide-react';

export default function DashboardView({ 
  summary, 
  tickets, 
  activeSession,
  onSelectTicket, 
  onStartSession,
  onPauseSession,
  onResumeSession,
  onOpenSessionManager,
  onNavigateToTickets,
  onNavigateTab
}) {
  const [elapsed, setElapsed] = useState(activeSession ? activeSession.currentTotalSeconds || 0 : 0);
  const [copiedAnydesk, setCopiedAnydesk] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const [recentStatusFilter, setRecentStatusFilter] = useState('ALL');

  useEffect(() => {
    if (activeSession) {
      setElapsed(activeSession.currentTotalSeconds || 0);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.status]);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyAnyDesk = (id, e) => {
    e?.stopPropagation();
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedAnydesk(true);
    setTimeout(() => setCopiedAnydesk(false), 2000);
  };

  const openQueueTickets = tickets.filter(t => t.status === 'NEW' || t.status === 'TRIAGE' || t.status === 'WAITING_APPROVAL');
  const openCount = openQueueTickets.length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  const paidRevenue = tickets
    .filter(t => t.status !== 'CANCELLED' && t.paymentStatus === 'PAID')
    .reduce((acc, t) => acc + (Number(t.estimatedPrice) || 0), 0);
  const pendingRevenue = tickets
    .filter(t => t.status !== 'CANCELLED' && t.paymentStatus !== 'PAID')
    .reduce((acc, t) => acc + (Number(t.estimatedPrice) || 0), 0);
  const totalHoursWorked = summary?.totalMinutesWorked ? (summary.totalMinutesWorked / 60).toFixed(1) : '0.0';

  const filteredRecentTickets = tickets.filter(t => {
    if (recentStatusFilter !== 'ALL' && t.status !== recentStatusFilter) return false;
    if (recentSearch.trim()) {
      const q = recentSearch.toLowerCase();
      const matchCode = (t.code || '').toLowerCase().includes(q);
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchCustomer = (t.customerName || '').toLowerCase().includes(q);
      return matchCode || matchTitle || matchCustomer;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Cabeçalho Editorial */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '10.5px',
            fontWeight: 800,
            color: 'var(--orange)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em'
          }}>
            OPERAÇÃO TÉCNICA • IT ONE
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Visão Geral do Atendimento
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="f-btn-secondary" 
            onClick={() => window.location.reload()}
          >
            <RotateCw size={13} />
            <span>Atualizar</span>
          </button>
          <button 
            onClick={() => onNavigateToTickets('OPEN')} 
            className="f-btn-primary"
          >
            <span>Ver Fila de Atendimento</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Faixa de Sessão AnyDesk Ativa (Sem Card — Faixa Linear Direta) */}
      {activeSession && (
        <div 
          onClick={onOpenSessionManager}
          style={{
            borderTop: '2px solid var(--orange)',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'rgba(255, 107, 0, 0.05)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {activeSession.status === 'IN_PROGRESS' ? '● SESSÃO ANYDESK EM EXECUÇÃO' : '● SESSÃO PAUSADA'}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
                {activeSession.ticketCode} — {activeSession.customerName}
              </span>
            </div>

            <div style={{ height: '28px', width: '1px', backgroundColor: '#262626' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tempo Decorrido
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--orange)' }}>
                {formatTimer(elapsed)}
              </span>
            </div>

            <div style={{ height: '28px', width: '1px', backgroundColor: '#262626' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AnyDesk ID
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                  {activeSession.remoteAccessId || '—'}
                </span>
                {activeSession.remoteAccessId && (
                  <button
                    onClick={(e) => handleCopyAnyDesk(activeSession.remoteAccessId, e)}
                    style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    title="Copiar ID AnyDesk"
                  >
                    {copiedAnydesk ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
            {activeSession.status === 'IN_PROGRESS' ? (
              <button onClick={() => onPauseSession(activeSession.id)} className="f-btn-secondary">
                <Pause size={13} /> Pausar
              </button>
            ) : (
              <button onClick={() => onResumeSession(activeSession.id)} className="f-btn-primary">
                <Play size={13} /> Retomar
              </button>
            )}
            <button onClick={onOpenSessionManager} className="f-btn-primary">
              <span>Gerenciar Sessão</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Faixa Horizontal de Indicadores (Sem Cards — Divisórias Verticais igual ao /atendimento) */}
      <div className="adm-stats-strip">
        <div className="adm-stat-item" style={{ cursor: 'pointer' }} onClick={() => onNavigateToTickets('OPEN')}>
          <span className="adm-stat-label">Fila em Aberto</span>
          <span className="adm-stat-value" style={{ color: openCount > 0 ? 'var(--orange)' : 'var(--text-white)' }}>
            {openCount}
          </span>
          <span className="adm-stat-sub">
            {openCount > 0 ? 'Aguardando atendimento' : 'Nenhum na fila'}
          </span>
        </div>

        <div className="adm-stat-item" style={{ cursor: 'pointer' }} onClick={() => onNavigateToTickets('IN_PROGRESS')}>
          <span className="adm-stat-label">Em Atendimento</span>
          <span className="adm-stat-value">
            {inProgressCount}
          </span>
          <span className="adm-stat-sub">Sessões em curso</span>
        </div>

        <div className="adm-stat-item" style={{ cursor: 'pointer' }} onClick={() => onNavigateToTickets('RESOLVED')}>
          <span className="adm-stat-label">Concluídos</span>
          <span className="adm-stat-value">
            {resolvedCount}
          </span>
          <span className="adm-stat-sub">Chamados finalizados</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">Horas Técnicas</span>
          <span className="adm-stat-value">
            {totalHoursWorked}h
          </span>
          <span className="adm-stat-sub">Tempo auditado</span>
        </div>

        <div className="adm-stat-item" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('billing')}>
          <span className="adm-stat-label">Pago / Recebido</span>
          <span className="adm-stat-value">
            R$ {paidRevenue.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">Confirmado no caixa</span>
        </div>

        <div className="adm-stat-item" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('billing')}>
          <span className="adm-stat-label">Em Aberto / Cobrar</span>
          <span className="adm-stat-value" style={{ color: pendingRevenue > 0 ? 'var(--orange)' : 'var(--text-white)' }}>
            R$ {pendingRevenue.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">Estimado ou pendente</span>
        </div>
      </div>

      {/* Seção 1: Fila Imediata & Dispositivos AnyDesk (Linhas Horizontais Limpas) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Conexões AnyDesk & Fila Imediata
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {openQueueTickets.length} aguardando
            </span>
          </div>
          <button
            onClick={() => onNavigateToTickets('OPEN')}
            style={{ background: 'none', border: 'none', color: 'var(--orange)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Ver fila completa →
          </button>
        </div>

        <div className="adm-row-list">
          {openQueueTickets.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>
              Nenhum dispositivo aguardando conexão AnyDesk no momento. Quando um cliente abrir um chamado em <code>/atendimento</code>, ele aparecerá aqui imediatamente.
            </div>
          ) : (
            openQueueTickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="adm-row-item"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTicket(t)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--orange)' }}>
                    {t.code}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                      {t.customerName} — {t.title}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t.serviceName || 'Suporte Remoto'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Monitor size={13} color="var(--orange)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                      {t.remoteAccessId || 'Sem ID'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartSession(t.id);
                    }}
                    className="f-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                  >
                    <Play size={11} /> Iniciar Sessão
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção 2: Histórico e Chamados Recentes (Tabela Plana Editorial) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Histórico de Chamados
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {filteredRecentTickets.length} registro(s)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div className="adm-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'NEW', label: 'Novos' },
                { id: 'IN_PROGRESS', label: 'Em Curso' },
                { id: 'RESOLVED', label: 'Concluídos' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRecentStatusFilter(f.id)}
                  className={`f-tab-pill ${recentStatusFilter === f.id ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #262626',
              padding: '4px 2px',
              flex: '1 1 180px',
              maxWidth: '260px'
            }}>
              <Search size={13} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="Filtrar chamado ou cliente..."
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                style={{ background: 'none', border: 'none', padding: 0, outline: 'none', color: '#fff', fontSize: '12.5px', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {filteredRecentTickets.length === 0 ? (
          <div style={{ padding: '28px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Nenhum chamado registrado ainda.
          </div>
        ) : (
          <table className="f-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Solicitação & Cliente</th>
                <th>Data</th>
                <th>AnyDesk ID</th>
                <th>Valor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentTickets.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => onSelectTicket(t)}>
                  <td data-label="Código" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--orange)' }}>
                    {t.code}
                  </td>

                  <td className="m-full">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-white)' }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {t.customerName}
                      </span>
                    </div>
                  </td>

                  <td data-label="Data" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>

                  <td data-label="AnyDesk" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-white)' }}>
                    {t.remoteAccessId || '—'}
                  </td>

                  <td data-label="Valor" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                    R$ {Number(t.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                  </td>

                  <td data-label="Status">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`status-dot ${
                        t.status === 'IN_PROGRESS' ? 'status-dot-active' :
                        t.status === 'WAITING_APPROVAL' ? 'status-dot-waiting' : 'status-dot-neutral'
                      }`} />
                      <span style={{ fontSize: '12px', color: t.status === 'IN_PROGRESS' ? 'var(--orange)' : 'var(--text-secondary)', fontWeight: t.status === 'IN_PROGRESS' ? 700 : 500 }}>
                        {t.status === 'IN_PROGRESS' ? 'Em Atendimento' :
                         t.status === 'NEW' ? 'Novo' :
                         t.status === 'WAITING_APPROVAL' ? 'Orçamento' : 'Concluído'}
                      </span>
                    </div>
                  </td>

                  <td className="m-actions" style={{ textAlign: 'right' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onSelectTicket(t); }}
                      className="f-btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '11px', width: '100%', justifyContent: 'center' }}
                    >
                      Abrir Chamado / Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
