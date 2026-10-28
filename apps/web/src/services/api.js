// Centralized HTTP Client connected to Supabase API (/api/v1)

const API_BASE = '/api/v1';

// Estado em memória vazio (sem dados fictícios)
let initialTickets = [];
let initialMessages = {};
let activeRemoteSession = null;
let initialCustomers = [];
let initialServices = [];
let initialFinancialEntries = [];

export const api = {
  // Autenticação & Cadastro (Admin e Cliente no Supabase)
  async registerAdmin(data) {
    const res = await fetch(`${API_BASE}/auth/admin-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Falha ao criar conta de administrador.');
    return json.data;
  },

  async registerCustomer(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Falha ao realizar cadastro.');
    return json.data;
  },

  async login(data) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'E-mail ou senha incorretos.');
    return json.data;
  },

  async getCustomerTickets(customerId) {
    try {
      const res = await fetch(`${API_BASE}/tickets?customerId=${customerId}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}
    return [];
  },

  // Clientes / Usuários Reais
  async getCustomers() {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}
    return [...initialCustomers];
  },

  async createCustomer(data) {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    const created = {
      id: Date.now(),
      name: data.companyName || data.contactPerson,
      cnpj: data.cnpj || 'Pessoa Física / Avulso',
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone || 'Não informado',
      defaultAnydesk: data.defaultAnydesk || 'Não vinculado',
      activeTickets: 0,
      createdAt: new Date().toISOString()
    };
    initialCustomers.unshift(created);
    return created;
  },

  async deleteCustomer(id) {
    try {
      await fetch(`${API_BASE}/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
    } catch (e) {}
    initialCustomers = initialCustomers.filter(c => c.id !== Number(id));
    return true;
  },

  // Chamados
  async getTickets(statusFilter) {
    try {
      const url = statusFilter ? `${API_BASE}/tickets?status=${statusFilter}` : `${API_BASE}/tickets`;
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer demo-token' } });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}
    if (statusFilter) {
      return initialTickets.filter(t => t.status === statusFilter);
    }
    return [...initialTickets];
  },

  async createTicket(data) {
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const newCode = `CH-2026-${String(initialTickets.length + 1).padStart(6, '0')}`;
    const newTicket = {
      id: initialTickets.length + 1,
      code: newCode,
      customerId: 1,
      customerName: data.customerName || 'Cliente',
      customerEmail: data.customerEmail || '',
      technicianId: null,
      technicianName: null,
      serviceId: data.serviceId || null,
      serviceName: data.serviceName || 'Atendimento Remoto',
      title: data.title,
      description: data.description,
      status: 'NEW',
      priority: data.priority || 'MEDIUM',
      remoteAccessTool: data.remoteAccessTool || 'ANYDESK',
      remoteAccessId: data.remoteAccessId || '',
      estimatedPrice: Number(data.estimatedPrice || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    initialTickets.unshift(newTicket);
    return newTicket;
  },

  async deleteTicket(id) {
    try {
      await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
    } catch (e) {}
    initialTickets = initialTickets.filter(t => t.id !== Number(id));
    return true;
  },

  async updateTicketStatus(id, newStatus, reason, resolutionSummary) {
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify({ status: newStatus, reason, resolutionSummary })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const ticket = initialTickets.find(t => t.id === Number(id));
    if (ticket) {
      ticket.status = newStatus;
      ticket.updatedAt = new Date().toISOString();
      if (newStatus === 'RESOLVED') ticket.resolvedAt = new Date().toISOString();
    }
    return ticket;
  },

  async rateTicket(ticketId, ratingData) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao enviar avaliação.');
    return json.data;
  },

  // Pagamentos (formas de pagamento cadastradas pelo admin + status de pagamento do chamado)
  async getPaymentMethods(onlyActive = false) {
    try {
      const res = await fetch(`${API_BASE}/payment-methods${onlyActive ? '?active=true' : ''}`);
      const json = await res.json();
      return res.ok ? json.data || [] : [];
    } catch {
      return [];
    }
  },

  async savePaymentMethod(data) {
    const res = await fetch(`${API_BASE}/payment-methods${data.id ? `/${data.id}` : ''}`, {
      method: data.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao salvar forma de pagamento.');
    return json.data;
  },

  async deletePaymentMethod(id) {
    await fetch(`${API_BASE}/payment-methods/${id}`, { method: 'DELETE' });
  },

  async updateTicketPayment(ticketId, status, paymentMethodId = null, receiptUrl = null, receiptName = null) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paymentMethodId, receiptUrl, receiptName })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao atualizar pagamento.');
    return json.data;
  },

  // Mensagens
  async getMessages(ticketId, userRole = 'TECHNICIAN') {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages?role=${userRole}`, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}

    const msgs = initialMessages[ticketId] || [];
    if (userRole === 'CUSTOMER') {
      return msgs.filter(m => !m.internal);
    }
    return msgs;
  },

  async addMessage(ticketId, message, isInternal = false, authorId = null) {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify({ message, internal: isInternal, authorId })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    if (!initialMessages[ticketId]) {
      initialMessages[ticketId] = [];
    }
    const newMsg = {
      id: Date.now(),
      ticketId: Number(ticketId),
      authorId: 1,
      authorName: 'IT THECNICA',
      authorRole: 'ADMIN',
      message,
      internal: isInternal,
      createdAt: new Date().toISOString()
    };
    initialMessages[ticketId].push(newMsg);
    return newMsg;
  },

  // Sessões Remotas
  async getActiveSession(params = {}) {
    try {
      const qs = new URLSearchParams();
      if (params.ticketId) qs.set('ticketId', params.ticketId);
      if (params.customerId) qs.set('customerId', params.customerId);
      const url = qs.toString()
        ? `${API_BASE}/remote-sessions/active?${qs.toString()}`
        : `${API_BASE}/remote-sessions/active`;
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    return activeRemoteSession;
  },

  async startSession(ticketId, toolUsed = 'ANYDESK') {
    try {
      const res = await fetch(`${API_BASE}/remote-sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify({ ticketId, toolUsed })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    const ticket = initialTickets.find(t => t.id === Number(ticketId));
    activeRemoteSession = {
      id: Date.now(),
      ticketId: Number(ticketId),
      ticketCode: ticket ? ticket.code : `CH-${ticketId}`,
      ticketTitle: ticket ? ticket.title : 'Atendimento Remoto',
      customerName: ticket ? ticket.customerName : 'Cliente',
      technicianName: 'IT THECNICA',
      toolUsed,
      remoteAccessId: ticket ? ticket.remoteAccessId : '',
      startedAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      currentTotalSeconds: 0,
      billableSeconds: 0,
      customerConsent: true
    };
    if (ticket) ticket.status = 'IN_PROGRESS';
    return activeRemoteSession;
  },

  async pauseSession(id) {
    try {
      const res = await fetch(`${API_BASE}/remote-sessions/${id}/pause`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    if (activeRemoteSession) {
      activeRemoteSession.status = 'PAUSED';
    }
    return activeRemoteSession;
  },

  async resumeSession(id) {
    try {
      const res = await fetch(`${API_BASE}/remote-sessions/${id}/resume`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    if (activeRemoteSession) {
      activeRemoteSession.status = 'IN_PROGRESS';
    }
    return activeRemoteSession;
  },

  async endSession(id, resolutionSummary = '') {
    try {
      const res = await fetch(`${API_BASE}/remote-sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify({ resolutionSummary })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    if (activeRemoteSession) {
      activeRemoteSession.status = 'COMPLETED';
      activeRemoteSession.endedAt = new Date().toISOString();
    }
    const finished = activeRemoteSession;
    activeRemoteSession = null;
    return finished;
  },

  // Dashboard
  async getDashboardSummary() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}

    return {
      totalTickets: initialTickets.length,
      openTickets: initialTickets.filter(t => t.status === 'NEW' || t.status === 'TRIAGE').length,
      inProgressTickets: initialTickets.filter(t => t.status === 'IN_PROGRESS').length,
      waitingApprovalTickets: initialTickets.filter(t => t.status === 'WAITING_APPROVAL').length,
      resolvedTickets: initialTickets.filter(t => t.status === 'RESOLVED').length,
      monthlyRevenue: 0.00,
      totalMinutesWorked: 0,
      activeSession: activeRemoteSession,
      recentTickets: [...initialTickets]
    };
  },

  // Catálogo de Serviços (Gerenciado pelo Admin)
  async getServices() {
    try {
      const res = await fetch(`${API_BASE}/services`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}
    return [...initialServices];
  },

  async createService(data) {
    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    const created = {
      id: Date.now(),
      categoryName: data.categoryName || 'Suporte Técnico',
      name: data.name,
      description: data.description,
      billingModel: data.billingModel || 'FIXED',
      referencePrice: Number(data.referencePrice || 0),
      estimatedMinutes: Number(data.estimatedMinutes || 60)
    };
    initialServices.unshift(created);
    return created;
  },

  async updateService(id, data) {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    return data;
  },

  async deleteService(id) {
    try {
      await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
    } catch (e) {}
    initialServices = initialServices.filter(s => s.id !== Number(id));
    return true;
  },

  // Controle Financeiro Manual (Entradas e Retiradas)
  async getFinancialEntries() {
    try {
      const res = await fetch(`${API_BASE}/financial-entries`, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {}
    return [...initialFinancialEntries];
  },

  async createFinancialEntry(data) {
    try {
      const res = await fetch(`${API_BASE}/financial-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    const created = {
      id: Date.now(),
      type: data.type || 'INCOME',
      description: data.description,
      partyName: data.partyName || 'IT THECNICA',
      amount: Number(data.amount || 0),
      status: data.status || 'PAID',
      paymentMethod: data.paymentMethod || 'PIX',
      entryDate: new Date().toISOString()
    };
    initialFinancialEntries.unshift(created);
    return created;
  },

  async updateFinancialEntryStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE}/financial-entries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-token' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (e) {}
    const item = initialFinancialEntries.find(e => e.id === Number(id));
    if (item) item.status = status;
    return item;
  },

  async deleteFinancialEntry(id) {
    try {
      await fetch(`${API_BASE}/financial-entries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
    } catch (e) {}
    initialFinancialEntries = initialFinancialEntries.filter(e => e.id !== Number(id));
    return true;
  }
};
