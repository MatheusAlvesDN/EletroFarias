const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const crmService = {
  // Clientes
  async listCustomers() {
    const res = await fetch(`${API_BASE}/crm/clientes`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar clientes");
    return res.json();
  },

  async createCustomer(data: {
    nome: string;
    email?: string;
    telefone?: string;
    documento?: string;
    codParc?: string;
  }) {
    const res = await fetch(`${API_BASE}/crm/clientes`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao criar cliente");
    return res.json();
  },

  // Leads / Funil
  async listLeads() {
    const res = await fetch(`${API_BASE}/crm/leads`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar o funil");
    return res.json();
  },

  async createLead(data: { clienteId: string; titulo?: string }) {
    const res = await fetch(`${API_BASE}/crm/leads`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao criar lead");
    return res.json();
  },

  async updateLeadStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/crm/leads/${id}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar status do lead");
    return res.json();
  },

  async deleteLead(id: string) {
    const res = await fetch(`${API_BASE}/crm/leads/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao excluir lead");
    return res.json();
  },

  // Pedidos
  async listFunnel() {
    return this.listLeads();
  },

  async createOrder(data: {
    clienteId: string;
    leadId?: string;
    userId?: string;
    observacoes?: string;
    itens: {
      codProd: string;
      descricao: string;
      quantidade: number;
      precoUnitario: number;
    }[];
  }) {
    const res = await fetch(`${API_BASE}/crm/pedidos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao criar pedido");
    return res.json();
  },

  async updateOrderStatus(id: string, status: string) {
    return this.updateLeadStatus(id, status);
  },

  async addItem(pedidoId: string, item: { codProd: number; descricao: string; quantidade: number; precoUnitario: number }) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/itens`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error("Erro ao adicionar item");
    return res.json();
  },

  async removeItem(pedidoId: string, itemId: string) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/itens/${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao remover item");
    return res.json();
  },

  // Produtos CRM
  async listCrmProducts() {
    const res = await fetch(`${API_BASE}/crm/produtos`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar produtos do CRM");
    return res.json();
  },

  async syncProductsSankhya() {
    const res = await fetch(`${API_BASE}/crm/produtos/sync`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao sincronizar produtos");
    return res.json();
  },

  async syncClientsSankhya() {
    const res = await fetch(`${API_BASE}/crm/clientes/sync`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao sincronizar clientes");
    return res.json();
  },

  async createCrmProduct(data: {
    codProd: string;
    descricao?: string;
    precoVenda?: number;
    estoque?: number;
    categoria?: string;
  }) {
    const res = await fetch(`${API_BASE}/crm/produtos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao salvar produto no CRM");
    return res.json();
  },

  // Sankhya Sync (Isolado no Controller de CRM)
  async searchSankhya(query: string) {
    const res = await fetch(`${API_BASE}/crm/sankhya/search?search=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Erro ao pesquisar no Sankhya (CRM)");
    }
    return res.json();
  },

  async getProduct(id: string | number) {
    const res = await fetch(`${API_BASE}/crm/sankhya/product/${encodeURIComponent(id)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao obter produto no Sankhya (CRM)");
    return res.json();
  },

  // Comentários
  async addComment(data: { pedidoId?: string; leadId?: string; texto: string }) {
    const res = await fetch(`${API_BASE}/crm/comentarios`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao adicionar comentário");
    return res.json();
  },

  async listComments(params: { pedidoId?: string; leadId?: string }) {
    const query = new URLSearchParams();
    if (params.pedidoId) query.append("pedidoId", params.pedidoId);
    if (params.leadId) query.append("leadId", params.leadId);

    const res = await fetch(`${API_BASE}/crm/comentarios?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar comentários");
    return res.json();
  },

  // Agenda
  async addAgenda(leadId: string, data: { titulo: string; descricao?: string; dataAgendada: string }) {
    const res = await fetch(`${API_BASE}/crm/leads/${leadId}/agenda`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao adicionar agenda");
    return res.json();
  },

  async listAgenda(leadId?: string) {
    const url = leadId ? `${API_BASE}/crm/agenda?leadId=${leadId}` : `${API_BASE}/crm/agenda`;
    const res = await fetch(url, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar agenda");
    return res.json();
  },

  async completeAgenda(id: string) {
    const res = await fetch(`${API_BASE}/crm/agenda/${id}/concluir`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao concluir agenda");
    return res.json();
  },

  // Notificações
  async listNotifications() {
    const res = await fetch(`${API_BASE}/crm/notificacoes`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar notificações");
    return res.json();
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/crm/notificacoes/${id}/lida`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao marcar notificação como lida");
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/crm/notificacoes/lidas-todas`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao marcar todas as notificações como lidas");
    return res.json();
  },

  async loginCheck() {
    const res = await fetch(`${API_BASE}/crm/login-check`, {
      method: "GET",
      headers: getHeaders(),
    });
    const text = await res.text();
    return text ? JSON.parse(text) : { success: true };
  },

  // Sincronização Sankhya
  async syncToSankhya(pedidoId: string) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/sankhya`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao sincronizar com Sankhya");
    return res.json();
  },
};
