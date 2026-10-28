/**
 * Gerenciador do Carrinho de Compras da Loja (Store Cart) para o Projeto Feito no Seridó
 * Responsável por gerenciar os itens adicionados ao carrinho, persistência no localStorage,
 * renderização de linhas de produtos na tela, cálculos de subtotais, descontos por PIX e totais gerais.
 */

import { CART_KEY, DEMO_CART, formatBRL, parsePrice, productId, readList } from "./store-state-utils.js";

export function createCartStore({ updateCounters }) {
  
  /**
   * Recupera e valida todos os itens válidos armazenados no carrinho.
   * Filtra elementos nulos, IDs inválidos, preços menores que zero ou quantidades zeradas.
   * @returns {Array} Lista de itens do carrinho.
   */
  function cartItems() {
    return readList(CART_KEY, []).filter((item) => item && item.id && Number(item.price) >= 0 && Number(item.quantity) > 0);
  }

  /**
   * Salva os itens atualizados no localStorage, atualiza os contadores e sincroniza a página do carrinho.
   * @param {Array} items - Nova lista de itens do carrinho.
   */
  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCounters();
    syncCartPage();
  }

  /**
   * Adiciona um produto ao carrinho ou incrementa sua quantidade caso já exista.
   * @param {string} name - Nome do produto.
   * @param {number|string} price - Preço unitário.
   * @param {number} [quantity=1] - Quantidade a ser adicionada.
   * @returns {boolean} True se adicionado com sucesso, false caso contrário.
   */
  function addToCart(name, price, quantity = 1) {
    const itemName = String(name || "Produto artesanal").trim();
    const itemId = productId(itemName);
    const unitPrice = parsePrice(price);
    if (!unitPrice) return false;
    
    const items = cartItems();
    const existing = items.find((item) => item.id === itemId);
    
    if (existing) existing.quantity += quantity;
    else items.push({ id: itemId, name: itemName, price: unitPrice, quantity });
    
    saveCart(items);
    return true;
  }

  /**
   * Cria dinamicamente o elemento HTML (linha de artigo) para um item específico do carrinho.
   * @param {object} item - Objeto contendo os dados do item do carrinho.
   * @returns {HTMLElement} O elemento DOM estruturado da linha do produto.
   */
  function makeCartRow(item) {
    const row = document.createElement("article");
    row.className = "cart-item flex flex-col sm:flex-row gap-space-md p-space-md rounded-xl bg-surface-container-lowest";
    row.dataset.id = item.id;
    row.dataset.price = String(item.price);

    const details = document.createElement("div");
    details.className = "flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3";
    
    const name = document.createElement("h4");
    name.className = "font-headline-sm text-[17px] text-on-surface font-semibold";
    name.textContent = item.name;
    
    const price = document.createElement("span");
    price.className = "font-headline-sm text-headline-sm text-primary font-bold item-total-display";
    // Nota: cálculo corrigido multiplicando preço unitário pela quantidade do item
    price.textContent = formatBRL(item.price * item.quantity);
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-2";
    
    const minus = document.createElement("button");
    minus.className = "qty-btn-minus w-8 h-8 rounded-md bg-surface-container flex items-center justify-center";
    minus.type = "button";
    minus.setAttribute("aria-label", "Diminuir quantidade");
    minus.textContent = "-";
    
    const quantity = document.createElement("input");
    quantity.className = "qty-input w-10 text-center bg-transparent";
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "15";
    quantity.readOnly = true;
    quantity.value = String(item.quantity);
    
    const plus = document.createElement("button");
    plus.className = "qty-btn-plus w-8 h-8 rounded-md bg-surface-container flex items-center justify-center";
    plus.type = "button";
    plus.setAttribute("aria-label", "Aumentar quantidade");
    plus.textContent = "+";
    
    const remove = document.createElement("button");
    remove.className = "btn-remove-item text-error font-label-sm";
    remove.type = "button";
    remove.textContent = "Remover";
    
    controls.append(minus, quantity, plus, remove);
    row.append(details, controls);
    return row;
  }

  /**
   * Sincroniza a página do carrinho com o estado atual dos itens (adicionando, atualizando ou removendo linhas).
   * Altera a visibilidade entre a visualização com itens e a tela de carrinho vazio.
   */
  function syncCartPage() {
    const cartRoot = document.getElementById("cart-content-view");
    if (!cartRoot) return;

    const items = cartItems();
    const existingRows = new Map([...cartRoot.querySelectorAll(".cart-item")].map((row) => [row.dataset.id, row]));
    const itemIds = new Set(items.map((item) => item.id));
    
    // Remove linhas de produtos que não estão mais no carrinho
    existingRows.forEach((row, id) => {
      if (!itemIds.has(id)) {
        const seller = row.closest(".producer-card");
        row.remove();
        if (seller && !seller.querySelector(".cart-item")) seller.remove();
      }
    });

    let addedSection = cartRoot.querySelector("#additional-cart-items");
    for (const item of items) {
      const row = existingRows.get(item.id);
      if (row) {
        // Atualiza quantidade e preço total exibido caso o item já esteja na tela
        const quantity = row.querySelector(".qty-input");
        if (quantity) quantity.value = String(item.quantity);
        const display = row.querySelector(".item-total-display");
        if (display) display.textContent = formatBRL(item.price * item.quantity);
      } else {
        // Cria a seção de "Outros itens" caso não exista e adiciona a nova linha
        if (!addedSection) {
          addedSection = document.createElement("section");
          addedSection.id = "additional-cart-items";
          addedSection.className = "producer-card rounded-2xl bg-surface-container-lowest shadow-sm p-space-md space-y-3";
          const heading = document.createElement("h3");
          heading.className = "font-headline-sm text-headline-sm text-on-surface";
          heading.textContent = "Outros itens";
          addedSection.appendChild(heading);
          cartRoot.querySelector(".lg\\:col-span-8")?.appendChild(addedSection);
        }
        addedSection.appendChild(makeCartRow(item));
      }
    }

    const emptyView = document.getElementById("cart-empty-view");
    cartRoot.classList.toggle("hidden", items.length === 0);
    emptyView?.classList.toggle("hidden", items.length > 0);
    updateCartTotals();
  }

  /**
   * Calcula e atualiza todos os totais do carrinho na interface (subtotal, frete, desconto PIX e valores finais).
   */
  function updateCartTotals() {
    const items = cartItems();
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const shipping = [...document.querySelectorAll('input[type="radio"][name^="shipping-"]:checked')]
      .reduce((total, input) => total + parsePrice(input.value), 0);
    const count = items.reduce((total, item) => total + item.quantity, 0);
    
    // Calcula desconto de 5% para pagamentos via PIX
    const pixDiscount = subtotal * 0.05;
    
    const values = {
      "summary-items-count": `${count} ${count === 1 ? "item" : "itens"}`,
      "summary-subtotal": formatBRL(subtotal),
      "summary-discount": `- ${formatBRL(pixDiscount)}`,
      "summary-shipping": shipping ? formatBRL(shipping) : "Grátis",
      "summary-total-pix": formatBRL(subtotal - pixDiscount + shipping),
      "summary-total-card": formatBRL(subtotal + shipping),
      "modal-total": formatBRL(subtotal - pixDiscount + shipping),
    };
    
    // Atualiza os elementos correspondentes no DOM
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  /**
   * Persiste alterações feitas em uma linha do carrinho (como alterar quantidade ou remover item).
   * @param {HTMLElement} button - Botão clicado que acionou a ação de controle.
   */
  function persistCartRow(button) {
    const row = button.closest(".cart-item");
    if (!row) return;
    const current = cartItems();
    const item = current.find((entry) => entry.id === row.dataset.id);
    if (!item) return;
    
    if (button.closest(".qty-btn-plus")) item.quantity = Number(row.querySelector(".qty-input")?.value || item.quantity);
    if (button.closest(".qty-btn-minus")) item.quantity = Number(row.querySelector(".qty-input")?.value || item.quantity);
    
    if (button.closest(".btn-remove-item")) {
      const next = current.filter((entry) => entry.id !== row.dataset.id);
      saveCart(next);
      window.setTimeout(syncCartPage, 300);
      return;
    }
    
    saveCart(current);
    updateCartTotals();
  }

  return { cartItems, saveCart, addToCart, makeCartRow, syncCartPage, updateCartTotals, persistCartRow };
}