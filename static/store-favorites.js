/**
 * Gerenciador de Favoritos da Loja (Store Favorites) para o Projeto Feito no Seridó
 * Responsável por gerenciar a lista de produtos favoritos salvos no navegador,
 * verificar estados, atualizar ícones/botões interativos e sincronizar a interface da página de favoritos.
 */

import { FAVORITES_KEY, productId, readList } from "./store-state-utils.js";

export function createFavoriteStore({ updateCounters }) {
  
  /**
   * Retorna uma lista única e limpa de nomes de produtos favoritados recuperados do localStorage.
   * Utiliza um Map com base no ID normalizado do produto para evitar duplicatas.
   * @returns {string[]} Array com os nomes dos produtos favoritos.
   */
  function favorites() {
    const unique = new Map();
    readList(FAVORITES_KEY, []).filter((name) => typeof name === "string" && name.trim()).forEach((name) => {
      const key = productId(name);
      if (!unique.has(key)) unique.set(key, name);
    });
    return [...unique.values()];
  }

  /**
   * Verifica se um produto específico consta na lista de favoritos.
   * @param {string} name - Nome do produto.
   * @returns {boolean} True se for favorito, false caso contrário.
   */
  function isFavorite(name) {
    const key = productId(name);
    return favorites().some((favorite) => productId(favorite) === key);
  }

  /**
   * Adiciona ou remove um produto da lista de favoritos, atualiza o localStorage e os contadores.
   * @param {string} name - Nome do produto.
   * @param {boolean} isFavorite - Novo estado de favorito (true para adicionar, false para remover).
   */
  function setFavorite(name, isFavorite) {
    const itemName = String(name || "Produto artesanal").trim();
    const key = productId(itemName);
    const current = favorites();
    const existingIndex = current.findIndex((favorite) => productId(favorite) === key);
    
    if (isFavorite && existingIndex === -1) current.push(itemName);
    if (!isFavorite && existingIndex !== -1) current.splice(existingIndex, 1);
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(current));
    updateCounters();
  }

  /**
   * Verifica visualmente se o ícone de um botão de favorito está preenchido (ativo).
   * @param {HTMLElement} button - O elemento do botão.
   * @returns {boolean} True se o ícone estiver marcado como favorito.
   */
  function iconIsFavorite(button) {
    const icon = button.querySelector(".material-symbols-outlined");
    return Boolean(icon && (icon.textContent.trim() === "favorite" || icon.style.fontVariationSettings.includes("'FILL' 1")));
  }

  /**
   * Extrai o nome do produto a partir de atributos do botão ou buscando elementos no DOM pai (card).
   * @param {HTMLElement} button - O botão de favorito clicado.
   * @param {string} [explicitName] - Nome explícito opcional.
   * @returns {string} O nome identificado do produto.
   */
  function nameFromButton(button, explicitName) {
    if (explicitName) return explicitName;
    if (button.dataset.product) return button.dataset.product;
    const card = button.closest(".product-card, .product-item, article");
    return card?.querySelector("h2, h3, h4")?.textContent.trim() || document.querySelector("main h1")?.textContent.trim() || "Produto artesanal";
  }

  /**
   * Atualiza o estado visual (ícone, cor e atributos ARIA) de um botão de favorito.
   * @param {HTMLElement} button - O botão correspondente.
   * @ponto {boolean} isFavorite - Estado de favorito.
   */
  function setButtonFavorite(button, isFavorite) {
    const icon = button.querySelector(".material-symbols-outlined");
    if (!icon) return;
    icon.textContent = isFavorite ? "favorite" : "favorite_border";
    icon.style.fontVariationSettings = isFavorite ? "'FILL' 1" : "'FILL' 0";
    button.classList.toggle("text-primary", isFavorite);
    button.classList.toggle("text-on-surface-variant", !isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
  }

  /**
   * Sincroniza todos os botões de favoritos na tela com o estado real armazenado.
   * Oculta ou exibe cards na página dedicada de favoritos conforme necessário.
   */
  function syncFavoriteButtons() {
    document.querySelectorAll(".btn-heart, .btn-suggestion-heart, #btn-fav, button[aria-label^='Favoritar']").forEach((button) => {
      const name = nameFromButton(button);
      if (name === "Produto artesanal" || name === "") return;
      const saved = isFavorite(name);
      setButtonFavorite(button, saved);
      if (location.pathname.includes("produtos_favoritos") && button.classList.contains("btn-heart")) {
        button.closest(".product-card")?.classList.toggle("hidden", !saved);
      }
    });
    updateFavoritePageState();
  }

  /**
   * Atualiza o estado da página de favoritos, exibindo a grade de itens ou um estado vazio (empty state) caso não haja salvos.
   */
  function updateFavoritePageState() {
    if (!location.pathname.includes("produtos_favoritos")) return;
    const grid = document.getElementById("favorites-grid");
    if (!grid) return;
    
    const hasFavorites = favorites().length > 0;
    let emptyState = document.getElementById("favorites-empty-state");
    
    if (hasFavorites) {
      emptyState?.remove();
      grid.classList.remove("hidden");
      return;
    }
    
    grid.classList.add("hidden");
    if (!emptyState) {
      emptyState = document.createElement("section");
      emptyState.id = "favorites-empty-state";
      emptyState.className = "my-8 flex flex-col items-center gap-3 rounded-xl bg-surface-container-low p-8 text-center";
      
      const title = document.createElement("h2");
      title.className = "font-headline-sm text-on-surface";
      title.textContent = "Sua lista está vazia";
      
      const message = document.createElement("p");
      message.className = "text-sm text-on-surface-variant";
      message.textContent = "Favorite produtos do catálogo para encontrá-los aqui.";
      
      const link = document.createElement("a");
      link.className = "rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary";
      link.href = "/catalogo";
      link.textContent = "Explorar produtos";
      
      emptyState.append(title, message, link);
      grid.after(emptyState);
    }
  }

  return { favorites, isFavorite, setFavorite, iconIsFavorite, nameFromButton, setButtonFavorite, syncFavoriteButtons, updateFavoritePageState };
}