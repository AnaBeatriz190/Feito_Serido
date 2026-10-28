/**
 * Gerenciador de Eventos Globais da Loja (Store State Events) para o Projeto Feito no Seridó
 * Configura interceptações de cliques globais na interface, gerencia carrinho de compras,
 * favoritos, publicação de produtos, cálculo de frete e sincronização com o armazenamento local e nuvem.
 */

export function setupStoreEvents(store) {
  // Desestrutura todas as funções e constantes necessárias do objeto store fornecido
  const {
    addToCart,
    cartItems,
    CART_KEY,
    CLOUD_PRODUCTS_KEY,
    DEMO_CART,
    DRAFTS_KEY,
    FAVORITES_KEY,
    getCloudClient,
    iconIsFavorite,
    isFavorite,
    LISTS_KEY,
    loadCloudProducts,
    loadCloudReviews,
    nameFromButton,
    notifyLocal,
    parsePrice,
    persistCartRow,
    PRODUCTS_KEY,
    productFormData,
    productNameFromCard,
    productPriceFromCard,
    readList,
    renderLocalProducts,
    requireArtisan,
    saveCart,
    setButtonFavorite,
    setFavorite,
    setupCatalogSearch,
    setupLocalReplies,
    showDemoDataNotice,
    showReviewForm,
    syncCartPage,
    syncFavoriteButtons,
    updateCartTotals,
    updateCatalogCount,
    updateCounters,
    renderLocalReviews,
  } = store;

  /**
   * Adiciona um produto ao carrinho e exibe feedback.
   */
  window.addToCart = (name, price) => {
    addToCart(name, price);
  };

  /**
   * Alterna o estado de favorito de um produto a partir de um botão de ação.
   */
  window.toggleFavorite = (button, name) => {
    const itemName = nameFromButton(button, name);
    const shouldFavorite = !isFavorite(itemName);
    setFavorite(itemName, shouldFavorite);
    setButtonFavorite(button, shouldFavorite);
    window.showToast?.(shouldFavorite ? `${itemName} guardado nos favoritos!` : "Removido dos favoritos.");
  };

  /**
   * Simula a adição rápida do produto principal ao carrinho com animação/aviso.
   */
  window.addToCartAnimation = () => {
    const name = document.querySelector("main h1")?.textContent.trim() || "Caminho de Mesa em Renda Labirinto Ponto Palito";
    addToCart(name, 145);
    window.showToast?.(`${name} adicionado ao carrinho.`);
  };

  /**
   * Realiza a compra rápida via Pix adicionando o item atual e redirecionando para o carrinho.
   */
  window.quickPixCheckout = () => {
    window.addToCartAnimation();
    window.location.assign("/carrinho_compras");
  };

  /**
   * Adiciona um produto ao carrinho procurando por seu nome no DOM.
   */
  window.toastAdded = (name) => {
    const card = [...document.querySelectorAll("article")].find((item) => productNameFromCard(item).toLocaleLowerCase("pt-BR").includes(String(name).toLocaleLowerCase("pt-BR")));
    const price = productPriceFromCard(card);
    if (!price) {
      notifyLocal("Não foi possível identificar o preço deste produto.");
      return;
    }
    addToCart(name, price);
    window.showToast?.(`${name} adicionado ao carrinho.`);
  };

  /**
   * Valida o CEP informado e simula o cálculo de frete.
   */
  window.calculateShipping = () => {
    const cep = document.getElementById("cep-input")?.value.replace(/\D/g, "") || "";
    if (cep.length !== 8) {
      notifyLocal("Informe um CEP válido com 8 dígitos.");
      return;
    }
    notifyLocal("Cotação Correios indisponível: falta cadastrar origem do vendedor e dimensões da embalagem.");
  };

  // Ouvinte global de cliques utilizando delegação de eventos (capturing phase)
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    // Gerencia cliques em corações na página de favoritos
    const favoritePageHeart = target.closest("#favorites-grid .btn-heart");
    if (favoritePageHeart) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = nameFromButton(favoritePageHeart);
      setFavorite(name, !isFavorite(name));
      syncFavoriteButtons();
      return;
    }

    // Gerencia o envio e publicação de um novo produto (salvando no Supabase ou LocalStorage)
    const publishButton = target.closest("#btn-submit");
    if (publishButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const product = productFormData();
      if (!product) return;
      publishButton.disabled = true;
      getCloudClient().then(async (client) => {
        if (client) {
          const user = await requireArtisan(client);
          const { data, error } = await client.from("products").insert({
            owner_id: user.id,
            slug: product.slug,
            name: product.name,
            description: product.story,
            price: product.price,
            stock: product.stock,
            length_cm: product.dimensions.length_cm,
            width_cm: product.dimensions.width_cm,
            weight_g: product.dimensions.weight_g,
            status: "published",
          }).select("id, slug, name, description, price, stock").single();
          if (error) throw error;
          const remoteProducts = readList(CLOUD_PRODUCTS_KEY, []);
          remoteProducts.unshift({ ...data, id: `cloud-${data.id}`, story: data.description, price: Number(data.price) });
          localStorage.setItem(CLOUD_PRODUCTS_KEY, JSON.stringify(remoteProducts));
          notifyLocal("Produto publicado no catálogo do Supabase.");
        } else {
          const products = readList(PRODUCTS_KEY, []);
          products.push(product);
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
          notifyLocal("Produto salvo neste navegador; não foi publicado para outros usuários.");
        }
        renderLocalProducts();
      }).catch((error) => notifyLocal(error.message || "Não foi possível salvar o produto."))
        .finally(() => { publishButton.disabled = false; });
      return;
    }

    // Salva o produto atual como rascunho no localStorage
    const button = target.closest("button");
    if (button?.textContent.includes("Salvar como Rascunho")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const product = productFormData();
      if (!product) return;
      const drafts = readList(DRAFTS_KEY, []);
      drafts.push(product);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      notifyLocal("Rascunho salvo neste navegador.");
      return;
    }

    // Exibe o formulário de avaliação
    if (button?.textContent.includes("Escrever Avaliação")) {
      event.preventDefault();
      showReviewForm();
      return;
    }

    // Redireciona para a página de cadastro de nova peça
    if (button?.textContent.includes("Cadastrar Nova Peça")) {
      event.preventDefault();
      window.location.assign("/cadastro_peca");
      return;
    }

    // Simula carrinho vazio
    const emptyButton = target.closest("#btn-simulate-empty");
    if (emptyButton) {
      saveCart([]);
      return;
    }

    // Esvazia totalmente o carrinho com confirmação
    const clearButton = target.closest("#btn-clear-cart");
    if (clearButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.confirm("Deseja realmente esvaziar todo o carrinho?")) saveCart([]);
      return;
    }

    // Prossegue para a verificação/checkout do pedido
    const checkoutButton = target.closest("#btn-checkout");
    if (checkoutButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!cartItems().length) {
        window.showToast?.("Adicione itens antes de continuar.");
        return;
      }
      window.location.assign("/verificacao_pedido");
      return;
    }

    // Restaura o carrinho de demonstração (Demo Cart)
    const restoreButton = target.closest("#btn-restore-cart");
    if (restoreButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (cartItems().length) return;
      localStorage.setItem(CART_KEY, JSON.stringify(DEMO_CART));
      updateCounters();
      window.setTimeout(syncCartPage, 0);
      return;
    }

    // Persiste alterações nas linhas do carrinho (quantidade + / - ou remoção)
    const cartControl = target.closest(".qty-btn-plus, .qty-btn-minus, .btn-remove-item");
    if (cartControl) window.setTimeout(() => persistCartRow(cartControl), 0);

    // Gerencia cliques em botões de favoritos (coração) em cards gerais
    const heartButton = target.closest(".btn-heart, .btn-suggestion-heart, #btn-fav, button[aria-label*='Favoritar']");
    if (heartButton) {
      window.setTimeout(() => {
        const name = nameFromButton(heartButton);
        const hasPageHandler = (heartButton.matches(".btn-heart, .btn-suggestion-heart, #btn-fav") && !heartButton.hasAttribute("data-local-favorite")) || heartButton.hasAttribute("onclick");
        const nextState = hasPageHandler ? iconIsFavorite(heartButton) : !isFavorite(name);
        setFavorite(name, nextState);
        syncFavoriteButtons();
      }, 0);
    }

    // Adiciona produto ao carrinho a partir de botões em cards de produtos
    const addButton = target.closest(".btn-add-cart, button[aria-label^='Adicionar à Cesta']");
    if (addButton) {
      const card = addButton.closest(".product-card, article");
      addToCart(productNameFromCard(card), productPriceFromCard(card));
    }

    // Move todos os produtos visíveis para o carrinho
    const moveAllButton = target.closest("#btn-move-all");
    if (moveAllButton) {
      document.querySelectorAll(".product-card").forEach((card) => {
        const name = productNameFromCard(card);
        const price = productPriceFromCard(card);
        if (price) addToCart(name, price);
      });
    }

    // Adiciona em massa os produtos selecionados (checkbox) dos favoritos ao carrinho
    const addSelected = target.closest("#btn-bulk-cart");
    if (addSelected) {
      document.querySelectorAll("#favorites-grid .product-card").forEach((card) => {
        if (!card.querySelector(".product-checkbox")?.checked) return;
        const name = productNameFromCard(card);
        const price = parsePrice(card.dataset.price);
        if (price) addToCart(name, price);
      });
    }

    // Remove em massa os produtos selecionados dos favoritos
    const removeSelected = target.closest("#btn-bulk-remove");
    if (removeSelected) {
      document.querySelectorAll("#favorites-grid .product-card").forEach((card) => {
        if (!card.querySelector(".product-checkbox")?.checked) return;
        const button = card.querySelector(".btn-heart");
        if (button) setFavorite(nameFromButton(button), false);
      });
      syncFavoriteButtons();
    }

    // Cria uma nova lista personalizada de favoritos
    const createListButton = target.closest("#btn-create-list");
    if (createListButton) {
      const name = window.prompt("Nome da nova lista de favoritos:")?.trim();
      if (name) {
        const lists = readList(LISTS_KEY, []);
        lists.push({ name, products: [] });
        localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        window.showToast?.(`Lista ${name} criada.`);
      }
    }
  }, true);

  // Sincroniza o estado e contadores caso ocorram alterações no localStorage em outras abas
  window.addEventListener("storage", (event) => {
    if ([CART_KEY, FAVORITES_KEY].includes(event.key)) {
      updateCounters();
      syncFavoriteButtons();
      syncCartPage();
    }
  });

  // Atualiza os totais do carrinho ao alterar as opções de frete (radio buttons)
  document.querySelectorAll("input[type='radio'][name^='shipping-']").forEach((radio) => {
    radio.addEventListener("change", updateCartTotals);
  });

  // Execuções iniciais de sincronização, renderização e carregamento de dados ao iniciar o módulo
  updateCounters();
  syncFavoriteButtons();
  syncCartPage();
  renderLocalProducts();
  syncFavoriteButtons();
  renderLocalReviews();
  setupLocalReplies();
  showDemoDataNotice();
  setupCatalogSearch();
  updateCatalogCount();
  
  // Carrega produtos do Supabase se estiver na grade de produtos ou no painel de produtores
  if (document.getElementById("product-grid") || location.pathname.includes("painel_produtores")) {
    loadCloudProducts().catch((error) => notifyLocal(error.message || "Não foi possível carregar o catálogo do Supabase."));
  }
  
  // Carrega avaliações do Supabase se estiver na aba de avaliações
  if (document.getElementById("tab-avaliacoes")) {
    loadCloudReviews().catch((error) => notifyLocal(error.message || "Não foi possível carregar as avaliações do Supabase."));
  }
}