import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Play, 
  Monitor, 
  Trash2
} from 'lucide-react';

export default function TicketsTable({ 
  tickets, 
  initialFilter = 'ALL',
  onSelectTicket, 
  onOpenNewTicketModal, 
  onStartSession,
  onDeleteTicket
}) {
  const [filterStatus, setFilterStatus] = useState(initialFilter || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialFilter) {
      setFilterStatus(initialFilter);
    }
  }, [initialFilter]);

  const openQueueTickets = tickets.filter(t => t.status === 'NEW' || t.status === 'TRIAGE' || t.status === 'WAITING_APPROVAL');

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'OPEN') {
      if (t.status !== 'NEW' && t.status !== 'TRIAGE' && t.status !== 'WAITING_APPROVAL') return false;
    } else if (filterStatus !== 'ALL') {
      if (t.status !== filterStatus) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (t.code || '').toLowerCase().includes(q);
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchCustomer = (t.customerName || '').toLowerCase().includes(q);
      const matchAnydesk = t.remoteAccessId && t.remoteAccessId.toLowerCase().includes(q);
      return matchCode || matchTitle || matchCustomer || matchAnydesk;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Editorial */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            CENTRAL OPERACIONAL • IT DESK
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Fila de Chamados & Despacho Remoto
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '460px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #262626',
            padding: '6px 2px',
            flex: '1 1 200px'
          }}>
            <Search size={14} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Buscar chamado, cliente, AnyDesk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-white)',
                outline: 'none',
                padding: 0,
                fontSize: '13px',
                width: '100%'
              }}
            />
          </div>

          <button onClick={onOpenNewTicketModal} className="f-btn-primary">
            <Plus size={14} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* Abas de Filtro Planas + Tabela */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div className="adm-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `Todos (${tickets.length})` },
              { id: 'OPEN', label: `Fila em Aberto (${openQueueTickets.length})` },
              { id: 'IN_PROGRESS', label: `Em Atendimento (${tickets.filter(t => t.status === 'IN_PROGRESS').length})` },
              { id: 'WAITING_APPROVAL', label: `Aprovação (${tickets.filter(t => t.status === 'WAITING_APPROVAL').length})` },
              { id: 'RESOLVED', label: `Concluídos (${tickets.filter(t => t.status === 'RESOLVED').length})` }
            ].map(tab => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`f-tab-pill ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', paddingRight: '4px' }}>
            {filteredTickets.length} / {tickets.length} exibidos
          </span>
        </div>

        {filteredTickets.length === 0 ? (
          <div style={{ padding: '40px 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                Nenhum chamado encontrado neste filtro.
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Alterne para &ldquo;Todos&rdquo; ou registre um novo chamado manualmente.
              </p>
            </div>
            {filterStatus !== 'ALL' && (
              <button onClick={() => setFilterStatus('ALL')} className="f-btn-secondary">
                Exibir Todos
              </button>
            )}
          </div>
        ) : (
          <table className="f-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Código</th>
                <th>Solicitação & Cliente</th>
                <th style={{ width: '180px' }}>Serviço</th>
                <th style={{ width: '140px' }}>AnyDesk ID</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '120px' }}>Valor</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => onSelectTicket(t)}>
                  <td data-label="Código" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--orange)' }}>
                    {t.code}
                  </td>

                  <td className="m-full">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {t.customerName} {t.customerEmail ? `• ${t.customerEmail}` : ''}
                      </span>
                    </div>
                  </td>

                  <td data-label="Serviço" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {t.serviceName || 'Suporte Remoto'}
                  </td>

                  <td data-label="AnyDesk ID">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Monitor size={13} color="var(--orange)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                        {t.remoteAccessId || '—'}
                      </span>
                    </div>
                  </td>

                  <td data-label="Status">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`status-dot ${
                        t.status === 'IN_PROGRESS' ? 'status-dot-active' :
                        t.status === 'WAITING_APPROVAL' ? 'status-dot-waiting' : 
                        t.status === 'NEW' ? 'status-dot-active' : 'status-dot-neutral'
                      }`} />
                      <span style={{ 
                        fontSize: '12px', 
                        color: t.status === 'IN_PROGRESS' || t.status === 'NEW' ? 'var(--orange)' : 'var(--text-secondary)', 
                        fontWeight: t.status === 'IN_PROGRESS' || t.status === 'NEW' ? 700 : 500 
                      }}>
                        {t.status === 'IN_PROGRESS' ? 'Em Atendimento' :
                         t.status === 'NEW' ? 'Novo na Fila' :
                         t.status === 'WAITING_APPROVAL' ? 'Aprovação' : 'Concluído'}
                      </span>
                    </div>
                  </td>

                  <td data-label="Valor" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                    R$ {Number(t.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                  </td>

                  <td className="m-actions" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {t.status !== 'IN_PROGRESS' && t.status !== 'RESOLVED' && (
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onStartSession(t.id); 
                          }}
                          className="f-btn-primary"
                          style={{ padding: '6px 12px', fontSize: '11px', flex: 1, justifyContent: 'center' }}
                        >
                          <Play size={11} /> Atender
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectTicket(t); }}
                        className="f-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px', flex: 1, justifyContent: 'center' }}
                      >
                        Abrir Chat
                      </button>
                      {onDeleteTicket && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTicket(t.id);
                          }}
                          className="f-btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', color: '#fca5a5' }}
                          title="Excluir chamado"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
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
