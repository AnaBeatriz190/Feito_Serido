(() => {
  const CART_KEY = "feito-serido.cart.v1";
  const FAVORITES_KEY = "feito-serido.favorites.v1";
  const LISTS_KEY = "feito-serido.favorite-lists.v1";
  const PRODUCTS_KEY = "feito-serido.products.v1";
  const CLOUD_PRODUCTS_KEY = "feito-serido.cloud-products.v1";
  const DRAFTS_KEY = "feito-serido.product-drafts.v1";
  const REVIEWS_KEY = "feito-serido.reviews.v1";
  const CLOUD_REVIEWS_KEY = "feito-serido.cloud-reviews.v1";
  const DEMO_CART = [
    { id: "item-renda-1", name: "Caminho de Mesa em Renda Labirinto Ponto Palito", price: 145, quantity: 1 },
    { id: "item-renda-2", name: "Toalha de Lavabo Bordada Flor de Mandacaru", price: 35, quantity: 2 },
    { id: "item-queijo-1", name: "Queijo de Coalho Curado na Caatinga 800g", price: 42.5, quantity: 1 },
    { id: "item-vaso-1", name: "Vaso em Cerâmica Terracota com Trançado", price: 92, quantity: 1 },
  ];
  const DEMO_FAVORITES = [];
  const PRODUCT_IDS = new Map([
    ["caminho de mesa em renda labirinto tradicional", "item-renda-1"],
    ["caminho de mesa em renda labirinto ponto palito", "item-renda-1"],
    ["caminho de mesa labirinto", "item-renda-1"],
    ["toalha de lavabo bordada flor de mandacaru", "item-renda-2"],
    ["queijo de coalho curado na caatinga 800g", "item-queijo-1"],
    ["queijo de coalho curado 800g", "item-queijo-1"],
    ["vaso em cerâmica terracota com trançado", "item-vaso-1"],
  ]);
  let cloudClientPromise;

  function readList(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  if (localStorage.getItem(CART_KEY) === null) localStorage.setItem(CART_KEY, JSON.stringify([]));
  if (localStorage.getItem(FAVORITES_KEY) === null) localStorage.setItem(FAVORITES_KEY, JSON.stringify(DEMO_FAVORITES));

  function cartItems() {
    return readList(CART_KEY, []).filter((item) => item && item.id && Number(item.price) >= 0 && Number(item.quantity) > 0);
  }

  function favorites() {
    const unique = new Map();
    readList(FAVORITES_KEY, []).filter((name) => typeof name === "string" && name.trim()).forEach((name) => {
      const key = productId(name);
      if (!unique.has(key)) unique.set(key, name);
    });
    return [...unique.values()];
  }

  function isFavorite(name) {
    const key = productId(name);
    return favorites().some((favorite) => productId(favorite) === key);
  }

  function productId(name) {
    const normalized = String(name || "Produto artesanal").trim().toLocaleLowerCase("pt-BR");
    const knownId = [...PRODUCT_IDS].find(([knownName]) => normalized.includes(knownName) || knownName.includes(normalized))?.[1];
    return knownId || normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function parsePrice(value) {
    const normalized = String(value ?? "0").replace(/[^\d,.-]/g, "");
    const decimal = normalized.includes(",")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized;
    const amount = Number(decimal);
    return Number.isFinite(amount) ? amount : 0;
  }

  function formatBRL(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function getCloudClient() {
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

  async function requireArtisan(client) {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error("Entre em uma conta de artesã ou produtor para continuar.");
    const { data: profile, error } = await client.from("profiles").select("role").eq("id", user.id).single();
    if (error) throw error;
    if (profile.role !== "artisan") throw new Error("Esta ação está disponível apenas para contas de artesãs e produtores.");
    return user;
  }

  async function requireUser(client) {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error("Entre em uma conta para enviar sua avaliação.");
    return user;
  }

  function updateCounters() {
    const totalCart = cartItems().reduce((total, item) => total + Number(item.quantity), 0);
    const totalFavorites = favorites().length;
    document.querySelectorAll('[data-path="carrinho"] span.w-4').forEach((badge) => {
      badge.textContent = String(totalCart);
      badge.setAttribute("aria-label", `${totalCart} ${totalCart === 1 ? "item" : "itens"} no carrinho`);
    });
    document.querySelectorAll('[data-path="favoritos"] span.w-4').forEach((badge) => {
      badge.textContent = String(totalFavorites);
      badge.setAttribute("aria-label", `${totalFavorites} ${totalFavorites === 1 ? "item" : "itens"} favoritos`);
    });
    const favoritesCount = document.getElementById("counter-total-pieces");
    if (favoritesCount) favoritesCount.textContent = `${totalFavorites} ${totalFavorites === 1 ? "Peça Salva" : "Peças Salvas"}`;
    const favoritesSummary = document.getElementById("favorite-summary-count");
    if (favoritesSummary) favoritesSummary.textContent = String(totalFavorites);
    return { totalCart, totalFavorites };
  }

  function updateCatalogCount() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const cards = [...grid.querySelectorAll(":scope > article")];
    const visible = cards.filter((card) => !card.classList.contains("hidden"));
    const countSummary = [...document.querySelectorAll("span")].find((element) => element.textContent.includes("Mostrando"));
    if (countSummary) {
      countSummary.replaceChildren("Mostrando ");
      const visibleCount = document.createElement("strong");
      visibleCount.className = "text-on-surface font-bold";
      visibleCount.textContent = String(visible.length);
      const totalCount = document.createElement("strong");
      totalCount.className = "text-on-surface font-bold";
      totalCount.textContent = String(cards.length);
      countSummary.append(visibleCount, " de ", totalCount, " produtos carregados");
    }
    const catalogCount = [...document.querySelectorAll("span")].find((element) => /\b\d+ Criações\b/.test(element.textContent));
    if (catalogCount) catalogCount.textContent = `${cards.length} produtos carregados`;
  }

  function setupCatalogSearch() {
    const search = document.getElementById("catalog-search");
    const grid = document.getElementById("product-grid");
    if (!search || !grid) return;
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase("pt-BR");
      grid.querySelectorAll(":scope > article").forEach((card) => {
        card.classList.toggle("hidden", !card.textContent.toLocaleLowerCase("pt-BR").includes(query));
      });
      updateCatalogCount();
    });
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCounters();
    syncCartPage();
  }

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

  function iconIsFavorite(button) {
    const icon = button.querySelector(".material-symbols-outlined");
    return Boolean(icon && (icon.textContent.trim() === "favorite" || icon.style.fontVariationSettings.includes("'FILL' 1")));
  }

  function nameFromButton(button, explicitName) {
    if (explicitName) return explicitName;
    if (button.dataset.product) return button.dataset.product;
    const card = button.closest(".product-card, .product-item, article");
    return card?.querySelector("h2, h3, h4")?.textContent.trim() || document.querySelector("main h1")?.textContent.trim() || "Produto artesanal";
  }

  function setButtonFavorite(button, isFavorite) {
    const icon = button.querySelector(".material-symbols-outlined");
    if (!icon) return;
    icon.textContent = isFavorite ? "favorite" : "favorite_border";
    icon.style.fontVariationSettings = isFavorite ? "'FILL' 1" : "'FILL' 0";
    button.classList.toggle("text-primary", isFavorite);
    button.classList.toggle("text-on-surface-variant", !isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
  }

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

  function syncCartPage() {
    const cartRoot = document.getElementById("cart-content-view");
    if (!cartRoot) return;

    const items = cartItems();
    const existingRows = new Map([...cartRoot.querySelectorAll(".cart-item")].map((row) => [row.dataset.id, row]));
    const itemIds = new Set(items.map((item) => item.id));
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
        const quantity = row.querySelector(".qty-input");
        if (quantity) quantity.value = String(item.quantity);
        const display = row.querySelector(".item-total-display");
        if (display) display.textContent = formatBRL(item.price * item.quantity);
      } else {
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

  function updateCartTotals() {
    const items = cartItems();
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const shipping = [...document.querySelectorAll('input[type="radio"][name^="shipping-"]:checked')]
      .reduce((total, input) => total + parsePrice(input.value), 0);
    const count = items.reduce((total, item) => total + item.quantity, 0);
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
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  function productPriceFromCard(card) {
    if (!card) return 0;
    const match = card.textContent.match(/R\$\s*[\d.]+,\d{2}/);
    return match ? parsePrice(match[0]) : 0;
  }

  function productNameFromCard(card) {
    return card?.querySelector("h2, h3, h4")?.textContent.trim() || "Produto artesanal";
  }

  function notifyLocal(message) {
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

  function productFormData() {
    const name = document.getElementById("item-name")?.value.trim() || "";
    const price = parsePrice(document.getElementById("price-input")?.value);
    const dimensions = {
      length_cm: Number(document.getElementById("dim-comprimento")?.value || 0),
      width_cm: Number(document.getElementById("dim-largura")?.value || 0),
      weight_g: Number(document.getElementById("dim-peso")?.value || 0),
    };
    if (!name || price <= 0 || Object.values(dimensions).some((value) => value <= 0)) {
      notifyLocal("Preencha nome, preço, peso e dimensões válidos antes de salvar.");
      return null;
    }
    return {
      id: `local-${crypto.randomUUID()}`,
      slug: `${productId(name)}-${crypto.randomUUID().slice(0, 8)}`,
      name,
      price,
      story: document.getElementById("item-story")?.value.trim() || "",
      stock: Number(document.getElementById("qtd-estoque")?.value || 1),
      availability: document.querySelector('input[name="disponibilidade"]:checked')?.id || "disp-pronta",
      dimensions,
      createdAt: new Date().toISOString(),
    };
  }

  function renderLocalProducts() {
    const products = [...readList(CLOUD_PRODUCTS_KEY, []), ...readList(PRODUCTS_KEY, [])];
    const grid = document.getElementById("product-grid");
    if (grid) {
      grid.querySelectorAll("[data-local-product]").forEach((card) => card.remove());
      products.forEach((product) => {
        const card = document.createElement("article");
        card.dataset.localProduct = product.id;
        card.className = "flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm";
        const title = document.createElement("h3");
        title.className = "font-headline-sm text-on-surface";
        title.textContent = product.name;
        const description = document.createElement("p");
        description.className = "text-sm text-on-surface-variant";
        description.textContent = product.story || "Peça artesanal cadastrada neste navegador.";
        const price = document.createElement("p");
        price.className = "font-bold text-primary";
        price.textContent = formatBRL(product.price);
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "btn-heart self-start text-primary";
        favorite.dataset.product = product.name;
        favorite.dataset.localFavorite = "true";
        favorite.setAttribute("aria-label", `Favoritar ${product.name}`);
        const heart = document.createElement("span");
        heart.className = "material-symbols-outlined";
        heart.textContent = "favorite_border";
        favorite.appendChild(heart);
        const add = document.createElement("button");
        add.type = "button";
        add.className = "w-10 h-10 rounded-lg bg-primary text-on-primary";
        add.setAttribute("aria-label", "Adicionar à Cesta");
        add.textContent = "+";
        card.append(title, description, price, favorite, add);
        grid.appendChild(card);
      });
    }

    if (location.pathname.includes("painel_produtores")) {
      const main = document.querySelector("main");
      if (!main || document.getElementById("local-products-panel")) return;
      const section = document.createElement("section");
      section.id = "local-products-panel";
      section.className = "mx-auto my-6 w-full max-w-7xl px-margin lg:px-margin-desktop";
      const heading = document.createElement("h2");
      heading.className = "mb-3 font-headline-sm text-on-surface";
      heading.textContent = `Produtos cadastrados neste navegador (${products.length})`;
      section.appendChild(heading);
      products.forEach((product) => {
        const item = document.createElement("p");
        item.className = "border-b border-surface-container py-2 text-sm text-on-surface";
        item.textContent = `${product.name} · ${formatBRL(product.price)} · ${product.stock} em estoque`;
        section.appendChild(item);
      });
      if (!products.length) section.append("Nenhum produto cadastrado neste navegador.");
      main.prepend(section);
    }
    updateCatalogCount();
  }

  async function loadCloudProducts() {
    const client = await getCloudClient();
    if (!client) return;
    let query = client.from("products").select("id, slug, name, description, price, stock, status");
    if (location.pathname.includes("painel_produtores")) {
      const { data: { user } } = await client.auth.getUser();
      query = user ? query.eq("owner_id", user.id) : query.eq("status", "published");
    } else {
      query = query.eq("status", "published");
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    const products = (data || []).map((item) => ({
      id: `cloud-${item.id}`,
      slug: item.slug,
      name: item.name,
      story: item.description,
      price: Number(item.price),
      stock: item.stock,
    }));
    localStorage.setItem(CLOUD_PRODUCTS_KEY, JSON.stringify(products));
    renderLocalProducts();
  }

  function renderLocalReviews() {
    const panel = document.getElementById("tab-avaliacoes");
    if (!panel) return;
    const reviews = [...readList(CLOUD_REVIEWS_KEY, []), ...readList(REVIEWS_KEY, [])];
    const summary = panel.querySelector(".font-body-sm.text-body-sm.text-on-surface-variant.mt-1");
    if (summary) summary.textContent = `${reviews.length} avaliações salvas neste navegador`;
    const average = reviews.length
      ? (reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length).toFixed(1)
      : "—";
    const averageElement = panel.querySelector(".font-display-lg.text-display-lg.text-primary.font-bold.leading-none");
    if (averageElement) averageElement.textContent = average;
    const grid = panel.querySelector(":scope > .grid");
    if (!grid) return;
    grid.querySelectorAll("[data-local-review]").forEach((card) => card.remove());
    reviews.forEach((review) => {
      const card = document.createElement("div");
      const isCloudReview = String(review.id).startsWith("cloud-");
      card.dataset[isCloudReview ? "cloudReview" : "localReview"] = review.id;
      card.className = "flex flex-col gap-2 rounded-xl bg-surface p-space-md shadow-sm";
      const author = document.createElement("strong");
      author.className = "text-on-surface";
      author.textContent = review.author;
      const rating = document.createElement("span");
      rating.className = "text-tertiary";
      rating.textContent = `${review.rating} de 5 estrelas${isCloudReview ? (review.verified ? " · Compra verificada" : "") : " · Avaliação local"}`;
      const comment = document.createElement("p");
      comment.className = "text-sm leading-relaxed text-on-surface-variant";
      comment.textContent = review.comment;
      card.append(author, rating, comment);
      grid.prepend(card);
    });
  }

  async function loadCloudReviews() {
    const client = await getCloudClient();
    if (!client) return;
    const { data, error } = await client
      .from("product_reviews")
      .select("id, author_name, rating, comment, verified_purchase, created_at")
      .eq("product_slug", "item-renda-1")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const reviews = (data || []).map((item) => ({
      id: `cloud-${item.id}`,
      author: item.author_name,
      rating: item.rating,
      comment: item.comment,
      verified: item.verified_purchase,
    }));
    localStorage.setItem(CLOUD_REVIEWS_KEY, JSON.stringify(reviews));
    renderLocalReviews();
  }

  function setupLocalReplies() {
    const replyButtons = [...document.querySelectorAll("button")].filter((button) => button.textContent.includes("Publicar Resposta Afetiva"));
    const replies = readList("feito-serido.replies.v1", []);
    replyButtons.forEach((button, index) => {
      const article = button.closest("article");
      const textarea = article?.querySelector("textarea");
      if (!article || !textarea) return;
      const key = article.querySelector(".font-label-md.font-bold")?.textContent.trim() || `resposta-${index}`;
      const saved = replies.find((reply) => reply.key === key);
      if (saved) textarea.value = saved.text;
      button.addEventListener("click", () => {
        const value = textarea.value.trim();
        if (!value) {
          notifyLocal("Escreva uma resposta antes de salvar.");
          return;
        }
        const next = readList("feito-serido.replies.v1", []).filter((reply) => reply.key !== key);
        next.push({ key, text: value, updatedAt: new Date().toISOString() });
        localStorage.setItem("feito-serido.replies.v1", JSON.stringify(next));
        notifyLocal("Resposta salva neste navegador; ainda não foi publicada para o comprador.");
      });
    });
  }

  function showDemoDataNotice() {
    const notices = {
      "/painel_produtores": "Painel demonstrativo: pedidos, avaliações e repasses exibidos não são dados financeiros reais.",
      "/extrato_repasse": "Extrato demonstrativo: os valores não representam repasses reais nem transações do Mercado Pago.",
      "/mensagens_avaliacoes": "Mensagens e métricas são exemplos. Respostas salvas neste navegador não são enviadas aos compradores.",
    };
    const message = notices[location.pathname];
    const main = document.querySelector("main");
    if (!message || !main) return;
    const notice = document.createElement("p");
    notice.className = "mx-auto my-4 w-full max-w-7xl rounded-lg border border-primary bg-primary-fixed/30 px-4 py-3 text-sm text-on-surface";
    notice.setAttribute("role", "note");
    notice.textContent = message;
    main.prepend(notice);
  }

  function showReviewForm() {
    const panel = document.getElementById("tab-avaliacoes");
    if (!panel || document.getElementById("local-review-form")) return;
    const form = document.createElement("form");
    form.id = "local-review-form";
    form.className = "flex flex-col gap-3 rounded-xl bg-surface-container-low p-4";
    form.innerHTML = '<label class="text-sm font-semibold" for="local-review-author">Seu nome</label><input id="local-review-author" class="rounded-lg bg-surface p-3" required maxlength="80"/><label class="text-sm font-semibold" for="local-review-rating">Nota</label><select id="local-review-rating" class="rounded-lg bg-surface p-3"><option value="5">5 estrelas</option><option value="4">4 estrelas</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option></select><label class="text-sm font-semibold" for="local-review-comment">Comentário</label><textarea id="local-review-comment" class="rounded-lg bg-surface p-3" required maxlength="1000" rows="4"></textarea><button class="self-start rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary" type="submit">Salvar avaliação neste navegador</button>';
    panel.insertBefore(form, panel.querySelector(":scope > .grid"));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const review = {
        id: `review-${crypto.randomUUID()}`,
        author: document.getElementById("local-review-author").value.trim(),
        rating: Number(document.getElementById("local-review-rating").value),
        comment: document.getElementById("local-review-comment").value.trim(),
        createdAt: new Date().toISOString(),
      };
      try {
        const client = await getCloudClient();
        if (client) {
          const user = await requireUser(client);
          const { error } = await client.from("product_reviews").insert({
            product_slug: "item-renda-1",
            author_id: user.id,
            author_name: review.author,
            rating: review.rating,
            comment: review.comment,
          });
          if (error) throw error;
          await loadCloudReviews();
          notifyLocal("Avaliação enviada ao Supabase.");
        } else {
          const reviews = readList(REVIEWS_KEY, []);
          reviews.push(review);
          localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
          renderLocalReviews();
          notifyLocal("Avaliação salva neste navegador; não foi publicada para outros usuários.");
        }
        form.reset();
      } catch (error) {
        notifyLocal(error.message || "Não foi possível salvar a avaliação.");
      }
    });
  }

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

  window.addToCart = (name, price) => {
    if (addToCart(name, price)) updateCounters();
  };
  window.toggleFavorite = (button, name) => {
    const itemName = nameFromButton(button, name);
    const shouldFavorite = !isFavorite(itemName);
    setFavorite(itemName, shouldFavorite);
    setButtonFavorite(button, shouldFavorite);
    window.showToast?.(shouldFavorite ? `${itemName} guardado nos favoritos!` : "Removido dos favoritos.");
  };
  window.addToCartAnimation = () => {
    const name = document.querySelector("main h1")?.textContent.trim() || "Caminho de Mesa em Renda Labirinto Ponto Palito";
    addToCart(name, 145);
    window.showToast?.(`${name} adicionado ao carrinho.`);
  };
  window.quickPixCheckout = () => {
    window.addToCartAnimation();
    window.location.assign("/carrinho_compras");
  };
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
  window.calculateShipping = () => {
    const cep = document.getElementById("cep-input")?.value.replace(/\D/g, "") || "";
    if (cep.length !== 8) {
      notifyLocal("Informe um CEP válido com 8 dígitos.");
      return;
    }
    notifyLocal("Cotação Correios indisponível: falta cadastrar origem do vendedor e dimensões da embalagem.");
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const favoritePageHeart = target.closest("#favorites-grid .btn-heart");
    if (favoritePageHeart) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = nameFromButton(favoritePageHeart);
      setFavorite(name, !isFavorite(name));
      syncFavoriteButtons();
      return;
    }

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

    if (button?.textContent.includes("Escrever Avaliação")) {
      event.preventDefault();
      showReviewForm();
      return;
    }

    if (button?.textContent.includes("Cadastrar Nova Peça")) {
      event.preventDefault();
      window.location.assign("/cadastro_peca");
      return;
    }

    const emptyButton = target.closest("#btn-simulate-empty");
    if (emptyButton) {
      saveCart([]);
      syncCartPage();
      return;
    }

    const clearButton = target.closest("#btn-clear-cart");
    if (clearButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.confirm("Deseja realmente esvaziar todo o carrinho?")) saveCart([]);
      return;
    }

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

    const cartControl = target.closest(".qty-btn-plus, .qty-btn-minus, .btn-remove-item");
    if (cartControl) window.setTimeout(() => persistCartRow(cartControl), 0);

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

    const addButton = target.closest(".btn-add-cart, button[aria-label^='Adicionar à Cesta']");
    if (addButton) {
      const card = addButton.closest(".product-card, article");
      addToCart(productNameFromCard(card), productPriceFromCard(card));
    }

    const moveAllButton = target.closest("#btn-move-all");
    if (moveAllButton) {
      document.querySelectorAll(".product-card").forEach((card) => {
        const name = productNameFromCard(card);
        const price = productPriceFromCard(card);
        if (price) addToCart(name, price);
      });
    }

    const addSelected = target.closest("#btn-bulk-cart");
    if (addSelected) {
      document.querySelectorAll("#favorites-grid .product-card").forEach((card) => {
        if (!card.querySelector(".product-checkbox")?.checked) return;
        const name = productNameFromCard(card);
        const price = parsePrice(card.dataset.price);
        if (price) addToCart(name, price);
      });
    }

    const removeSelected = target.closest("#btn-bulk-remove");
    if (removeSelected) {
      document.querySelectorAll("#favorites-grid .product-card").forEach((card) => {
        if (!card.querySelector(".product-checkbox")?.checked) return;
        const button = card.querySelector(".btn-heart");
        if (button) setFavorite(nameFromButton(button), false);
      });
      syncFavoriteButtons();
    }

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

  window.addEventListener("storage", (event) => {
    if ([CART_KEY, FAVORITES_KEY].includes(event.key)) {
      updateCounters();
      syncFavoriteButtons();
      syncCartPage();
    }
  });

  document.querySelectorAll("input[type='radio'][name^='shipping-']").forEach((radio) => {
    radio.addEventListener("change", updateCartTotals);
  });

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
  if (document.getElementById("product-grid") || location.pathname.includes("painel_produtores")) {
    loadCloudProducts().catch((error) => notifyLocal(error.message || "Não foi possível carregar o catálogo do Supabase."));
  }
  if (document.getElementById("tab-avaliacoes")) {
    loadCloudReviews().catch((error) => notifyLocal(error.message || "Não foi possível carregar as avaliações do Supabase."));
  }
})();
