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

  // Pedidos / Funil
  async listFunnel() {
    const res = await fetch(`${API_BASE}/crm/pedidos`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar o funil");
    return res.json();
  },

  async createOrder(data: {
    clienteId: string;
    userId?: string; // Se não passar, o back pode lidar ou pegamos do token
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
    const res = await fetch(`${API_BASE}/crm/pedidos/${id}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar status");
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
    if (!res.ok) throw new Error("Erro ao pesquisar no Sankhya (CRM)");
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
  async addComment(pedidoId: string, texto: string) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/comentarios`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ texto }),
    });
    if (!res.ok) throw new Error("Erro ao adicionar comentário");
    return res.json();
  },

  async listComments(pedidoId: string) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/comentarios`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao listar comentários");
    return res.json();
  },

  // Agenda
  async addAgenda(pedidoId: string, data: { titulo: string; descricao?: string; dataAgendada: string }) {
    const res = await fetch(`${API_BASE}/crm/pedidos/${pedidoId}/agenda`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao adicionar agenda");
    return res.json();
  },

  async listAgenda(pedidoId?: string) {
    const url = pedidoId ? `${API_BASE}/crm/agenda?pedidoId=${pedidoId}` : `${API_BASE}/crm/agenda`;
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
