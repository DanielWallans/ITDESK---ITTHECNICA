import React, { useState, useEffect } from 'react';
import { Clock, Plus, ArrowRight, Trash2, Edit3, X } from 'lucide-react';
import { api } from '../services/api';

export default function ServicesView({ onSelectServiceToOpenTicket }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('Suporte Técnico');
  const [description, setDescription] = useState('');
  const [billingModel, setBillingModel] = useState('FIXED');
  const [referencePrice, setReferencePrice] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [checklistText, setChecklistText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    const data = await api.getServices();
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenNewModal = () => {
    setEditingServiceId(null);
    setName('');
    setCategoryName('Suporte Técnico');
    setDescription('');
    setBillingModel('FIXED');
    setReferencePrice('');
    setEstimatedMinutes('60');
    setChecklistText('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (svc) => {
    setEditingServiceId(svc.id);
    setName(svc.name || '');
    setCategoryName(svc.categoryName || 'Suporte Técnico');
    setDescription(svc.description || '');
    setBillingModel(svc.billingModel || 'FIXED');
    setReferencePrice(String(svc.referencePrice ?? ''));
    setEstimatedMinutes(String(svc.estimatedMinutes || 60));
    setChecklistText(Array.isArray(svc.checklistQuestions) ? svc.checklistQuestions.join('\n') : '');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do serviço.');
      return;
    }
    setSaving(true);
    const checklistQuestions = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      categoryName: categoryName.trim() || 'Suporte Técnico',
      description: description.trim() || 'Atendimento técnico especializado via acesso remoto.',
      billingModel,
      referencePrice: Number(String(referencePrice).replace(',', '.')) || 0,
      estimatedMinutes: Number(estimatedMinutes) || 60,
      checklistQuestions
    };

    if (editingServiceId) {
      await api.updateService(editingServiceId, payload);
    } else {
      await api.createService(payload);
    }

    setSaving(false);
    setIsModalOpen(false);
    loadServices();
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Deseja excluir este serviço do catálogo?')) return;
    await api.deleteService(id);
    loadServices();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Editorial */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '720px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            CATÁLOGO DE SERVIÇOS • SINCRONIZADO COM /ATENDIMENTO
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Serviços, Preços & Checklists
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Os serviços e valores configurados abaixo aparecem em tempo real na tela do cliente (<code>/atendimento</code>).
          </p>
        </div>

        <button onClick={handleOpenNewModal} className="f-btn-primary">
          <Plus size={14} /> Cadastrar Novo Serviço
        </button>
      </div>

      {/* Lista Linear de Serviços (Sem Cards — Padrão /atendimento) */}
      {!loading && services.length === 0 ? (
        <div style={{
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)',
          padding: '40px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
              Catálogo de serviços vazio
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Cadastre seus serviços, valores e perguntas de triagem para exibir aos clientes em <code>/atendimento</code>.
            </p>
          </div>
          <button onClick={handleOpenNewModal} className="f-btn-primary">
            <Plus size={14} /> Criar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div className="adm-row-list">
          {services.map(s => (
            <div
              key={s.id}
              className="adm-row-item"
              style={{ alignItems: 'flex-start', padding: '22px 8px', flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {s.categoryName || 'Suporte Técnico'}
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} /> ~{s.estimatedMinutes || 60} min
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-white)' }}>
                  {s.name}
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '680px' }}>
                  {s.description}
                </p>

                {Array.isArray(s.checklistQuestions) && s.checklistQuestions.length > 0 && (
                  <div style={{ marginTop: '6px', paddingLeft: '10px', borderLeft: '2px solid #262626', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Checklist de Triagem ({s.checklistQuestions.length}):
                    </span>
                    {s.checklistQuestions.map((q, idx) => (
                      <span key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        • {q}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0, alignSelf: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    {s.billingModel === 'HOURLY' ? 'Hora Técnica' : 'Valor Fixo'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--text-white)' }}>
                    R$ {Number(s.referencePrice || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEditModal(s)}
                    className="f-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '11.5px' }}
                  >
                    <Edit3 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="f-btn-secondary"
                    style={{ padding: '7px 10px', fontSize: '11.5px', color: '#fca5a5' }}
                    title="Excluir serviço"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={() => onSelectServiceToOpenTicket(s)}
                    className="f-btn-primary"
                    style={{ padding: '7px 14px', fontSize: '11.5px' }}
                  >
                    Abrir <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Serviço */}
      {isModalOpen && (
        <div className="f-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="f-modal-box" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {editingServiceId ? 'Editar Serviço & Checklist' : 'Novo Serviço • Catálogo IT ONE'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveService} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Instalação de Impressora / Certificado Digital A1 ou A3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="f-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Impressoras, Certificado Digital, Redes"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="f-input"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tipo de Cobrança
                  </label>
                  <select
                    value={billingModel}
                    onChange={(e) => setBillingModel(e.target.value)}
                    className="f-input"
                  >
                    <option value="FIXED">Valor Fixo por Serviço</option>
                    <option value="HOURLY">Por Hora Técnica</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Valor Cobrado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 110.00"
                    value={referencePrice}
                    onChange={(e) => setReferencePrice(e.target.value)}
                    className="f-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tempo Estimado (minutos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    placeholder="Ex: 45"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="f-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Descrição do que está incluso
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva os procedimentos realizados neste serviço..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="f-input"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Perguntas do Checklist para o Cliente (1 por linha)
                </label>
                <textarea
                  rows={4}
                  placeholder={"Ex:\nQual a marca e o modelo da impressora?\nEstá conectada no Wi-Fi ou cabo USB?\nPrecisa compartilhar na rede?"}
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  className="f-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="f-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="f-btn-primary">
                  {saving ? 'Salvando...' : editingServiceId ? 'Salvar Alterações' : 'Criar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
