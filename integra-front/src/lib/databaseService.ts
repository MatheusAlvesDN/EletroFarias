const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (input: string, init?: RequestInit) => {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
      // Opcional: redirecionar para login ou lidar com erro de auth
      // Por enquanto vamos apenas deixar o erro passar ou tratar no chamador
  }
  
  return res;
};

export const databaseService = {
  async searchProducts(query: string, tag?: string) {
    const url = new URL(`${API_BASE}/database/search`);
    url.searchParams.append('q', query);
    if (tag) url.searchParams.append('tag', tag);
    
    const res = await request(url.toString());
    if (!res.ok) throw new Error("Erro ao buscar produtos no Oracle");
    return res.json();
  },

  async getProductPrice(codProd: string | number) {
    const res = await request(`${API_BASE}/database/price/${codProd}`);
    if (!res.ok) throw new Error("Erro ao buscar preço no Oracle");
    const data = await res.json();
    return data[0] || null;
  },

  async getProductStock(codProd: string | number) {
    const res = await request(`${API_BASE}/database/stock/${codProd}`);
    if (!res.ok) throw new Error("Erro ao buscar estoque no Oracle");
    return res.json();
  },

  async getProductDetail(codProd: string | number) {
    const res = await request(`${API_BASE}/database/detail/${codProd}`);
    if (!res.ok) throw new Error("Erro ao buscar detalhes do produto no Oracle");
    return res.json();
  },

  async searchCustomers(query: string) {
    const res = await request(`${API_BASE}/database/customers?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Erro ao buscar clientes no Oracle");
    return res.json();
  },

  async saveOrcamento(data: any) {
    const res = await request(`${API_BASE}/database/save-orcamento`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao salvar orçamento");
    return res.json();
  }
};
