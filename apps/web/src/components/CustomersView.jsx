import React, { useState, useEffect } from 'react';
import { Plus, Monitor, X, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function CustomersView({ onOpenNewTicket }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [defaultAnydesk, setDefaultAnydesk] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await api.getCustomers();
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!contactPerson.trim() || !email.trim()) {
      alert('Informe pelo menos o nome e o e-mail do usuário/cliente.');
      return;
    }
    setSaving(true);
    await api.createCustomer({
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim(),
      cnpj: cnpj.trim(),
      defaultAnydesk: defaultAnydesk.trim()
    });
    setSaving(false);
    setContactPerson('');
    setEmail('');
    setPhone('');
    setCompanyName('');
    setCnpj('');
    setDefaultAnydesk('');
    setIsModalOpen(false);
    loadCustomers();
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Deseja excluir este cliente e seus chamados vinculados?')) return;
    await api.deleteCustomer(id);
    loadCustomers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Editorial */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            BASE DE CLIENTES • SUPABASE
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.03em' }}>
            Clientes & Empresas Atendidas
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsModalOpen(true)} className="f-btn-secondary">
            <UserPlus size={14} /> Cadastrar Cliente
          </button>
          <button onClick={onOpenNewTicket} className="f-btn-primary">
            <Plus size={14} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* Tabela Plana de Clientes (Sem Cards) */}
      {!loading && customers.length === 0 ? (
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
              Nenhum cliente registrado
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Os clientes que abrirem chamado em <code>/atendimento</code> aparecerão automaticamente aqui, ou você pode cadastrá-los manualmente.
            </p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="f-btn-primary">
            <UserPlus size={14} /> Cadastrar Primeiro Cliente
          </button>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--border-light)' }}>
          <table className="f-table">
            <thead>
              <tr>
                <th>Cliente / Empresa</th>
                <th>Responsável</th>
                <th>E-mail & WhatsApp</th>
                <th>AnyDesk Padrão</th>
                <th>Chamados Ativos</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="m-full">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>
                        {c.name}
                      </span>
                      {c.cnpj && (
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                          {c.cnpj}
                        </span>
                      )}
                    </div>
                  </td>

                  <td data-label="Responsável" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {c.contactPerson}
                  </td>

                  <td data-label="Contato">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      <span>{c.email}</span>
                      {c.phone && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>{c.phone}</span>}
                    </div>
                  </td>

                  <td data-label="AnyDesk">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Monitor size={13} color="var(--orange)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                        {c.defaultAnydesk || '—'}
                      </span>
                    </div>
                  </td>

                  <td data-label="Chamados" style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: c.activeTickets > 0 ? 'var(--orange)' : 'var(--text-secondary)', fontWeight: 700 }}>
                    {c.activeTickets} ativo(s)
                  </td>

                  <td className="m-actions" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', width: '100%' }}>
                      <button
                        onClick={onOpenNewTicket}
                        className="f-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px', flex: 1, justifyContent: 'center' }}
                      >
                        <Plus size={12} /> Novo Chamado
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="f-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', color: '#fca5a5' }}
                        title="Excluir cliente"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Cadastro Manual de Cliente / Usuário */}
      {isModalOpen && (
        <div className="f-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="f-modal-box" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Cadastrar Novo Cliente
              </span>
              <button onClick={() => setIsModalOpen(false)} className="f-btn-icon" style={{ width: '28px', height: '28px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Wallan Daniel"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="f-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  E-mail *
                </label>
                <input
                  type="email"
                  placeholder="Ex: cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="f-input"
                  required
                />
              </div>

              <div className="adm-form-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Empresa (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da Empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="f-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    CPF / CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="f-input"
                  />
                </div>
              </div>

              <div className="adm-form-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="f-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    AnyDesk ID (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123 456 789"
                    value={defaultAnydesk}
                    onChange={(e) => setDefaultAnydesk(e.target.value)}
                    className="f-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="f-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="f-btn-primary">
                  {saving ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
