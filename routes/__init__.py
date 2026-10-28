"""
Inicializador e Registrador de Blueprints (Routes Init) para o Projeto Feito no Seridó
Responsável por importar os módulos de rotas (páginas principais e APIs) e registrar
todos os blueprints na instância principal da aplicação Flask.
"""

from .main_routes import main_bp
from .api_routes import api_bp

def register_blueprints(app):
    """
    Registra todos os conjuntos de rotas (blueprints) na aplicação Flask principal.
    Permite modularizar a arquitetura, separando navegação de páginas e endpoints de API.
    """
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)