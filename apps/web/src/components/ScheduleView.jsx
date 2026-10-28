import React from 'react';
import { Calendar, Monitor, Plus } from 'lucide-react';

export default function ScheduleView({ tickets = [], onOpenNewTicket, onStartSession }) {
  const pendingCount = tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Editorial */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            OPERAÇÃO TÉCNICA • IT ONE
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Agenda & Janelas de Atendimento
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <Calendar size={14} color="var(--orange)" />
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <button onClick={onOpenNewTicket} className="f-btn-primary">
            <Plus size={14} /> Agendar Atendimento
          </button>
        </div>
      </div>

      {/* Faixa Horizontal de Resumo (Sem Cards) */}
      <div className="adm-stats-strip">
        <div className="adm-stat-item">
          <span className="adm-stat-label">Registros na Agenda</span>
          <span className="adm-stat-value">{tickets.length}</span>
          <span className="adm-stat-sub">Sincronizado com Supabase</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">Pendentes Hoje</span>
          <span className="adm-stat-value" style={{ color: pendingCount > 0 ? 'var(--orange)' : 'var(--text-white)' }}>
            {pendingCount}
          </span>
          <span className="adm-stat-sub">Aguardando execução</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">Disponibilidade</span>
          <span className="adm-stat-value">{pendingCount === 0 ? 'LIVRE' : 'ATIVA'}</span>
          <span className="adm-stat-sub">Gateway AnyDesk pronto</span>
        </div>
      </div>

      {/* Linha do Tempo Plana */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Linha do Tempo de Atendimentos
          </h2>
          <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Horário de Brasília (UTC-3)
          </span>
        </div>

        <div className="adm-row-list">
          {tickets.length === 0 ? (
            <div style={{ padding: '32px 0', color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid var(--border-light)' }}>
              Nenhum atendimento agendado no momento.
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="adm-row-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '170px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800, color: 'var(--orange)' }}>
                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {t.code}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                    {t.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t.customerName} {t.customerEmail ? `• ${t.customerEmail}` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                  <Monitor size={13} color="var(--orange)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                    {t.remoteAccessId || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '120px' }}>
                  {t.status !== 'RESOLVED' && t.status !== 'IN_PROGRESS' ? (
                    <button
                      onClick={() => onStartSession(t.id)}
                      className="f-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                      Conectar
                    </button>
                  ) : (
                    <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: t.status === 'IN_PROGRESS' ? 'var(--orange)' : 'var(--text-tertiary)' }}>
                      {t.status === 'IN_PROGRESS' ? 'EM CURSO' : 'CONCLUÍDO'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
