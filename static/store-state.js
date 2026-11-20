/**
 * Gerenciador de Estado Global da Loja (Store State) para o Projeto Feito no Seridó
 * Importa e coordena os módulos de carrinho, favoritos, produtos, avaliações e eventos.
 */

import { setupStoreEvents } from "./store-state-events.js";
import { createCartStore } from "./store-cart.js";
import { createFavoriteStore } from "./store-favorites.js";
import { createProductStore } from "./store-products.js";
import { createReviewStore } from "./store-reviews.js";
import * as utils from "./store-state-utils.js";

// Inicializa o armazenamento local (localStorage) da loja se ainda não existir
utils.initializeStoreStorage();

let cart;
let favorites;

/**
 * Atualiza os contadores numéricos e badges de itens do carrinho e de favoritos na interface.
 * Percorre os elementos HTML correspondentes e atualiza textos, contagens e atributos de acessibilidade (ARIA).
 * @returns {object} Objeto contendo o total atual de itens no carrinho e de favoritos.
 */
function updateCounters() {
  const totalCart = cart.cartItems().reduce((total, item) => total + Number(item.quantity), 0);
  const totalFavorites = favorites.favorites().length;
  
  // Atualiza os emblemas (badges) do carrinho na navegação
  document.querySelectorAll('[data-path="carrinho"] span.w-4').forEach((badge) => {
    badge.textContent = String(totalCart);
    badge.setAttribute("aria-label", `${totalCart} ${totalCart === 1 ? "item" : "itens"} no carrinho`);
  });
  
  // Atualiza os emblemas (badges) de favoritos na navegação
  document.querySelectorAll('[data-path="favoritos"] span.w-4').forEach((badge) => {
    badge.textContent = String(totalFavorites);
    badge.setAttribute("aria-label", `${totalFavorites} ${totalFavorites === 1 ? "item" : "itens"} favoritos`);
  });
  
  // Atualiza o contador detalhado de peças salvas (se presente na página de favoritos/perfil)
  const favoritesCount = document.getElementById("counter-total-pieces");
  if (favoritesCount) favoritesCount.textContent = `${totalFavorites} ${totalFavorites === 1 ? "Pe?a Salva" : "Pe?as Salvas"}`;
  
  // Atualiza o resumo numérico de favoritos
  const favoritesSummary = document.getElementById("favorite-summary-count");
  if (favoritesSummary) favoritesSummary.textContent = String(totalFavorites);
  
  return { totalCart, totalFavorites };
}

// Inicializa as stores de carrinho e favoritos injetando a função de atualização de contadores
cart = createCartStore({ updateCounters });
favorites = createFavoriteStore({ updateCounters });

// Inicializa as stores de produtos e avaliações utilizando as funções utilitárias de notificação local
const products = createProductStore({ notifyLocal: utils.notifyLocal });
const reviews = createReviewStore({ notifyLocal: utils.notifyLocal });

// Configura e registra os ouvintes de eventos globais da interface unindo utilitários e stores
setupStoreEvents({ ...utils, ...cart, ...favorites, ...products, ...reviews, updateCounters });