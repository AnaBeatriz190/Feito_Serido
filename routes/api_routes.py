"""
Módulo de Rotas de API (API Routes) para o Projeto Feito no Seridó
Responsável por fornecer endpoints de configuração e serviços em nuvem para o frontend,
como a disponibilização segura das credenciais de conexão com o Supabase através de variáveis de ambiente.
"""

import os
from flask import Blueprint, jsonify

# Define o Blueprint de API com o prefixo de URL "/api"
api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.get("/supabase-config")
def supabase_config():
    """
    Endpoint para recuperar e fornecer as chaves de configuração pública do Supabase.
    Lê as variáveis de ambiente SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY).
    Retorna um erro 503 caso as credenciais não estejam devidamente configuradas no arquivo .env.
    """
    project_url = os.getenv("SUPABASE_URL", "").strip()
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", os.getenv("SUPABASE_ANON_KEY", "")).strip()
    
    # Valida se as credenciais essenciais foram preenchidas no ambiente
    if not project_url or not publishable_key:
        return jsonify({"error": "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no arquivo .env."}), 503
        
    return jsonify({"url": project_url, "key": publishable_key})