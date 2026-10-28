import os
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask

from routes import register_blueprints

# Configuração do Caminho e Variáveis de Ambiente
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

def create_app():
    app = Flask(__name__)
    
    # Registra todas as rotas modularizadas através dos blueprints
    register_blueprints(app)
    
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)