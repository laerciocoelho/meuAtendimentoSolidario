from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from models import User

users_bp = Blueprint("users", __name__, url_prefix="/users")

def serialize_user(u: User):
    return {
        "id": u.id,
        "tipo": u.tipo,
        "email": u.email,
        "nome": u.nome,
        "telefone": u.telefone,
        "cep": u.cep,
        "endereco": u.endereco,
        "especialidade_necessaria": u.especialidade_necessaria,
        "descricao_necessidade": u.descricao_necessidade,
        "especialidade": u.especialidade,
        "local_atendimento": u.local_atendimento,
        "registro_conselho": u.registro_conselho,
        "cidade": u.cidade,
        "criado_em": u.criado_em.isoformat()
    }

# Lista todos os usuários
@users_bp.get("/")
@jwt_required()
def listar_todos():
    # Exemplo simples, sem filtro por perfil.
    # Poderia verificar: if get_jwt().get("tipo") != "admin": return 403
    usuarios = User.query.order_by(User.criado_em.desc()).all()
    return jsonify([serialize_user(u) for u in usuarios])

# Lista apenas pacientes
@users_bp.get("/pacientes")
@jwt_required()
def listar_pacientes():
    usuarios = User.query.filter_by(tipo="paciente").order_by(User.criado_em.desc()).all()
    return jsonify([serialize_user(u) for u in usuarios])

# Lista apenas profissionais
@users_bp.get("/profissionais")
@jwt_required()
def listar_profissionais():
    usuarios = User.query.filter_by(tipo="profissional").order_by(User.criado_em.desc()).all()
    return jsonify([serialize_user(u) for u in usuarios])

# Buscar por email (?email=)
@users_bp.get("/buscar")
@jwt_required()
def buscar_por_email():
    email = request.args.get("email")
    if not email:
        return jsonify({"message": "Informe o parâmetro ?email="}), 400
    u = User.query.filter_by(email=email).first()
    if not u:
        return jsonify({"message": "Usuário não encontrado"}), 404
    return jsonify(serialize_user(u))

# Buscar por ID
@users_bp.get("/<int:user_id>")
@jwt_required()
def obter_por_id(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify({"message": "Usuário não encontrado"}), 404
    return jsonify(serialize_user(u))
