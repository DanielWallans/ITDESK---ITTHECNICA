import React, { useState, useEffect } from 'react';
import { Plus, Minus, FileText, Trash2, CheckCircle2, Clock, X, QrCode, Edit3, Copy, Check, MessageCircle, AlertCircle, Upload, Eye } from 'lucide-react';
import { api } from '../services/api';
import { buildPixPayload } from '../utils/pix';

const EMPTY_PIX_FORM = {
  id: null,
  label: 'Pix PicPay',
  pixKeyType: 'CNPJ',
  pixKey: '',
  receiverName: 'IT DESK',
  receiverCity: 'SAO PAULO',
  instructions: '',
  qrCodeImage: '',
  isActive: true
};

export default function BillingView({ tickets = [], onStatusChange, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixForm, setPixForm] = useState(EMPTY_PIX_FORM);
  const [savingPix, setSavingPix] = useState(false);
  const [pixError, setPixError] = useState('');
  const [copiedTicketId, setCopiedTicketId] = useState(null);
  const [receiptPreviewTicket, setReceiptPreviewTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState('INCOME'); // 'INCOME' | 'EXPENSE'
  const [description, setDescription] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [status, setStatus] = useState('PAID');
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    const [data, methods] = await Promise.all([
      api.getFinancialEntries(),
      api.getPaymentMethods(false)
    ]);
    setEntries(data || []);
    setPaymentMethods(methods || []);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const openNewPixModal = () => {
    setPixForm(EMPTY_PIX_FORM);
    setPixError('');
    setIsPixModalOpen(true);
  };

  const openEditPixModal = (pm) => {
    setPixForm({
      id: pm.id,
      label: pm.label || 'Pix',
      pixKeyType: pm.pixKeyType || 'ALEATORIA',
      pixKey: pm.pixKey || '',
      receiverName: pm.receiverName || 'IT DESK',
      receiverCity: pm.receiverCity || 'SAO PAULO',
      instructions: pm.instructions || '',
      qrCodeImage: pm.qrCodeImage || '',
      isActive: pm.isActive !== false
    });
    setPixError('');
    setIsPixModalOpen(true);
  };

  const handleQrImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setPixError('A imagem do QR Code deve ter no máximo 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPixForm((prev) => ({ ...prev, qrCodeImage: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSavePixMethod = async (e) => {
    e.preventDefault();
    setPixError('');
    setSavingPix(true);
    try {
      await api.savePaymentMethod(pixForm);
      setIsPixModalOpen(false);
      await loadEntries();
    } catch (err) {
      setPixError(err.message || 'Erro ao salvar chave Pix.');
    } finally {
      setSavingPix(false);
    }
  };

  const handleDeletePixMethod = async (id) => {
    if (!window.confirm('Deseja remover esta chave Pix?')) return;
    await api.deletePaymentMethod(id);
    await loadEntries();
  };

  const handleToggleTicketPayment = async (ticket) => {
    const nextStatus = ticket.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    await api.updateTicketPayment(ticket.id, nextStatus);
    await loadEntries();
    if (onRefresh) onRefresh();
  };

  const openModal = (type) => {
    setEntryType(type);
    setDescription('');
    setPartyName('');
    setAmount('');
    setPaymentMethod('PIX');
    setStatus('PAID');
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) {
      alert('Informe a descrição e o valor.');
      return;
    }
    setSaving(true);
    await api.createFinancialEntry({
      type: entryType,
      description: description.trim(),
      partyName: partyName.trim() || (entryType === 'EXPENSE' ? 'Retirada / Despesa' : 'Cliente Avulso'),
      amount: Number(String(amount).replace(',', '.')) || 0,
      status: entryType === 'EXPENSE' ? 'PAID' : status,
      paymentMethod
    });
    setSaving(false);
    setIsModalOpen(false);
    await loadEntries();
    if (onRefresh) onRefresh();
  };

  const handleToggleEntryStatus = async (entry) => {
    const nextStatus = entry.status === 'PAID' ? 'PENDING' : 'PAID';
    await api.updateFinancialEntryStatus(entry.id, nextStatus);
    await loadEntries();
    if (onRefresh) onRefresh();
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Deseja excluir este lançamento financeiro?')) return;
    await api.deleteFinancialEntry(id);
    await loadEntries();
    if (onRefresh) onRefresh();
  };

  // Cálculo dos totais reais (baseado em paymentStatus real dos chamados + lançamentos manuais sem duplicidade)
  const activeTickets = tickets.filter(t => t.status !== 'CANCELLED');
  const manualEntries = entries.filter(e => !e.ticketId);
  const paidTicketsTotal = activeTickets
    .filter(t => t.paymentStatus === 'PAID')
    .reduce((acc, t) => acc + (Number(t.estimatedPrice) || 0), 0);
  const unpaidClosedTickets = activeTickets
    .filter(t => (t.status === 'RESOLVED' || t.status === 'CLOSED') && t.paymentStatus !== 'PAID');
  const pendingTicketsTotal = activeTickets
    .filter(t => t.paymentStatus !== 'PAID')
    .reduce((acc, t) => acc + (Number(t.estimatedPrice) || 0), 0);

  const manualPaidIncome = manualEntries
    .filter(e => e.type === 'INCOME' && e.status === 'PAID')
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const manualPendingIncome = manualEntries
    .filter(e => e.type === 'INCOME' && e.status !== 'PAID')
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalExpenses = manualEntries
    .filter(e => e.type === 'EXPENSE')
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const totalReceived = paidTicketsTotal + manualPaidIncome;
  const totalPending = pendingTicketsTotal + manualPendingIncome;
  const netBalance = totalReceived - totalExpenses;

  const activePixMethod = paymentMethods.find(pm => pm.isActive) || paymentMethods[0] || null;

  const buildBillingMessage = (ticket) => {
    const val = `R$ ${Number(ticket.estimatedPrice || 0).toFixed(2).replace('.', ',')}`;
    let msg = `Olá, ${ticket.customerName}! Segue a cobrança referente ao atendimento técnico finalizado na IT DESK:\n\n` +
      `• Chamado: ${ticket.code}\n` +
      `• Serviço: ${ticket.title}\n` +
      `• Valor: ${val}\n`;
    if (activePixMethod) {
      const payload = buildPixPayload({
        pixKey: activePixMethod.pixKey,
        pixKeyType: activePixMethod.pixKeyType,
        receiverName: activePixMethod.receiverName,
        receiverCity: activePixMethod.receiverCity,
        amount: ticket.estimatedPrice,
        txid: ticket.code
      });
      msg += `\nChave Pix (${activePixMethod.pixKeyType}): ${activePixMethod.pixKey}\n` +
        `Favorecido: ${activePixMethod.receiverName}\n\n` +
        `Pix Copia e Cola:\n${payload}\n`;
    }
    msg += `\nVocê também pode visualizar o QR Code acessando: ${window.location.origin}/atendimento`;
    return msg;
  };

  const handleCopyBilling = (ticket) => {
    navigator.clipboard.writeText(buildBillingMessage(ticket));
    setCopiedTicketId(ticket.id);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  const handleChargeWhatsApp = (ticket) => {
    const digits = String(ticket.customerPhone || '').replace(/\D/g, '');
    const phone = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
    const text = encodeURIComponent(buildBillingMessage(ticket));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Editorial */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            CONTROLE DE CAIXA & PIX • IT DESK
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Faturamento, Chaves Pix & Cobranças
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={openNewPixModal} className="f-btn-secondary">
            <QrCode size={14} color="var(--orange)" /> Configurar Chave Pix
          </button>
          <button onClick={() => openModal('EXPENSE')} className="f-btn-secondary" style={{ color: '#fca5a5' }}>
            <Minus size={14} /> Registrar Retirada
          </button>
          <button onClick={() => openModal('INCOME')} className="f-btn-primary">
            <Plus size={14} /> Adicionar Entrada
          </button>
        </div>
      </div>

      {/* Faixa Horizontal de Indicadores Financeiros (Sem Cards) */}
      <div className="adm-stats-strip">
        <div className="adm-stat-item">
          <span className="adm-stat-label">Saldo Líquido em Caixa</span>
          <span className="adm-stat-value" style={{ color: 'var(--orange)' }}>
            R$ {netBalance.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">Recebido menos retiradas</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">Total Recebido (Pago)</span>
          <span className="adm-stat-value">
            R$ {totalReceived.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">Chamados pagos + entradas</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">Retiradas / Despesas</span>
          <span className="adm-stat-value" style={{ color: totalExpenses > 0 ? '#fca5a5' : 'var(--text-white)' }}>
            - R$ {totalExpenses.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">{entries.filter(e => e.type === 'EXPENSE').length} saída(s) registrada(s)</span>
        </div>

        <div className="adm-stat-item">
          <span className="adm-stat-label">A Receber (Pendente)</span>
          <span className="adm-stat-value" style={{ color: totalPending > 0 ? 'var(--orange)' : 'var(--text-white)' }}>
            R$ {totalPending.toFixed(2).replace('.', ',')}
          </span>
          <span className="adm-stat-sub">{unpaidClosedTickets.length} finalizado(s) para cobrar</span>
        </div>
      </div>

      {/* Formas de Pagamento Pix (Lista Plana Sem Caixas) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Chaves Pix & QR Code (/atendimento)
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {paymentMethods.length} cadastrada(s)
            </span>
          </div>
          <button onClick={openNewPixModal} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            + Nova Chave Pix
          </button>
        </div>

        <div className="adm-row-list">
          {paymentMethods.length === 0 ? (
            <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Nenhuma chave Pix cadastrada. Configure sua chave ou imagem de QR Code para exibir ao cliente quando o chamado for concluído.
              </span>
              <button onClick={openNewPixModal} className="f-btn-secondary">
                Cadastrar Chave Pix
              </button>
            </div>
          ) : (
            paymentMethods.map((pm) => (
              <div key={pm.id} className="adm-row-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                  {pm.qrCodeImage && (
                    <img
                      src={pm.qrCodeImage}
                      alt="QR Pix"
                      style={{ width: '44px', height: '44px', objectFit: 'contain', backgroundColor: '#ffffff', padding: '2px', borderRadius: '2px', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-white)' }}>{pm.label}</strong>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: pm.isActive ? 'var(--orange)' : 'var(--text-tertiary)', fontWeight: 700 }}>
                        {pm.isActive ? '● ATIVA' : '○ INATIVA'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--orange)', marginTop: '3px', wordBreak: 'break-all' }}>
                      {pm.pixKey ? `${pm.pixKeyType}: ${pm.pixKey}` : 'QR Code imagem cadastrado'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Favorecido: {pm.receiverName} • {pm.receiverCity}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => openEditPixModal(pm)} className="f-btn-secondary" style={{ padding: '6px 10px' }}>
                    <Edit3 size={12} /> Editar
                  </button>
                  <button onClick={() => handleDeletePixMethod(pm.id)} className="f-btn-secondary" style={{ padding: '6px 8px', color: '#fca5a5' }} title="Excluir chave Pix">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Painel de Pagamentos Pendentes (Clientes para cobrar depois) */}
      <div className="f-card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: unpaidClosedTickets.length > 0 ? 'rgba(255, 94, 0, 0.06)' : 'transparent'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="var(--orange)" />
            <div>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-white)', display: 'block' }}>
                Pagamentos Pendentes — Cobrar Depois ({unpaidClosedTickets.length})
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Atendimentos já finalizados que ainda não tiveram o pagamento confirmado. Envie a cobrança Pix no WhatsApp ou confirme o recebimento.
              </span>
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800, color: 'var(--orange)' }}>
            Total pendente: R$ {unpaidClosedTickets.reduce((a, t) => a + Number(t.estimatedPrice || 0), 0).toFixed(2).replace('.', ',')}
          </span>
        </div>

        {unpaidClosedTickets.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Nenhum atendimento finalizado com pagamento pendente no momento.
          </div>
        ) : (
          <table className="f-table">
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Cliente / Contato</th>
                <th>Serviço Finalizado</th>
                <th>Conclusão</th>
                <th>Valor</th>
                <th>Situação</th>
                <th style={{ textAlign: 'right' }}>Cobrar / Confirmar</th>
              </tr>
            </thead>
            <tbody>
              {unpaidClosedTickets.map((t) => {
                const isReported = t.paymentStatus === 'REPORTED';
                return (
                  <tr key={`unpaid-${t.id}`}>
                    <td data-label="Chamado" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--orange)' }}>
                      {t.code}
                    </td>
                    <td data-label="Cliente">
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)' }}>
                          {t.customerName} {t.companyName ? `(${t.companyName})` : ''}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {t.customerPhone || t.customerEmail || 'Sem telefone'}
                        </span>
                      </div>
                    </td>
                    <td className="m-full">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-white)' }}>{t.title}</span>
                        {t.resolutionSummary && (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.resolutionSummary}</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Conclusão" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(t.resolvedAt || t.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td data-label="Valor" style={{ fontFamily: 'var(--font-mono)', fontSize: '13.5px', fontWeight: 800, color: 'var(--orange)' }}>
                      R$ {Number(t.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td data-label="Situação">
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '2px',
                        backgroundColor: isReported ? 'rgba(250, 204, 21, 0.14)' : 'rgba(255, 94, 0, 0.14)',
                        color: isReported ? '#facc15' : 'var(--orange)'
                      }}>
                        {isReported ? 'Cliente informou Pix' : 'Pendente (Cobrar)'}
                      </span>
                    </td>
                    <td className="m-actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {t.paymentReceiptUrl && (
                          <button
                            onClick={() => setReceiptPreviewTicket(t)}
                            className="f-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '11.5px', borderColor: 'rgba(255,94,0,0.5)', color: 'var(--orange)' }}
                            title="Visualizar comprovante de pagamento enviado pelo cliente"
                          >
                            <Eye size={13} /> Ver Comprovante
                          </button>
                        )}
                        <button
                          onClick={() => handleChargeWhatsApp(t)}
                          className="f-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          title="Enviar cobrança com Chave Pix e Copia e Cola no WhatsApp"
                        >
                          <MessageCircle size={13} color="var(--orange)" /> Cobrar WhatsApp
                        </button>
                        <button
                          onClick={() => handleCopyBilling(t)}
                          className="f-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          title="Copiar mensagem de cobrança Pix"
                        >
                          {copiedTicketId === t.id ? <Check size={13} color="var(--orange)" /> : <Copy size={13} />}
                          {copiedTicketId === t.id ? 'Copiado' : 'Copiar Pix'}
                        </button>
                        <button
                          onClick={() => handleToggleTicketPayment(t)}
                          className="f-btn-primary"
                          style={{ padding: '5px 12px', fontSize: '11.5px' }}
                        >
                          <CheckCircle2 size={13} /> Confirmar Pago
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tabela Unificada de Movimentações Financeiras */}
      <div className="f-card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
            Movimentações Financeiras & Ordens de Chamados
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Clique no status para dar baixa manual (Pago / Pendente)
          </span>
        </div>

        {activeTickets.length === 0 && entries.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <FileText size={32} color="var(--orange)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)' }}>
              Nenhuma movimentação financeira registrada
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Use os botões acima para adicionar uma Entrada, registrar uma Retirada ou abra um chamado técnico.
            </span>
          </div>
        ) : (
          <table className="f-table">
            <thead>
              <tr>
                <th>Tipo / Origem</th>
                <th>Cliente / Destino</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Lançamentos Manuais (Entradas e Retiradas) */}
              {manualEntries.map(e => {
                const isExpense = e.type === 'EXPENSE';
                const isPaid = e.status === 'PAID';
                return (
                  <tr key={`entry-${e.id}`}>
                    <td data-label="Origem">
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: isExpense ? '#fca5a5' : 'var(--orange)',
                        backgroundColor: isExpense ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 94, 0, 0.12)',
                        padding: '3px 8px',
                        borderRadius: '2px'
                      }}>
                        {isExpense ? 'RETIRADA / SAÍDA' : `ENTRADA (${e.paymentMethod})`}
                      </span>
                    </td>
                    <td data-label="Cliente / Destino" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)' }}>
                      {e.partyName}
                    </td>
                    <td data-label="Descrição" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {e.description}
                    </td>
                    <td data-label="Data" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(e.entryDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td data-label="Valor" style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isExpense ? '#fca5a5' : 'var(--text-white)'
                    }}>
                      {isExpense ? '- ' : '+ '}R$ {Number(e.amount || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td data-label="Status">
                      {isExpense ? (
                        <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>Retirado</span>
                      ) : (
                        <button
                          onClick={() => handleToggleEntryStatus(e)}
                          className="f-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11px', borderColor: isPaid ? 'rgba(255,94,0,0.4)' : 'var(--border-light)' }}
                        >
                          {isPaid ? <CheckCircle2 size={12} color="var(--orange)" /> : <Clock size={12} />}
                          <span style={{ color: isPaid ? 'var(--orange)' : 'var(--text-secondary)' }}>
                            {isPaid ? 'Pago (Recebido)' : 'Pendente'}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="m-actions" style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteEntry(e.id)}
                        className="f-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', color: '#fca5a5' }}
                        title="Excluir lançamento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Chamados Vinculados */}
              {activeTickets.map(t => {
                const isPaid = t.paymentStatus === 'PAID';
                const isReported = t.paymentStatus === 'REPORTED';
                return (
                  <tr key={`ticket-${t.id}`}>
                    <td data-label="Origem" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--orange)' }}>
                      CHAMADO {t.code}
                    </td>
                    <td data-label="Cliente">
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)' }}>
                          {t.customerName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {t.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td data-label="Serviço" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {t.title}
                    </td>
                    <td data-label="Data" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td data-label="Valor" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                      + R$ {Number(t.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td data-label="Pagamento">
                      <button
                        onClick={() => handleToggleTicketPayment(t)}
                        className="f-btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          borderColor: isPaid ? 'rgba(255,94,0,0.4)' : isReported ? 'rgba(250,204,21,0.5)' : 'var(--border-light)'
                        }}
                      >
                        {isPaid ? <CheckCircle2 size={12} color="var(--orange)" /> : <Clock size={12} color={isReported ? '#facc15' : undefined} />}
                        <span style={{ color: isPaid ? 'var(--orange)' : isReported ? '#facc15' : 'var(--text-secondary)' }}>
                          {isPaid
                            ? 'Pix Confirmado (Pago)'
                            : isReported
                              ? 'Cliente informou Pix (Confirmar)'
                              : 'Aguardando Pagamento'}
                        </span>
                      </button>
                    </td>
                    <td className="m-actions" style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {t.paymentReceiptUrl ? (
                        <button
                          onClick={() => setReceiptPreviewTicket(t)}
                          className="f-btn-secondary"
                          style={{ padding: '4px 9px', fontSize: '11px', color: 'var(--orange)' }}
                        >
                          <Eye size={12} /> Comprovante
                        </button>
                      ) : (
                        t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'Finalizado' : 'Em andamento'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Entrada ou Retirada */}
      {isModalOpen && (
        <div className="f-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="f-modal-box" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-card)'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
                {entryType === 'EXPENSE' ? 'Registrar Retirada / Saída de Caixa' : 'Adicionar Entrada / Recebimento'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Descrição *
                </label>
                <input
                  type="text"
                  placeholder={entryType === 'EXPENSE' ? 'Ex: Retirada pessoal / Licenças / Internet' : 'Ex: Atendimento avulso / Manutenção'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="f-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {entryType === 'EXPENSE' ? 'Favorecido / Destino' : 'Cliente / Pagador'}
                </label>
                <input
                  type="text"
                  placeholder={entryType === 'EXPENSE' ? 'Ex: IT THECNICA' : 'Nome do cliente'}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="f-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="f-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="f-input"
                  >
                    <option value="PIX">Pix</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="BOLETO">Boleto / Transferência</option>
                  </select>
                </div>
              </div>

              {entryType === 'INCOME' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Status do Recebimento
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="f-input"
                  >
                    <option value="PAID">Já Recebido (Pago)</option>
                    <option value="PENDING">A Receber (Pendente)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="f-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="f-btn-primary">
                  {saving ? 'Salvando...' : (entryType === 'EXPENSE' ? 'Confirmar Retirada' : 'Salvar Entrada')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Chave Pix */}
      {isPixModalOpen && (
        <div className="f-modal-overlay" onClick={() => setIsPixModalOpen(false)}>
          <div className="f-modal-box" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-card)'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
                {pixForm.id ? 'Editar Chave Pix' : 'Cadastrar Chave Pix para Recebimento'}
              </span>
              <button onClick={() => setIsPixModalOpen(false)} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSavePixMethod} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pixError && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: '12px' }}>
                  {pixError}
                </div>
              )}

              <div className="adm-form-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Identificação *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pix CNPJ IT DESK"
                    value={pixForm.label}
                    onChange={(e) => setPixForm({ ...pixForm, label: e.target.value })}
                    className="f-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Tipo da Chave *
                  </label>
                  <select
                    value={pixForm.pixKeyType}
                    onChange={(e) => setPixForm({ ...pixForm, pixKeyType: e.target.value })}
                    className="f-input"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Aleatória (EVP)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Chave Pix (opcional se enviar imagem do QR Code)
                </label>
                <input
                  type="text"
                  placeholder="Digite a chave Pix do seu PicPay / banco"
                  value={pixForm.pixKey}
                  onChange={(e) => setPixForm({ ...pixForm, pixKey: e.target.value })}
                  className="f-input"
                />
              </div>

              {/* Upload da imagem do QR Code do Pix */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Imagem do QR Code do Pix (PicPay / Banco)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label className="f-btn-secondary" style={{ cursor: 'pointer', fontSize: '12px' }}>
                    <Upload size={13} color="var(--orange)" /> {pixForm.qrCodeImage ? 'Trocar imagem do QR Code' : 'Enviar imagem do QR Code'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {pixForm.qrCodeImage && (
                    <button
                      type="button"
                      onClick={() => setPixForm({ ...pixForm, qrCodeImage: '' })}
                      className="f-btn-secondary"
                      style={{ fontSize: '11.5px', color: '#fca5a5' }}
                    >
                      Remover QR Code
                    </button>
                  )}
                </div>
                {pixForm.qrCodeImage && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={pixForm.qrCodeImage}
                      alt="Prévia QR Code Pix"
                      style={{ width: '96px', height: '96px', objectFit: 'contain', backgroundColor: '#ffffff', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Esta imagem do QR Code será exibida para o cliente na tela de pagamento.
                    </span>
                  </div>
                )}
              </div>

              <div className="adm-form-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Nome do Recebedor (máx. 25) *
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="IT DESK SUPORTE"
                    value={pixForm.receiverName}
                    onChange={(e) => setPixForm({ ...pixForm, receiverName: e.target.value })}
                    className="f-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Cidade (máx. 15) *
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="SAO PAULO"
                    value={pixForm.receiverCity}
                    onChange={(e) => setPixForm({ ...pixForm, receiverCity: e.target.value })}
                    className="f-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Instruções ao cliente (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Envie o comprovante ou clique em 'Já fiz o pagamento'"
                  value={pixForm.instructions}
                  onChange={(e) => setPixForm({ ...pixForm, instructions: e.target.value })}
                  className="f-input"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pixForm.isActive}
                  onChange={(e) => setPixForm({ ...pixForm, isActive: e.target.checked })}
                />
                Exibir esta chave Pix para os clientes ao finalizar chamados
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsPixModalOpen(false)} className="f-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPix} className="f-btn-primary">
                  {savingPix ? 'Salvando...' : 'Salvar Chave Pix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Comprovante Pix enviado pelo cliente */}
      {receiptPreviewTicket && (
        <div className="f-modal-overlay" onClick={() => setReceiptPreviewTicket(null)}>
          <div className="f-modal-box" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)', display: 'block' }}>
                  Comprovante Pix — {receiptPreviewTicket.code}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Cliente: {receiptPreviewTicket.customerName} • Valor: R$ {Number(receiptPreviewTicket.estimatedPrice || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <button onClick={() => setReceiptPreviewTicket(null)} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              {receiptPreviewTicket.paymentReceiptUrl?.startsWith('data:image/') ? (
                <img
                  src={receiptPreviewTicket.paymentReceiptUrl}
                  alt="Comprovante Pix"
                  style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              ) : (
                <iframe
                  src={receiptPreviewTicket.paymentReceiptUrl}
                  title="Comprovante PDF"
                  style={{ width: '100%', height: '420px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href={receiptPreviewTicket.paymentReceiptUrl}
                  download={receiptPreviewTicket.paymentReceiptName || `comprovante-${receiptPreviewTicket.code}`}
                  className="f-btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  Baixar arquivo ({receiptPreviewTicket.paymentReceiptName || 'comprovante'})
                </a>

                {receiptPreviewTicket.paymentStatus !== 'PAID' && (
                  <button
                    type="button"
                    className="f-btn-primary"
                    onClick={async () => {
                      await handleToggleTicketPayment(receiptPreviewTicket);
                      setReceiptPreviewTicket(null);
                    }}
                  >
                    <CheckCircle2 size={14} /> Confirmar Pagamento Recebido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
