import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

export default function NewTicketModal({ onClose, onCreated }) {
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('NEW');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('CUSTOM');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [remoteAccessTool, setRemoteAccessTool] = useState('ANYDESK');
  const [remoteAccessId, setRemoteAccessId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getServices().then(data => {
      const list = data || [];
      setServices(list);
      if (list.length > 0) {
        setSelectedServiceId(String(list[0].id));
        setEstimatedPrice(String(list[0].referencePrice || ''));
      }
    });
    api.getCustomers().then(data => {
      setCustomers(data || []);
    });
  }, []);

  const handleServiceSelect = (val) => {
    setSelectedServiceId(val);
    if (val !== 'CUSTOM') {
      const svc = services.find(s => String(s.id) === String(val));
      if (svc) {
        setEstimatedPrice(String(svc.referencePrice || ''));
        if (!title.trim()) {
          setTitle(svc.name);
        }
      }
    }
  };

  const handleCustomerSelect = (val) => {
    setSelectedCustomerId(val);
    if (val !== 'NEW') {
      const found = customers.find(c => String(c.id) === String(val));
      if (found) {
        setCustomerName(found.contactPerson || found.name);
        setCustomerEmail(found.email || '');
        setCompanyName(found.name || '');
        setCustomerPhone(found.phone !== 'Não informado' ? found.phone : '');
        if (found.defaultAnydesk && found.defaultAnydesk !== 'Não vinculado') {
          setRemoteAccessId(found.defaultAnydesk);
        }
      }
    } else {
      setCustomerName('');
      setCustomerEmail('');
      setCompanyName('');
      setCustomerPhone('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      alert('Por favor, informe o nome e o e-mail do cliente.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      alert('Por favor, informe o título e a descrição do problema.');
      return;
    }

    setLoading(true);
    const selectedService = selectedServiceId !== 'CUSTOM'
      ? services.find(s => s.id === Number(selectedServiceId))
      : null;

    const created = await api.createTicket({
      customerId: selectedCustomerId !== 'NEW' ? Number(selectedCustomerId) : null,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      companyName: companyName.trim(),
      customerPhone: customerPhone.trim(),
      serviceId: selectedService ? Number(selectedService.id) : null,
      serviceName: selectedService ? selectedService.name : 'Atendimento Remoto',
      estimatedPrice: Number(String(estimatedPrice).replace(',', '.')) || 0,
      title: title.trim(),
      description: description.trim(),
      priority,
      remoteAccessTool,
      remoteAccessId: remoteAccessId.trim()
    });

    setLoading(false);
    onCreated(created);
    onClose();
  };

  return (
    <div className="f-modal-overlay" onClick={onClose}>
      <div 
        className="f-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
              Novo Chamado • IT ONE
            </span>
          </div>
          <button onClick={onClose} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {customers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Selecionar Cliente ou Cadastrar Novo
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="f-input"
              >
                <option value="NEW">+ Novo Cliente / Usuário</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.contactPerson} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="adm-form-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nome do Cliente *
              </label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="f-input"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                E-mail do Cliente *
              </label>
              <input
                type="email"
                placeholder="Ex: joao@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="f-input"
                required
              />
            </div>
          </div>

          <div className="adm-form-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Empresa (Opcional)
              </label>
              <input
                type="text"
                placeholder="Nome da empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="f-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="f-input"
              />
            </div>
          </div>

          <div className="adm-form-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 2 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Serviço do Catálogo (ou Avulso)
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => handleServiceSelect(e.target.value)}
                className="f-input"
              >
                <option value="CUSTOM">Atendimento Avulso / Valor Personalizado</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — R$ {Number(s.referencePrice || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                className="f-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Título do Chamado *
            </label>
            <input
              type="text"
              placeholder="Ex: Formatação e backup ou suporte AnyDesk"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="f-input"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Descrição do Problema *
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a solicitação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="f-input"
              required
            />
          </div>

          <div className="adm-form-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Prioridade
              </label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="f-input"
              >
                <option value="LOW">Normal</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                AnyDesk ID (Acesso Remoto)
              </label>
              <input
                type="text"
                placeholder="Ex: 123 456 789"
                value={remoteAccessId}
                onChange={(e) => setRemoteAccessId(e.target.value)}
                className="f-input"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="f-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="f-btn-primary">
              {loading ? 'Salvando...' : 'Abrir Chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
