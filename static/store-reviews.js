/**
 * Gerenciador de Avaliações e Avisos da Loja (Store Reviews) para o Projeto Feito no Seridó
 * Responsável por renderizar avaliações locais e da nuvem, carregar dados do Supabase,
 * gerenciar respostas de produtores, exibir avisos demonstrativos e processar novos reviews.
 */

import { CLOUD_REVIEWS_KEY, REVIEWS_KEY, getCloudClient, readList, requireUser } from "./store-state-utils.js";

export function createReviewStore({ notifyLocal }) {
  
  /**
   * Renderiza as avaliações locais e em nuvem na interface da aba de avaliações.
   * Calcula a média de notas, atualiza o resumo e injeta os cards de avaliação no DOM.
   */
  function renderLocalReviews() {
    const panel = document.getElementById("tab-avaliacoes");
    if (!panel) return;
    
    // Combina avaliações armazenadas na nuvem e no armazenamento local
    const reviews = [...readList(CLOUD_REVIEWS_KEY, []), ...readList(REVIEWS_KEY, [])];
    
    // Atualiza o texto de resumo com o total de avaliações
    const summary = panel.querySelector(".font-body-sm.text-body-sm.text-on-surface-variant.mt-1");
    if (summary) summary.textContent = `${reviews.length} avaliações salvas neste navegador`;
    
    // Calcula a média das avaliações (ou exibe um traço se não houver nenhuma)
    const average = reviews.length
      ? (reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length).toFixed(1)
      : "—";
      
    // Atualiza o elemento de exibição da média na tela
    const averageElement = panel.querySelector(".font-display-lg.text-display-lg.text-primary.font-bold.leading-none");
    if (averageElement) averageElement.textContent = average;
    
    const grid = panel.querySelector(":scope > .grid");
    if (!grid) return;
    
    // Remove os cards locais antigos para evitar duplicação na renderização
    grid.querySelectorAll("[data-local-review]").forEach((card) => card.remove());
    
    // Cria e insere dinamicamente os cards de avaliação na grade
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

  /**
   * Carrega as avaliações de produtos diretamente do banco de dados do Supabase.
   */
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

  /**
   * Configura o comportamento dos botões de resposta afetiva dados por produtores às avaliações.
   */
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

  /**
   * Exibe um aviso visual informando que determinadas páginas contêm dados demonstrativos.
   */
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

  /**
   * Cria e exibe dinamicamente o formulário para envio de uma nova avaliação.
   */
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

  return { renderLocalReviews, loadCloudReviews, setupLocalReplies, showDemoDataNotice, showReviewForm };
}