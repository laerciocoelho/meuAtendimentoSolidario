import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from database import db
from auth import auth_bp


google_api_key = os.getenv("GOOGLE_API_KEY")


def create_app():
    load_dotenv()

    app = Flask(__name__)

    # Banco de dados: por padrão SQLite local; pode sobrescrever via variável de ambiente
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///db.sqlite3")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "chave-muito-secreta-em-dev")  # troque em produção

    # Inicializações
    db.init_app(app)

    # --- Ajuste de CORS ---
    # Para liberar tudo (todas as origens e endpoints)
    # CORS(app)

    # Para liberar apenas para seu frontend, por ex. http://localhost:3000
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

    JWTManager(app)  # habilita JWT

    # Cria tabelas (somente em dev; em prod use migrações)
    with app.app_context():
        db.create_all()

    # Health check
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    # Blueprints
    app.register_blueprint(auth_bp)

    return app


if __name__ == "__main__":
    # Para acessar a partir de outras máquinas/rede, troque host="0.0.0.0"
    app = create_app()
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", 5000)), debug=True)
