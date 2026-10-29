import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  CheckCircle2, 
  Monitor, 
  Copy, 
  Check, 
  Clock, 
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function SessionManagerModal({ 
  session, 
  ticket,
  onClose, 
  onPause, 
  onResume, 
  onEnd 
}) {
  const [copied, setCopied] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(session?.notes || '');
  const [elapsed, setElapsed] = useState(session?.currentTotalSeconds ?? 0);
  const [isEnding, setIsEnding] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');

  useEffect(() => {
    if (!session) return;
    setElapsed(session.currentTotalSeconds ?? 0);

    if (session.status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.status, session?.currentTotalSeconds]);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyAnyDesk = () => {
    const idToCopy = session?.remoteAccessId || ticket?.remoteAccessId || '849 203 192';
    navigator.clipboard?.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmEndSession = () => {
    onEnd(session.id, resolutionSummary);
    onClose();
  };

  if (!session) return null;

  return (
    <div className="f-modal-overlay" onClick={onClose}>
      <div 
        className="f-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: session.status === 'IN_PROGRESS' ? 'var(--orange)' : 'var(--text-tertiary)',
              boxShadow: session.status === 'IN_PROGRESS' ? '0 0 10px var(--orange)' : 'none'
            }} />
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-white)' }}>
              Gerenciador de Atendimento Remoto AnyDesk
            </span>
          </div>

          <button onClick={onClose} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card Central com Cronômetro Oficial HUD */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 94, 0, 0.12) 0%, rgba(18, 20, 26, 0.95) 100%)',
            border: '1px solid rgba(255, 94, 0, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              CRONÔMETRO OFICIAL PERSISTIDO NO SERVIDOR
            </span>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '44px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(255, 94, 0, 0.4)'
            }}>
              {formatTimer(elapsed)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-dot ${session.status === 'IN_PROGRESS' ? 'status-dot-active' : 'status-dot-waiting'}`} />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: session.status === 'IN_PROGRESS' ? 'var(--orange)' : 'var(--text-secondary)' }}>
                {session.status === 'IN_PROGRESS' ? 'Atendimento em Execução' : 'Atendimento Pausado'}
              </span>
            </div>

            {/* Ações do Cronômetro */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%', justifyContent: 'center' }}>
              {session.status === 'IN_PROGRESS' ? (
                <button 
                  onClick={() => onPause(session.id)}
                  className="f-btn-secondary" 
                  style={{ minWidth: '140px', justifyContent: 'center' }}
                >
                  <Pause size={14} /> Pausar Sessão
                </button>
              ) : (
                <button 
                  onClick={() => onResume(session.id)}
                  className="f-btn-primary" 
                  style={{ minWidth: '140px', justifyContent: 'center' }}
                >
                  <Play size={14} fill="#fff" /> Retomar Sessão
                </button>
              )}

              <button 
                onClick={() => setIsEnding(true)}
                className="f-btn-secondary" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', minWidth: '140px', justifyContent: 'center' }}
              >
                <CheckCircle2 size={14} /> Concluir Serviço
              </button>
            </div>
          </div>

          {/* Dados do Chamado & AnyDesk */}
          <div className="adm-form-row" style={{
            display: 'flex',
            gap: '12px'
          }}>
            {/* Bloco AnyDesk */}
            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Endereço AnyDesk do Cliente
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {session.remoteAccessId || ticket?.remoteAccessId || '849 203 192'}
                </span>
                <button 
                  onClick={handleCopyAnyDesk}
                  className="f-btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  {copied ? <Check size={12} color="var(--orange)" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Bloco Chamado Vinculado */}
            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Chamado Vinculado
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                {session.ticketCode || ticket?.code || 'CH-2026-000104'}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {session.customerName || ticket?.customerName || 'Contabilidade Alfa Ltda'}
              </span>
            </div>
          </div>

          {/* Modal / Bloco de Confirmação de Término */}
          {isEnding && (
            <div style={{
              backgroundColor: 'rgba(255, 94, 0, 0.08)',
              border: '1px solid var(--orange)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="var(--orange)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                  Finalizar Atendimento & Consolidar Horas Técnicas
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Ao concluir, o tempo total faturável será gravado no histórico financeiro e o chamado será marcado como <strong>RESOLVIDO</strong>.
              </p>
              <textarea
                rows={2}
                placeholder="Descreva o procedimento executado ou solução aplicada (opcional)..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="f-input"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setIsEnding(false)} className="f-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Cancelar
                </button>
                <button onClick={handleConfirmEndSession} className="f-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Confirmar Resolução
                </button>
              </div>
            </div>
          )}

          {/* Garantia & SLA IT THECNICA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '14px',
            fontSize: '11.5px',
            color: 'var(--text-tertiary)'
          }}>
            <ShieldCheck size={14} color="var(--orange)" />
            <span>Sessão auditada em conformidade com as diretrizes de segurança da IT THECNICA.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
