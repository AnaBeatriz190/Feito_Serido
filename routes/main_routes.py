"""
Módulo de Rotas Principais (Main Routes) para o Projeto Feito no Seridó
Gerencia o sistema de aliases de rotas, renderização dinâmica de páginas HTML através de templates,
injeção de scripts auxiliares de estado e autenticação, e controle de navegação principal.
"""

import json
from flask import Blueprint, Response, abort, current_app, redirect, render_template, request, url_for

# Define o Blueprint principal da aplicação
main_bp = Blueprint("main", __name__)

# Dicionário de mapeamento de aliases de rotas amigáveis para os slugs reais dos templates
ROUTE_ALIASES = {
    "ajuda-artesa": "sobre_nos",
    "ajuda-e-politicas": "sobre_nos",
    "artesa-dona-zefinha": "detalhes_produto",
    "artesao-mestre-tiao": "detalhes_produto",
    "artesas-e-produtores": "artesas_produtores",
    "cadastro-artesao": "cadastrar_login",
    "carrinho": "carrinho_compras",
    "catalogo-pecas": "catalogo",
    "categoria-ceramica": "catalogo",
    "categoria-couro": "catalogo",
    "categoria-culinaria": "sabores_sertao",
    "categoria-rendas": "catalogo",
    "cooperativas-picui": "artesas_produtores",
    "encomenda-personalizada": "detalhes_produto",
    "favoritos": "produtos_favoritos",
    "guia-vendedor": "cadastrar_login",
    "inicio": "home",
    "loja-dona-zefinha": "artesas_produtores",
    "mensagens-clientes": "mensagens_avaliacoes",
    "mensagens-compradoras": "mensagens_avaliacoes",
    "minha-conta": "cadastrar_login",
    "origem-picui": "artesas_produtores",
    "painel-artesa": "painel_produtores",
    "pedidos-despachos": "meus_pedidos",
    "produtos": "catalogo",
    "repasses-financeiro": "extrato_repasse",
    "sabores-do-serido": "sabores_sertao",
    "sair-painel": "home",
    "selo-origem-doc": "sobre_nos",
    "selo-origem-picui": "artesas_produtores",
    "sobre-o-projeto": "sobre_nos",
    "mensagem-audio": "mensagem_audio",
    "cadastro-peca": "cadastro_peca",
    "etiqueta-envio": "etiqueta_envio",
    "verificacao-pedido": "verificacao_pedido",
    "pedido-finalizado": "pedido_finalizado",
    "detalhes-produto": "detalhes_produto",
    "explorar-produtos": "explorar_produtos",
    "extrato-repasse": "extrato_repasse",
    "mensagens-avaliacoes": "mensagens_avaliacoes",
    "meus-pedidos": "meus_pedidos",
    "painel-produtores": "painel_produtores",
    "produtos-favoritos": "produtos_favoritos",
    "sabores-sertao": "sabores_sertao",
    "sobre-nos": "sobre_nos",
}

def add_page_links(html, page_slug):
    """
    Injeta dinamicamente scripts de manipulação de links, SDK do Supabase e o estado da loja
    diretamente no código HTML antes de enviá-lo ao navegador.
    """
    if not html.strip():
        return html

    routes_json = json.dumps(ROUTE_ALIASES).replace("<", "\\u003c")
    active_navigation = {
        "home": "inicio",
        "catalogo": "produtos",
        "artesas_produtores": "artesas-e-produtores",
        "sobre_nos": "sobre-o-projeto",
        "sabores_sertao": "sabores-do-serido",
    }.get(page_slug, "")
    
    base_path = url_for("main.index")
    
    # Constrói o bloco de script JavaScript para remapear rotas e destacar o item de menu ativo
    script = f"""<script>
(() => {{
    const routes = {routes_json};
    const basePath = {json.dumps(base_path)};
    const activeNavigation = {json.dumps(active_navigation)};
    document.querySelectorAll('a[data-path]').forEach((link) => {{
        const destination = routes[link.dataset.path];
        if (destination) link.href = basePath + destination;
    }});
    const activeLink = activeNavigation
        ? document.querySelector(`header nav a[data-path="${{activeNavigation}}"]`)
        : null;
    if (activeLink) {{
        activeLink.className = 'font-label-lg text-label-lg text-primary font-bold bg-surface-container border border-primary shadow-sm px-3 py-2 rounded-lg transition-colors hover:text-on-surface whitespace-nowrap';
        activeLink.setAttribute('aria-current', 'page');
    }}
}})();
</script>"""
    
    # Adiciona o SDK do Supabase em páginas específicas que necessitam de banco de dados
    if page_slug in {"cadastrar_login", "cadastro_peca", "catalogo", "detalhes_produto", "painel_produtores"}:
        script += '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    
    # Adiciona o script principal de estado da loja como módulo
    script += '<script type="module" src="/static/store-state.js"></script>'
    
    # Adiciona o script específico de autenticação na página de login/cadastro
    if page_slug == "cadastrar_login":
        script += '<script src="/static/supabase-auth.js" defer></script>'
        
    # Insere os scripts gerados logo antes da tag de fechamento do corpo (</body>)
    if "</body>" in html:
        return html.replace("</body>", f"{script}</body>", 1)
    return html + script

@main_bp.get("/")
def index():
    """Redireciona a rota raiz (/) para a página inicial (home)."""
    return redirect(url_for("main.page", slug="home"))

@main_bp.route("/<path:slug>", methods=["GET", "POST"])
def page(slug):
    """
    Gerencia todas as requisições de páginas e rotas dinâmicas do site.
    Resolve aliases, valida a existência do template correspondente e injeta os links e scripts.
    """
    # Intercepta rotas de checkout pendentes de integração com o Mercado Pago
    if slug == "checkout/processar" and request.method == "POST":
        return jsonify({
            "error": "O checkout ainda não está conectado ao Mercado Pago. Nenhuma cobrança foi criada."
        }), 503

    page_slug = slug.removesuffix(".html")
    page_slug = ROUTE_ALIASES.get(page_slug, page_slug)
    
    # Impede o acesso direto à página de finalização de pedido sem pagamento aprovado
    if page_slug == "pedido_finalizado":
        return jsonify({
            "error": "Nenhum pedido foi confirmado. A página de confirmação só será liberada após pagamento aprovado."
        }), 503

    template_name = f"{page_slug}.html"
    
    # Verifica se o template HTML existe na pasta de templates antes de renderizar
    try:
        html = render_template(template_name)
    except Exception:
        abort(404)

    return Response(add_page_links(html, page_slug), content_type="text/html; charset=utf-8")