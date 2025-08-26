from flask import Blueprint, request, jsonify, url_for
from database import db
from models import User, PasswordReset, SorteioAtendimento, Atendimento
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from utils.email_utils import enviar_email
import re, random
from sqlalchemy import or_, select, and_, func, desc, asc

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Mapeamento status interno => status amigável para o frontend
STATUS_LABELS = {
    "cancelado_paciente": "Cancelado pelo paciente",
    "cancelado_profissional": "Cancelado pelo profissional",
    "aguardando_sorteio": "Aguardando sorteio",
    "sorteado_em_atendimento": "Em atendimento",
    "atendimento_concluido": "Concluído",
    "finalizado_profissional": "Aguardando confirmação de conclusão",
    "atendimento_expirado": "Atendimento expirado",
    "inscricao_expirada" : "Inscrição expirada" 
    # Inclua outros status do seu sistema aqui conforme usados...
}

def status_amigavel(status):
    return STATUS_LABELS.get(status, status.capitalize())

# ------------------------
# Funções Auxiliares
# ------------------------
def serialize_user(u: User):
    return {
        "id": u.id,
        "tipo": u.tipo,
        "email": u.email,
        "nome": u.nome,
        "telefone": u.telefone,
        "cep": u.cep,
        "endereco": u.endereco,
        "bairro": u.bairro,
        "estado": u.estado,
        "municipio": u.municipio,
        "criado_em": u.criado_em.isoformat(),
        "cpf": u.cpf,
        "especialidade_necessaria": u.especialidade_necessaria,
        "descricao_necessidade": u.descricao_necessidade,
        "especialidade": u.especialidade,
        "local_atendimento": u.local_atendimento,
        "registro_conselho": u.registro_conselho,
        "uf_registro": u.uf_registro,
        "cidade": u.cidade,
    }


def is_cpf_valido(cpf: str) -> bool:
    num = re.sub(r"\D", "", cpf or "")
    if len(num) != 11 or num == num[0] * 11:
        return False

    def calc_dv(base):
        soma = sum(int(d) * (len(base) + 1 - i) for i, d in enumerate(base))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    return calc_dv(num[:9]) == int(num[9]) and calc_dv(num[:10]) == int(num[10])

def finalizar_atendimentos_nao_confirmados():
    limite = datetime.utcnow() - timedelta(days=30)
    atendimentos = Atendimento.query.filter(
        Atendimento.status == "finalizado_profissional",
        Atendimento.data_fim <= limite,
        (Atendimento.data_confirmacao == None)
    ).all()

    for a in atendimentos:
        a.status = "finalizado_nao_confirmado"

    db.session.commit()


# ------------------------
# Cadastro - PACIENTE
# ------------------------
@auth_bp.post("/register/paciente")
def register_paciente():
    data = request.get_json() or {}
    required = ["cpf", "email", "senha", "nome", "telefone", "cep", "endereco",
                "especialidade_necessaria", "descricao_necessidade", "estado", "municipio"]
    if any(not data.get(k) for k in required):
        return jsonify({"message": "Todos os campos são obrigatórios."}), 400

    cpf_normalizado = re.sub(r"\D", "", data["cpf"])
    if not is_cpf_valido(cpf_normalizado):
        return jsonify({"message": "CPF inválido."}), 400
    if User.query.filter_by(cpf=cpf_normalizado).first():
        return jsonify({"message": "CPF já cadastrado."}), 409

    user = User(
        tipo="paciente", cpf=cpf_normalizado,
        email=data["email"], senha_hash=generate_password_hash(data["senha"]),
        nome=data["nome"], telefone=data["telefone"], cep=data["cep"],
        endereco=data["endereco"], bairro=data.get("bairro"),
        estado=data["estado"], municipio=data["municipio"],
        especialidade_necessaria=data["especialidade_necessaria"],
        descricao_necessidade=data["descricao_necessidade"]
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Paciente cadastrado com sucesso!", "id": user.id}), 201

# ------------------------
# Cadastro - PROFISSIONAL
# ------------------------
@auth_bp.post("/register/profissional")
def register_profissional():
    data = request.get_json() or {}
    required = ["email", "senha", "nome", "cep", "endereco", "estado", "municipio",
                "especialidade", "local_atendimento", "registro_conselho",
                "uf_registro", "cidade"]
    if any(not data.get(k) for k in required):
        return jsonify({"message": "Todos os campos são obrigatórios, exceto telefone."}), 400

    registro = data["registro_conselho"].strip()
    uf = data["uf_registro"].strip().upper()
    if User.query.filter_by(tipo="profissional", registro_conselho=registro, uf_registro=uf).first():
        return jsonify({"message": "Registro de conselho já cadastrado para esta UF."}), 409

    user = User(
        tipo="profissional", email=data["email"],
        senha_hash=generate_password_hash(data["senha"]), nome=data["nome"],
        telefone=data.get("telefone"), cep=data["cep"], endereco=data["endereco"],
        bairro=data.get("bairro"), estado=data["estado"], municipio=data["municipio"],
        especialidade=data["especialidade"], local_atendimento=data["local_atendimento"],
        registro_conselho=registro, uf_registro=uf, cidade=data["cidade"]
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Profissional cadastrado com sucesso!", "id": user.id}), 201

# ------------------------
# Login
# ------------------------
@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    if not all([data.get("email"), data.get("senha"), data.get("tipo")]):
        return jsonify({"message": "Informe e-mail, senha e tipo de usuário."}), 400

    user = User.query.filter_by(email=data["email"], tipo=data["tipo"]).first()
    if not user or not check_password_hash(user.senha_hash, data["senha"]):
        return jsonify({"message": "Credenciais inválidas."}), 401

    token = create_access_token(identity=str(user.id),
                                additional_claims={"tipo": user.tipo},
                                expires_delta=timedelta(hours=8))
    return jsonify({"access_token": token, "user": serialize_user(user)})


@auth_bp.get("/me")
@jwt_required()
def me():
    u = User.query.get(get_jwt_identity())
    if not u:
        return jsonify({"message": "Usuário não encontrado"}), 404
    return jsonify(serialize_user(u))


# ------------------------
# Atualização de Dados - PACIENTE
# ------------------------
@auth_bp.put("/paciente/atualizar")
@jwt_required()
def atualizar_paciente():
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Acesso negado"}), 403
    data = request.get_json() or {}
    u = User.query.get(get_jwt_identity())
    if not u:
        return jsonify({"message": "Usuário não encontrado"}), 404
    for campo in ["email", "nome", "telefone", "cep", "endereco", "bairro", "estado", "municipio"]:
        if campo in data:
            setattr(u, campo, data[campo])
    db.session.commit()
    return jsonify({"message": "Dados atualizados com sucesso", "user": serialize_user(u)})

# ------------------------
# Atualização de Dados - PROFISSIONAL
# ------------------------
@auth_bp.put("/profissional/atualizar")
@jwt_required()
def atualizar_profissional():
    if get_jwt().get("tipo") != "profissional":
        return jsonify({"message": "Acesso negado"}), 403
    data = request.get_json() or {}
    u = User.query.get(get_jwt_identity())
    if not u:
        return jsonify({"message": "Usuário não encontrado"}), 404
    for campo in ["email", "nome", "telefone", "cep", "endereco", "bairro",
                  "estado", "municipio", "especialidade", "local_atendimento", "cidade"]:
        if campo in data:
            setattr(u, campo, data[campo])
    db.session.commit()
    return jsonify({"message": "Dados atualizados com sucesso", "user": serialize_user(u)})


# ------------------------
# ENVIAR CODIGO RECUPERACAO SENHA
# ------------------------
@auth_bp.post("/enviar-codigo")
def enviar_codigo():
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return jsonify({"message": "E-mail é obrigatório"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "E-mail não encontrado"}), 404

    codigo = f"{random.randint(100000,999999)}"
    PasswordReset.query.filter_by(email=email).delete()
    db.session.add(PasswordReset(email=email, codigo=codigo))
    db.session.commit()

    assunto = "Recuperação de Senha"
    corpo = f"Seu código é {codigo} e expira em 10 minutos."
    if enviar_email(email, assunto, corpo):
        return jsonify({"message": "Código enviado para o e-mail."}), 200
    return jsonify({"message": "Erro ao enviar e-mail."}), 500

# ------------------------
# VALIDAR CODIGO RECUPERACAO SENHA
# ------------------------
@auth_bp.post("/verificar-codigo")
def verificar_codigo():
    data = request.get_json() or {}
    pr = PasswordReset.query.filter_by(email=data.get("email"), codigo=data.get("codigo")).first()
    if not pr:
        return jsonify({"message": "Código inválido"}), 400
    if pr.expira_em < datetime.utcnow():
        return jsonify({"message": "Código expirado"}), 400
    return jsonify({"message": "Código verificado com sucesso."}), 200

# ------------------------
# RESETAR SENHA
# ------------------------
@auth_bp.post("/resetar-senha")
def resetar_senha():
    data = request.get_json() or {}
    pr = PasswordReset.query.filter_by(email=data.get("email"), codigo=data.get("codigo")).first()
    if not pr:
        return jsonify({"message": "Código inválido"}), 400
    if pr.expira_em < datetime.utcnow():
        return jsonify({"message": "Código expirado"}), 400
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
    user.senha_hash = generate_password_hash(data["nova_senha"])
    db.session.delete(pr)
    db.session.commit()
    return jsonify({"message": "Senha alterada com sucesso!"}), 200

# ------------------------
# Histórico de Atendimentos - Area do Paciente
# ------------------------
#Retorna a lista de atendimentos para o paciente logado na area do paciente
@auth_bp.get("/paciente/atendimentos")
@jwt_required()
def listar_atendimentos_paciente():
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Apenas pacientes podem acessar seus atendimentos."}), 403

    paciente_id = get_jwt_identity()
    atendimentos = Atendimento.query.filter_by(paciente_id=paciente_id) \
                                    .order_by(Atendimento.data_inicio.desc()).all()
    return jsonify([
        {
            "id": a.id,
            "especialidade": a.especialidade,
            "status": a.status,
            "status_legivel": status_amigavel(a.status),  # <-- adicionado
            "profissional": a.profissional.nome if a.profissional else None,
            "data_inicio": a.data_inicio.isoformat() if a.data_inicio else None,
            "data_fim": a.data_fim.isoformat() if a.data_fim else None
        } for a in atendimentos
    ]), 200

# ------------------------
# Lista de Inscrições(Sorteios) - Paciente
# ------------------------
#Retorna a lista de inscricoes para o paciente logado na area do paciente
@auth_bp.get("/paciente/sorteios")
@jwt_required()
def listar_sorteios_paciente():
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Apenas pacientes podem ver seus sorteios."}), 403

    paciente_id = get_jwt_identity()

    # Busca somente inscrições que estão em 'aguardando_sorteio'
    sorteios = SorteioAtendimento.query.filter_by(
        paciente_id=paciente_id,
        status='aguardando_sorteio'
    ).all()

    vistos = set()
    result = []
    for s in sorteios:
        esp = s.especialidade
        if esp not in vistos:
            result.append({
            "id": s.id,
            "especialidade": s.especialidade,
            "profissional_municipio": s.municipio,
            "profissional_estado": s.estado,
            "data_inscricao": s.data_inscricao.isoformat() if s.data_inscricao else None,
            "data_expiracao": s.data_expiracao.isoformat() if s.data_expiracao else None,
            #"status": s.status,
            "status_legivel": status_amigavel(s.status),
        })

            vistos.add(esp)

    return jsonify(result), 200


# ------------------------
# Criar Inscrição(Sorteio) - Paciente
# ------------------------
@auth_bp.post("/paciente/sorteios")
@jwt_required()
def criar_sorteio_paciente():
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Apenas pacientes podem se inscrever"}), 403

    pid = get_jwt_identity()
    data = request.get_json() or {}

    estado = data.get("estado")
    municipio = data.get("municipio")
    especialidade = data.get("especialidade")
    descricao = data.get("descricao")

    # Validação dos campos obrigatórios
    if not all([estado, municipio, especialidade, descricao]):
        return jsonify({"message": "Todos os campos são obrigatórios."}), 400

    agora = datetime.utcnow()

    existe_profissional = User.query.filter_by(
        tipo="profissional",
        especialidade=especialidade,
        estado=estado,
        municipio=municipio
    ).first()

    if not existe_profissional:
        return jsonify({
            "message": (
                f"Não há profissionais cadastrados para a especialidade '{especialidade}' "
                f"em {municipio}/{estado}."
            )
        }), 400

    inscricao_existente = (
        SorteioAtendimento.query
        .filter(
            SorteioAtendimento.paciente_id == pid,
            SorteioAtendimento.especialidade == especialidade,
            SorteioAtendimento.estado == estado,
            SorteioAtendimento.municipio == municipio,
            (SorteioAtendimento.status == "aguardando_sorteio") | (SorteioAtendimento.status == "sorteado_em_atendimento") ,
            (SorteioAtendimento.data_expiracao == None) | (SorteioAtendimento.data_expiracao > agora)
        )
        .first()
    )

    if inscricao_existente:
        return jsonify({
            "message": (
                f"Você já possui uma inscrição/atendimento ativo para {especialidade} "
                f"em {municipio}/{estado}."
            )
        }), 409

    nova_inscricao = SorteioAtendimento(
    paciente_id=pid,
    profissional_id=None,
    especialidade=especialidade,
    estado=estado,
    municipio=municipio,
    status='aguardando_sorteio',
    data_inscricao=agora,
    data_expiracao=agora + timedelta(days=30),
    data_sorteio=None,
    descricao_necessidade=descricao
)


    db.session.add(nova_inscricao)
    db.session.commit()
    return jsonify({"message": "Inscrição criada com sucesso."}), 201



# ------------------------
# Renovar Prazo Inscrição(Sorteio) - PACIENTE
# ------------------------
@auth_bp.put("/paciente/sorteios/<int:sorteio_id>/renovar")
@jwt_required()
def renovar_sorteio(sorteio_id):
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Apenas pacientes podem renovar sorteios."}), 403

    pid = get_jwt_identity()
    s = SorteioAtendimento.query.filter_by(id=sorteio_id, paciente_id=pid).first()
    if not s:
        return jsonify({"message": "Sorteio não encontrado"}), 404

    s.data_renovacao = datetime.utcnow()
    s.data_expiracao = datetime.utcnow() + timedelta(days=30)

    db.session.commit()
    return jsonify({"message": "Prazo renovado com sucesso."}), 200

# ------------------------
# Cancelar Inscrição(Sorteio) - PACIENTE
# ------------------------
@auth_bp.put("/paciente/sorteios/<int:sorteio_id>/cancelar")
@jwt_required()
def cancelar_inscricao_sorteio(sorteio_id):
    if get_jwt().get("tipo") != "paciente":
        return jsonify({"message": "Apenas pacientes podem cancelar inscrições."}), 403

    paciente_id = get_jwt_identity()
    sorteio = SorteioAtendimento.query.filter_by(id=sorteio_id, paciente_id=paciente_id).first()
    if not sorteio:
        return jsonify({"message": "Inscrição de sorteio não encontrada."}), 404

    # Atualiza o registro de inscrição
    sorteio.status = "cancelado_paciente"
    sorteio.data_cancelamento_paciente = datetime.utcnow()

    db.session.add(sorteio)
    db.session.commit()
    return jsonify({"message": "Inscrição cancelada com sucesso."}), 200


# ------------------------
# Detalhes da Inscrição(Sorteio) - PACIENTE
# ------------------------
@auth_bp.get("/paciente/sorteios/<int:sorteio_id>")
@jwt_required()
def detalhes_sorteio(sorteio_id):
    user_id = get_jwt_identity()
    tipo = get_jwt().get("tipo")
    if tipo != "paciente":
        return jsonify({"message": "Apenas pacientes podem ver detalhes das inscrições."}), 403

    s = SorteioAtendimento.query.filter_by(id=sorteio_id, paciente_id=user_id).first()
    if not s:
        return jsonify({"message": "Inscrição não encontrada."}), 404

    paciente = User.query.get(user_id)

    return jsonify({
        "id": s.id,
        "especialidade": s.especialidade,
        "status": s.status,
        "status_legivel": status_amigavel(s.status),
        "profissional_municipio": s.municipio,
        "profissional_estado": s.estado,
        "data_expiracao": s.data_expiracao.isoformat() if s.data_expiracao else None,
        "data_inscricao": s.data_inscricao.isoformat() if s.data_inscricao else None,
        "descricao_necessidade": s.descricao_necessidade
    }), 200




# ------------------------
# Liatar Histórico Atendimentos - Area Profissional
# ------------------------
@auth_bp.get("/profissional/atendimentos")
@jwt_required()
def listar_atendimentos_profissional():
    if get_jwt().get("tipo") != "profissional":
        return jsonify({"message": "Apenas profissionais podem acessar seus atendimentos."}), 403

    profissional_id = get_jwt_identity()
    atendimentos = Atendimento.query.filter_by(profissional_id=profissional_id) \
        .order_by(Atendimento.data_inicio.desc()).all()

    resultado = []
    for a in atendimentos:
        inscricao = (
            SorteioAtendimento.query
            .filter(
                SorteioAtendimento.paciente_id == a.paciente_id,
                SorteioAtendimento.profissional_id == a.profissional_id,
                SorteioAtendimento.especialidade == a.especialidade,
            )
            .order_by(SorteioAtendimento.id.desc())
            .first()
        )

        local_inscricao_municipio = inscricao.municipio if inscricao else None
        local_inscricao_estado = inscricao.estado if inscricao else None

        resultado.append({
            "id": a.id,
            "especialidade": a.especialidade,
            "status": a.status,  # incluir este campo
            "status_legivel": status_amigavel(a.status),
            "paciente": a.paciente.nome if a.paciente else None,
            "data_inicio": a.data_inicio.isoformat() if a.data_inicio else None,
            "data_fim": a.data_fim.isoformat() if a.data_fim else None,
            "local_inscricao_municipio": local_inscricao_municipio,
            "local_inscricao_estado": local_inscricao_estado,
        })

    return jsonify(resultado), 200




# ------------------------
# Detalhes de Atendimento (Profissional)
# ------------------------
@auth_bp.get("/atendimentos/<int:atendimento_id>")
@jwt_required()
def detalhes_atendimento(atendimento_id):
    user_id = get_jwt_identity()
    tipo_usuario = get_jwt().get("tipo")

    if tipo_usuario == "profissional":
        atendimento = Atendimento.query.filter_by(id=atendimento_id, profissional_id=user_id).first()
    elif tipo_usuario == "paciente":
        atendimento = Atendimento.query.filter_by(id=atendimento_id, paciente_id=user_id).first()
    else:
        return jsonify({"message": "Tipo de usuário inválido."}), 403

    if not atendimento:
        return jsonify({"message": "Atendimento não encontrado ou acesso negado."}), 404

    # Buscar a inscrição correspondente (sem FK explícita)
    inscricao = (
        SorteioAtendimento.query
        .filter(
            SorteioAtendimento.paciente_id == atendimento.paciente_id,
            SorteioAtendimento.profissional_id == atendimento.profissional_id,
            SorteioAtendimento.especialidade == atendimento.especialidade,
        )
        .order_by(SorteioAtendimento.id.desc())
        .first()
    )

    local_inscricao_municipio = inscricao.municipio if inscricao else None
    local_inscricao_estado = inscricao.estado if inscricao else None

    return jsonify({
        "id": atendimento.id,
        "especialidade": atendimento.especialidade,
        "status": atendimento.status,
        "status_legivel": status_amigavel(atendimento.status),
        "data_inicio": atendimento.data_inicio.isoformat() if atendimento.data_inicio else None,
        "data_fim": atendimento.data_fim.isoformat() if atendimento.data_fim else None,
        "descricao_necessidade": inscricao.descricao_necessidade,
        "paciente_nome" : atendimento.paciente.nome,
        "paciente_email" : atendimento.paciente.email,
        "paciente_telefone" : atendimento.paciente.telefone,
        # Local de inscrição para UI
        "local_inscricao_municipio": local_inscricao_municipio,
        "local_inscricao_estado": local_inscricao_estado,
        "profissional_nome" : atendimento.profissional.nome , 
    }), 200




# ------------------------
# Cancelamento
# ------------------------
@auth_bp.put("/atendimentos/<int:atendimento_id>/cancelar")
@jwt_required()
def cancelar_atendimento(atendimento_id):
    user_id = get_jwt_identity()
    user_claims = get_jwt()
    tipo_usuario = user_claims.get("tipo")

    atendimento = Atendimento.query.get(atendimento_id)
    if not atendimento:
        return jsonify({"message": "Atendimento não encontrado"}), 404

    # Permissões
    if tipo_usuario == "profissional":
        if atendimento.profissional_id != int(user_id):
            return jsonify({"message": "Acesso negado."}), 403
    elif tipo_usuario == "paciente":
        if atendimento.paciente_id != int(user_id):
            return jsonify({"message": "Acesso negado."}), 403
    else:
        return jsonify({"message": "Tipo de usuário inválido."}), 403

    # Bloqueios de status
    if atendimento.status in ("finalizado_profissional", "finalizado_confirmado", "cancelado_paciente", "cancelado_profissional"):
        return jsonify({"message": "Atendimento não pode ser cancelado nesse status."}), 400

    # Opcional: se quiser restringir o cancelamento a "Em atendimento":
    # if atendimento.status != "Em atendimento":
    #     return jsonify({"message": f"Atendimento não pode ser cancelado. Status inválido: {atendimento.status}"}), 400

    data = request.get_json() or {}
    justificativa = data.get("justificativa", "").strip()
    if len(justificativa) < 20:
        return jsonify({"message": "A justificativa deve ter pelo menos 20 caracteres."}), 400

    agora = datetime.utcnow()

    if tipo_usuario == "profissional":
        atendimento.status = "cancelado_profissional"
        atendimento.justificativa_cancelamento = justificativa
        atendimento.data_fim = agora  # Data final no momento do cancelamento

        # Atualiza inscrição vinculada (se houver)
        inscricao = (
            SorteioAtendimento.query.filter_by(
                paciente_id=atendimento.paciente_id,
                profissional_id=atendimento.profissional_id,
                status="sorteado_em_atendimento",
            ).first()
        )
        if inscricao:
            inscricao.status = "cancelado_profissional"
            if hasattr(inscricao, "data_cancelamento_profissional"):
                inscricao.data_cancelamento_profissional = agora

            # Reentrada do paciente na fila (se a regra de negócio aplicar)
            nova_inscricao = SorteioAtendimento(
                paciente_id=inscricao.paciente_id,
                especialidade=inscricao.especialidade,
                estado=inscricao.estado,
                municipio=inscricao.municipio,
                status="aguardando_sorteio",
                data_inscricao=agora,
                data_expiracao=agora + timedelta(days=30),
                inscricao_origem_id=inscricao.id,
                descricao_necessidade=inscricao.descricao_necessidade
            )
            db.session.add(nova_inscricao)

    elif tipo_usuario == "paciente":
        atendimento.status = "cancelado_paciente"
        atendimento.justificativa_cancelamento = justificativa
        atendimento.data_fim = agora  # Data final no momento do cancelamento

        inscricao = (
            SorteioAtendimento.query.filter_by(
                paciente_id=atendimento.paciente_id,
                status="sorteado_em_atendimento",
            ).first()
        )
        if inscricao:
            inscricao.status = "cancelado_paciente"
            if hasattr(inscricao, "data_cancelamento_paciente"):
                inscricao.data_cancelamento_paciente = agora

    db.session.commit()
    return jsonify({"message": "Atendimento cancelado com sucesso."}), 200




@auth_bp.route("/admin/listar/<string:model>", methods=["GET"])
@jwt_required()
def admin_listar_registros(model):
    claims = get_jwt()
    # Permitir acesso só para admin (ajuste conforme seu modelo)
    if claims.get("tipo") != "admin":
        return jsonify({"message": "Acesso negado"}), 403

    model_map = {
        "usuarios": User,
        "sorteios": SorteioAtendimento,
        "atendimentos": Atendimento,
    }

    ModelClass = model_map.get(model.lower())
    if not ModelClass:
        return jsonify({"message": f"Model '{model}' não encontrado"}), 404

    registros = ModelClass.query.limit(100).all()  # limite para evitar sobrecarga

    # Converte registros para dict (supondo que seus modelos tenham __repr__ ou implemente serialization)
    def serialize(obj):
        # exemplo básico, ajuste segundo seu modelo
        data = {}
        for column in obj.__table__.columns:
            val = getattr(obj, column.name)
            if isinstance(val, datetime):
                val = val.isoformat()
            data[column.name] = val
        return data

    resultados = [serialize(r) for r in registros]

    return jsonify(resultados), 200

# ------------------------
# Sorteio de Paciente (Profissional) com criação de atendimento
# ------------------------
@auth_bp.get("/sortear-paciente")
@jwt_required()
def sortear_paciente():
    if get_jwt().get('tipo') != 'profissional':
        return jsonify({"message": "Apenas profissionais podem sortear."}), 403

    profissional = User.query.get(get_jwt_identity())
    if not profissional:
        return jsonify({"message": "Profissional não encontrado."}), 404

    agora = datetime.utcnow()

    # Subconsulta: pacientes já sorteados pelo profissional para evitar repetições
    ja_sorteados_subquery = (
        db.session.query(SorteioAtendimento.paciente_id)
        .filter(SorteioAtendimento.profissional_id == profissional.id)
        .subquery()
    )

    # Buscar candidatos elegíveis
    candidatos = (
        db.session.query(User)
        .join(SorteioAtendimento, SorteioAtendimento.paciente_id == User.id)
        .filter(
            User.tipo == 'paciente',
            SorteioAtendimento.status == 'aguardando_sorteio',
            SorteioAtendimento.especialidade == profissional.especialidade,
            SorteioAtendimento.estado == profissional.estado,
            SorteioAtendimento.municipio == profissional.municipio,
            or_(
                SorteioAtendimento.data_expiracao == None,
                SorteioAtendimento.data_expiracao > agora
            )
        )
        .all()
    )

    if not candidatos:
        return jsonify({
            "message": f"Não há pacientes elegíveis para atendimento de {profissional.especialidade} em {profissional.municipio}/{profissional.estado}."
        }), 404

    paciente_sorteado = random.choice(candidatos)

    inscricao = (
        db.session.query(SorteioAtendimento)
        .filter(
            SorteioAtendimento.paciente_id == paciente_sorteado.id,
            SorteioAtendimento.especialidade == profissional.especialidade,
            SorteioAtendimento.estado == profissional.estado,
            SorteioAtendimento.municipio == profissional.municipio,
            SorteioAtendimento.status == 'aguardando_sorteio'
        )
        .first()
    )

    if not inscricao:
        return jsonify({"message": "Inscrição não encontrada."}), 404

    # Atualizar inscrição e criar atendimento
    inscricao.profissional_id = profissional.id
    inscricao.status = 'sorteado_em_atendimento'
    inscricao.data_sorteio = agora
    db.session.add(inscricao)

    atendimento = Atendimento(
        profissional_id=profissional.id,
        paciente_id=paciente_sorteado.id,
        especialidade=profissional.especialidade,
        status='Em atendimento',
        data_inicio=agora,
        data_fim=agora + timedelta(days=30)
        #descricao_necessidade=paciente_sorteado.descricao_necessidade
    )

    db.session.add(atendimento)
    db.session.commit()

    # Enviar e-mail ao paciente
    assunto = "Você foi sorteado!"
    corpo = (
        f"Olá {paciente_sorteado.nome},\n\n"
        f"Você foi sorteado para atendimento na especialidade: {paciente_sorteado.especialidade_necessaria}.\n"
        f"Na localidade: {paciente_sorteado.municipio}/{paciente_sorteado.estado}.\n"
        "Aguarde o contato do profissional.\n"
        "Atenciosamente,\nEquipe Meu Atendimento Solidario"
    )

    enviar_email(paciente_sorteado.email, assunto, corpo)

    return jsonify({
        "message": "Paciente sorteado com sucesso, atendimento criado e e-mail enviado.",
        "paciente": {
            "id": paciente_sorteado.id,
            "nome": paciente_sorteado.nome,
            "email": paciente_sorteado.email,
            "telefone": paciente_sorteado.telefone,
            "municipio": paciente_sorteado.municipio,
            "estado": paciente_sorteado.estado,
            "especialidade_necessaria": paciente_sorteado.especialidade_necessaria,
            "descricao_necessidade": paciente_sorteado.descricao_necessidade
        },
        "atendimento": {
            "id": atendimento.id,
            "status": atendimento.status,
            "data_inicio": atendimento.data_inicio.isoformat(),
            "data_fim": atendimento.data_fim.isoformat()
        }
    }), 200




@auth_bp.get("/depurar/pacientes-candidatos/<int:profissional_id>")
@jwt_required()
def depurar_pacientes_candidatos(profissional_id):
    profissional = User.query.get(profissional_id)
    if not profissional:
        return jsonify({"message": "Profissional não encontrado."}), 404

    candidatos = User.query.filter(
        User.tipo == "paciente",
        User.especialidade_necessaria == profissional.especialidade,
        User.estado == profissional.estado,
        User.municipio == profissional.municipio
    ).all()

    resultados = []
    for c in candidatos:
        resultados.append({
            "id": c.id,
            "nome": c.nome,
            "especialidade_necessaria": c.especialidade_necessaria,
            "estado": c.estado,
            "municipio": c.municipio
        })

    return jsonify(resultados), 200

@auth_bp.put("/atendimentos/<int:atendimento_id>/concluir")
@jwt_required()
def concluir_atendimento(atendimento_id):
    user_id = get_jwt_identity()
    tipo_usuario = get_jwt().get("tipo")

    if tipo_usuario != "profissional":
        return jsonify({"message": "Apenas profissionais podem concluir atendimentos."}), 403

    atendimento = Atendimento.query.get(atendimento_id)
    if not atendimento:
        return jsonify({"message": "Atendimento não encontrado."}), 404

    if atendimento.profissional_id != int(user_id):
        return jsonify({"message": "Acesso negado."}), 403

    # Permitir concluir quando estava sorteado_em_atendimento ou Em atendimento
    if atendimento.status not in ("sorteado_em_atendimento", "Em atendimento"):
        return jsonify({"message": f"Atendimento não pode ser concluído no status {atendimento.status}."}), 400

    # Atualiza atendimento
    atendimento.status = "finalizado_profissional"
    atendimento.data_fim = datetime.utcnow()

    # Atualiza inscrição correspondente do sorteio
    inscricao = (
        SorteioAtendimento.query.filter(
            SorteioAtendimento.paciente_id == atendimento.paciente_id,
            SorteioAtendimento.profissional_id == atendimento.profissional_id,
            SorteioAtendimento.especialidade == atendimento.especialidade,
            SorteioAtendimento.status == "sorteado_em_atendimento",
        ).first()
    )

    if inscricao:
        inscricao.status = "finalizado_profissional"
        inscricao.data_finalizacao = datetime.utcnow()

    db.session.commit()

    # Gera link de confirmação do paciente (mantendo sua lógica)
    link_confirmacao = url_for(
        "auth.confirmar_finalizacao",
        atendimento_id=atendimento.id,
        _external=True
    )

    # Envia e-mail para paciente
    assunto = "Confirmação de finalização de atendimento"
    corpo = (
        f"Olá {atendimento.paciente.nome},\n\n"
        f"O profissional concluiu seu atendimento na especialidade {atendimento.especialidade}.\n"
        f"Por favor, confirme a finalização do seu atendimento clicando no link abaixo:\n\n"
        f"{link_confirmacao}\n\n"
        "ATENÇÃO: A não confirmação em até 30 dias pode gerar penalidades, "
        "como bloqueio de conta e suspensão da participação nos sorteios.\n\n"
        "Atenciosamente,\nEquipe Atendimento"
    )
    enviar_email(atendimento.paciente.email, assunto, corpo)

    return jsonify({"message": "Atendimento concluído e e-mail enviado para confirmação do paciente."}), 200

@auth_bp.post("/atendimentos/<int:atendimento_id>/confirmar-finalizacao")
@jwt_required()
def confirmar_finalizacao(atendimento_id):
    user_id = get_jwt_identity()
    tipo_usuario = get_jwt().get("tipo")

    if tipo_usuario != "paciente":
        return jsonify({"message": "Apenas pacientes podem confirmar finalização."}), 403

    atendimento = Atendimento.query.get(atendimento_id)
    if not atendimento:
        return jsonify({"message": "Atendimento não encontrado."}), 404

    if atendimento.paciente_id != int(user_id):
        return jsonify({"message": "Acesso negado."}), 403

    if atendimento.status != "finalizado_profissional":
        return jsonify({"message": "Atendimento não está aguardando confirmação."}), 400

    atendimento.status = "finalizado_confirmado"
    atendimento.data_confirmacao = datetime.utcnow()

    # Atualiza inscrição correspondente do sorteio
    inscricao = (
        SorteioAtendimento.query.filter(
            SorteioAtendimento.paciente_id == atendimento.paciente_id,
            SorteioAtendimento.profissional_id == atendimento.profissional_id,
            SorteioAtendimento.especialidade == atendimento.especialidade,
            SorteioAtendimento.status == "finalizado_profissional",
        ).first()
    )

    if inscricao:
        inscricao.status = "finalizado_confirmado"
        # Já tem data_finalizacao; mantenha ou ajuste conforme sua necessidade
        if not inscricao.data_finalizacao:
            inscricao.data_finalizacao = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": "Finalização confirmada com sucesso. Obrigado!"}), 200

@auth_bp.get("/ranking-profissionais")
def ranking_profissionais():
    # Considera “concluído” apenas quando finalizado_confirmado (fonte de verdade)
    # Se sua base ainda possuir outros sinônimos, acrescente-os aqui.
    subq = (
        db.session.query(
            Atendimento.profissional_id.label("prof_id"),
            func.count(Atendimento.id).label("total_concluidos")
        )
        .filter(Atendimento.status == "finalizado_confirmado")
        .group_by(Atendimento.profissional_id)
        .subquery()
    )

    # Join com User (apenas profissionais)
    query = (
        db.session.query(
            User.id,
            User.nome,
            User.especialidade,
            User.estado,
            subq.c.total_concluidos
        )
        .join(subq, subq.c.prof_id == User.id)
        .filter(User.tipo == "profissional")
        .filter(subq.c.total_concluidos > 0)
        .order_by(desc(subq.c.total_concluidos), asc(User.nome))
        .limit(100)  # limite de segurança
    )

    resultados = []
    for row in query.all():
        resultados.append({
            "id": row.id,
            "nome": row.nome,
            "especialidade": row.especialidade,
            "estado": row.estado,
            "total_concluidos": int(row.total_concluidos)
        })

    return jsonify(resultados), 200