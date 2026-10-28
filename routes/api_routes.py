import os
from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.get("/supabase-config")
def supabase_config():
    project_url = os.getenv("SUPABASE_URL", "").strip()
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", os.getenv("SUPABASE_ANON_KEY", "")).strip()
    if not project_url or not publishable_key:
        return jsonify({"error": "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no arquivo .env."}), 503
    return jsonify({"url": project_url, "key": publishable_key})