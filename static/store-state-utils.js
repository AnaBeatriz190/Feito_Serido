/**
 * Utilitários e Constantes Globais da Loja (Store State Utils) para o Projeto Feito no Seridó
 * Define chaves de armazenamento local, dados de demonstração, funções de formatação,
 * manipulação de preços, validação de usuários e notificações flutuantes.
 */

// Chaves de persistência compartilhadas utilizadas pelos módulos de domínio da loja (LocalStorage)
export const CART_KEY = "feito-serido.cart.v1";
export const FAVORITES_KEY = "feito-serido.favorites.v1";
export const LISTS_KEY = "feito-serido.favorite-lists.v1";
export const PRODUCTS_KEY = "feito-serido.products.v1";
export const CLOUD_PRODUCTS_KEY = "feito-serido.cloud-products.v1";
export const DRAFTS_KEY = "feito-serido.product-drafts.v1";
export const REVIEWS_KEY = "feito-serido.reviews.v1";
export const CLOUD_REVIEWS_KEY = "feito-serido.cloud-reviews.v1";

// Carrinho de compras padrão para demonstração inicial da plataforma
export const DEMO_CART = [
    { id: "item-renda-1", name: "Caminho de Mesa em Renda Labirinto Ponto Palito", price: 145, quantity: 1 },
    { id: "item-renda-2", name: "Toalha de Lavabo Bordada Flor de Mandacaru", price: 35, quantity: 2 },
    { id: "item-queijo-1", name: "Queijo de Coalho Curado na Caatinga 800g", price: 42.5, quantity: 1 },
    { id: "item-vaso-1", name: "Vaso em Cerâmica Terracota com Trançado", price: 92, quantity: 1 },
  ];

// Mapeamento estático para identificadores padronizados de produtos conhecidos
export const PRODUCT_IDS = new Map([
    ["caminho de mesa em renda labirinto tradicional", "item-renda-1"],
    ["caminho de mesa em renda labirinto ponto palito", "item-renda-1"],
    ["caminho de mesa labirinto", "item-renda-1"],
    ["toalha de lavabo bordada flor de mandacaru", "item-renda-2"],
    ["queijo de coalho curado na caatinga 800g", "item-queijo-1"],
    ["queijo de coalho curado 800g", "item-queijo-1"],
    ["vaso em cerâmica terracota com trançado", "item-vaso-1"],
  ]);

let cloudClientPromise;

/**
 * Lê e analisa uma lista JSON do localStorage de forma segura.
 * Retorna um valor padrão (fallback) caso ocorra algum erro ou o dado não seja um array válido.
 * @param {string} key - A chave de armazenamento.
 * @param {Array} fallback - Valor padrão caso a leitura falhe.
 * @returns {Array} O array recuperado ou o fallback.
 */
export function readList(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

/**
 * Gera ou recupera um identificador único padronizado para um produto com base no seu nome.
 * @param {string} name - Nome do produto.
 * @returns {string} Identificador único formatado (slug).
 */
export function productId(name) {
    const normalized = String(name || "Produto artesanal").trim().toLocaleLowerCase("pt-BR");
    const knownId = [...PRODUCT_IDS].find(([knownName]) => normalized.includes(knownName) || knownName.includes(normalized))?.[1];
    return knownId || normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

/**
 * Converte uma string de preço formatada (ex: "R$ 1.250,50") em um número válido.
 * @param {string|number} value - O valor bruto do preço.
 * @returns {number} O valor numérico convertido ou 0.
 */
export function parsePrice(value) {
    const normalized = String(value ?? "0").replace(/[^\d,.-]/g, "");
    const decimal = normalized.includes(",")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized;
    const amount = Number(decimal);
    return Number.isFinite(amount) ? amount : 0;
  }

/**
 * Formata um valor numérico para o padrão de moeda brasileira (BRL).
 * @param {number} value - O valor numérico.
 * @returns {string} String formatada em reais (ex: "R$ 145,00").
 */
export function formatBRL(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

/**
 * Inicializa e retorna a instância do cliente Supabase para operações em nuvem (Singleton).
 * Retorna null caso a API de configuração retorne indisponibilidade (503).
 */
export async function getCloudClient() {
    if (!cloudClientPromise) {
      cloudClientPromise = (async () => {
        const response = await fetch("/api/supabase-config");
        if (response.status === 503) return null;
        const config = await response.json();
        if (!response.ok) throw new Error(config.error || "Não foi possível carregar o Supabase.");
        if (!window.supabase?.createClient) throw new Error("O SDK do Supabase não foi carregado.");
        return window.supabase.createClient(config.url, config.key);
      })();
    }
    return cloudClientPromise;
  }

/**
 * Verifica se o usuário atual está autenticado e possui o perfil de artesã ou produtor.
 * Lança um erro caso contrário.
 * @param {object} client - O cliente do Supabase.
 * @returns {object} O objeto do usuário autenticado.
 */
export async function requireArtisan(client) {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error("Entre em uma conta de artesã ou produtor para continuar.");
    const { data: profile, error } = await client.from("profiles").select("role").eq("id", user.id).single();
    if (error) throw error;
    if (profile.role !== "artisan") throw new Error("Esta ação está disponível apenas para contas de artesãs e produtores.");
    return user;
  }

/**
 * Verifica se existe um usuário autenticado na sessão atual.
 * Lança um erro caso o usuário não esteja logado.
 * @param {object} client - O cliente do Supabase.
 * @returns {object} O objeto do usuário autenticado.
 */
export async function requireUser(client) {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error("Entre em uma conta para enviar sua avaliação.");
    return user;
  }

/**
 * Extrai o preço numérico diretamente do elemento de cartão (card) HTML de um produto na interface.
 * @param {HTMLElement} card - Elemento DOM do cartão do produto.
 * @returns {number} O preço extraído.
 */
export function productPriceFromCard(card) {
    if (!card) return 0;
    const match = card.textContent.match(/R\$\s*[\d.]+,\d{2}/);
    return match ? parsePrice(match[0]) : 0;
  }

/**
 * Extrai o nome do produto diretamente do elemento de cartão (card) HTML.
 * @param {HTMLElement} card - Elemento DOM do cartão do produto.
 * @returns {string} O nome do produto ou um valor padrão.
 */
export function productNameFromCard(card) {
    return card?.querySelector("h2, h3, h4")?.textContent.trim() || "Produto artesanal";
  }

/**
 * Exibe uma notificação flutuante temporária na tela (toast de aviso local).
 * Cria o elemento dinamicamente se ele ainda não existir no DOM.
 * @param {string} message - A mensagem a ser exibida.
 */
export function notifyLocal(message) {
    let notice = document.getElementById("store-state-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "store-state-notice";
      notice.className = "fixed bottom-6 right-6 z-[100] max-w-sm rounded-lg bg-inverse-surface px-4 py-3 text-inverse-on-surface shadow-xl";
      notice.setAttribute("role", "status");
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.remove("hidden");
    window.clearTimeout(notice.timer);
    notice.timer = window.setTimeout(() => notice.classList.add("hidden"), 4000);
  }

/**
 * Inicializa as chaves essenciais do localStorage (carrinho e favoritos) caso estejam vazias.
 */
export function initializeStoreStorage() {
  if (localStorage.getItem(CART_KEY) === null) localStorage.setItem(CART_KEY, JSON.stringify([]));
  if (localStorage.getItem(FAVORITES_KEY) === null) localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
}