import React, { useState, useEffect } from 'react';
import { Search, X, Monitor, ArrowRight, Wrench, Users, TicketCheck } from 'lucide-react';

export default function CommandPaletteModal({ 
  isOpen, 
  onClose, 
  tickets, 
  onSelectTicket, 
  onNavigateTab 
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false); // toggle trigger in parent if needed
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter(t => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return t.code.toLowerCase().includes(q) ||
           t.title.toLowerCase().includes(q) ||
           t.customerName.toLowerCase().includes(q) ||
           (t.remoteAccessId && t.remoteAccessId.includes(q));
  });

  return (
    <div className="f-modal-overlay" onClick={onClose}>
      <div 
        className="f-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', backgroundColor: '#0d0f14' }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <Search size={18} color="var(--orange)" />
          <input
            autoFocus
            type="text"
            placeholder="Digite para buscar chamado, cliente, AnyDesk ID ou serviço..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '15px',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--font-main)'
            }}
          />
          <kbd style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            padding: '3px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '4px 8px' }}>
            Chamados & Clientes ({filteredTickets.length})
          </span>

          {filteredTickets.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              Nenhum chamado correspondente para "{query}"
            </div>
          ) : (
            filteredTickets.map(t => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTicket(t);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 94, 0, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 94, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TicketCheck size={14} color="var(--orange)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--orange)' }}>
                        {t.code}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)' }}>
                        {t.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {t.customerName} • AnyDesk: {t.remoteAccessId || '—'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Abrir</span>
                  <ArrowRight size={12} color="var(--text-tertiary)" />
                </div>
              </div>
            ))
          )}

          {/* Quick Nav Shortcuts */}
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '12px 8px 4px' }}>
            Atalhos do Sistema
          </span>

          <div
            onClick={() => { onNavigateTab('services'); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Wrench size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>Ir para Catálogo de Serviços Técnicos</span>
          </div>

          <div
            onClick={() => { onNavigateTab('billing'); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Users size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>Ir para Faturamento & Ordens de Cobrança</span>
          </div>
        </div>
      </div>
    </div>
  );
}
