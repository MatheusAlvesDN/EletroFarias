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
};
