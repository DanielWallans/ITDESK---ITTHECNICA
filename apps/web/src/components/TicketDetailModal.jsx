import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Play, 
  Phone,
  CheckCircle2,
  Star,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';

export default function TicketDetailModal({ 
  ticket, 
  onClose, 
  onStatusChange, 
  onStartSession,
  adminUser
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [resolutionText, setResolutionText] = useState(ticket?.resolutionSummary || '');
  const [savingResolution, setSavingResolution] = useState(false);

  useEffect(() => {
    if (ticket) {
      setResolutionText(ticket.resolutionSummary || '');
      loadMessages();
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [ticket]);

  const loadMessages = async () => {
    const msgs = await api.getMessages(ticket.id, 'TECHNICIAN');
    setMessages(msgs);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await api.addMessage(ticket.id, newMessage, isInternalNote, adminUser?.id || null);
    setNewMessage('');
    loadMessages();
  };

  const handleFinalizeTicket = async () => {
    setSavingResolution(true);
    await onStatusChange(ticket.id, 'RESOLVED', resolutionText.trim() || 'Atendimento remoto concluído com sucesso.');
    setSavingResolution(false);
  };

  const displayedMessages = messages.filter(m => {
    if (activeTab === 'INTERNAL') return m.internal;
    return true;
  });

  const cleanWhatsApp = (ticket.customerPhone || '').replace(/\D/g, '');

  return (
    <div className="f-modal-overlay" onClick={onClose}>
      <div 
        className="f-modal-box" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--orange)'
            }}>
              {ticket.code}
            </span>
            <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-light)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)' }}>
              {ticket.title}
            </span>
          </div>

          <button onClick={onClose} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Painel Esquerdo: Metadados, Checklist, Resumo de Resolução & Avaliação */}
          <div style={{
            width: '320px',
            backgroundColor: 'var(--bg-inner)',
            borderRight: '1px solid var(--border-light)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status do Chamado
              </span>
              <select
                value={ticket.status}
                onChange={(e) => onStatusChange(ticket.id, e.target.value, resolutionText)}
                className="f-input"
                style={{ width: '100%', fontWeight: 600 }}
              >
                <option value="NEW">Novo</option>
                <option value="TRIAGE">Em Triagem</option>
                <option value="IN_PROGRESS">Em Andamento (Remoto)</option>
                <option value="WAITING_CUSTOMER">Aguardando Cliente</option>
                <option value="WAITING_APPROVAL">Aguardando Aprovação</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="RESOLVED">Resolvido / Finalizado</option>
                <option value="CLOSED">Encerrado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            {/* AnyDesk ID & Acesso */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Acesso AnyDesk
                </span>
                <span className="status-dot status-dot-active" />
              </div>

              <div style={{
                backgroundColor: 'var(--bg-inner)',
                padding: '8px',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-white)',
                textAlign: 'center'
              }}>
                {ticket.remoteAccessId || 'Não informado'}
              </div>

              {ticket.status !== 'IN_PROGRESS' && (
                <button 
                  onClick={() => onStartSession(ticket.id)}
                  className="f-btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '7px 0', fontSize: '12px' }}
                >
                  <Play size={12} fill="#fff" /> Iniciar Sessão Remota
                </button>
              )}
            </div>

            {/* Resumo do que foi feito (salvo no Card do Perfil do Cliente) */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase' }}>
                O que foi feito (Visível no Perfil do Cliente)
              </span>
              <textarea
                rows={2}
                placeholder="Ex: Instalado driver da impressora Epson L3250 e compartilhado na rede..."
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="f-input"
                style={{ fontSize: '12px' }}
              />
              <button
                type="button"
                disabled={savingResolution}
                onClick={handleFinalizeTicket}
                className="f-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '7px', fontSize: '11.5px' }}
              >
                <CheckCircle2 size={13} />
                {savingResolution ? 'Salvando...' : 'Finalizar & Salvar no Perfil do Cliente'}
              </button>
            </div>

            {/* Avaliação enviada pelo Cliente (se já avaliou) */}
            {(ticket.techRating || ticket.systemRating) && (
              <div style={{
                backgroundColor: 'rgba(255, 94, 0, 0.08)',
                border: '1px solid rgba(255, 94, 0, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase' }}>
                  Avaliação do Cliente
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-white)' }}>
                  <span>Técnico:</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>{'★'.repeat(ticket.techRating || 0)} ({ticket.techRating}/5)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-white)' }}>
                  <span>Sistema:</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>{'★'.repeat(ticket.systemRating || 0)} ({ticket.systemRating}/5)</span>
                </div>
                {ticket.ratingComment && (
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                    "{ticket.ratingComment}"
                  </p>
                )}
              </div>
            )}

            {/* Dados do Solicitante */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cliente:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-white)', marginTop: '2px' }}>{ticket.customerName}</p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{ticket.customerEmail}</p>
                {ticket.customerPhone && (
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{ticket.customerPhone}</p>
                )}
                {cleanWhatsApp.length >= 10 && (
                  <a
                    href={`https://wa.me/55${cleanWhatsApp}?text=${encodeURIComponent(`Olá ${ticket.customerName}, falo da IT THECNICA referente ao chamado ${ticket.code} (${ticket.title}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '8px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(34, 197, 94, 0.14)',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      color: '#4ade80',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={11} /> Chamar no WhatsApp
                  </a>
                )}
              </div>

              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Serviço & Valor:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {ticket.serviceName} • R$ {Number(ticket.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Respostas do Checklist do Cliente */}
              {Array.isArray(ticket.checklistData) && ticket.checklistData.length > 0 && (
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--orange)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckSquare size={11} /> Checklist Respondido:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    {ticket.checklistData.map((item, i) => (
                      <div key={i} style={{ fontSize: '11.5px' }}>
                        <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>{item.question}</span>
                        <strong style={{ color: 'var(--text-white)' }}>{item.answer}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descrição:</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5, background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </p>
              </div>
            </div>
          </div>

          {/* Painel Direito: Chat em Tempo Real com o Cliente & Notas Internas */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'var(--bg-card)' }}>
            {/* Abas */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`f-tab-pill ${activeTab === 'ALL' ? 'active' : ''}`}
                >
                  Chat com o Cliente ({messages.filter(m => !m.internal).length})
                </button>
                <button
                  onClick={() => setActiveTab('INTERNAL')}
                  className={`f-tab-pill ${activeTab === 'INTERNAL' ? 'active' : ''}`}
                >
                  Notas Técnicas ({messages.filter(m => m.internal).length})
                </button>
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Sincronizado em tempo real com a página do cliente
              </span>
            </div>

            {/* Lista de Mensagens */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {displayedMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                  Nenhuma mensagem neste chamado ainda. Digite abaixo para enviar ao cliente.
                </div>
              ) : (
                displayedMessages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxWidth: '85%',
                      alignSelf: m.authorRole === 'CUSTOMER' ? 'flex-start' : 'flex-end',
                      backgroundColor: m.internal 
                        ? 'rgba(255, 94, 0, 0.08)' 
                        : (m.authorRole === 'CUSTOMER' ? 'var(--bg-inner)' : 'rgba(255, 94, 0, 0.14)'),
                      border: '1px solid',
                      borderColor: m.internal
                        ? 'rgba(255, 94, 0, 0.3)'
                        : (m.authorRole === 'CUSTOMER' ? 'var(--border-light)' : 'rgba(255, 94, 0, 0.35)'),
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: m.internal ? 'var(--orange)' : 'var(--text-white)' }}>
                        {m.authorRole === 'CUSTOMER' ? `${m.authorName} (Cliente)` : `${m.authorName}`} {m.internal && '• Nota Técnica'}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {m.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Formulário de Envio */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-inner)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: isInternalNote ? 'var(--orange)' : 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  id="internalCheck"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                <label htmlFor="internalCheck" style={{ cursor: 'pointer' }}>
                  Marcar como Nota Técnica IT THECNICA (invisível para o cliente)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder={isInternalNote ? "Escreva nota técnica interna..." : "Digite uma mensagem para o cliente (ele recebe na hora na página dele)..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="f-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="f-btn-primary">
                  <Send size={13} /> Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
