from datetime import datetime, timedelta
import uuid
from database import db

class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)

    # Comum
    tipo = db.Column(db.String(20), nullable=False)  # "paciente" ou "profissional"
    email = db.Column(db.String(120), unique=False, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    nome = db.Column(db.String(120), nullable=False)
    telefone = db.Column(db.String(40), nullable=True)
    cep = db.Column(db.String(10))
    endereco = db.Column(db.String(255))
    bairro = db.Column(db.String(120))
    estado = db.Column(db.String(2))       # UF do endereço
    municipio = db.Column(db.String(120))
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    # Paciente
    cpf = db.Column(db.String(11), unique=True, nullable=True)
    especialidade_necessaria = db.Column(db.String(120))
    descricao_necessidade = db.Column(db.Text)

    # Profissional
    especialidade = db.Column(db.String(120))
    local_atendimento = db.Column(db.String(255))
    registro_conselho = db.Column(db.String(60))        # número do registro
    uf_registro = db.Column(db.String(2))               # UF do registro
    cidade = db.Column(db.String(120))


class PasswordReset(db.Model):
    __tablename__ = "password_resets"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    codigo = db.Column(db.String(6), nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    expira_em = db.Column(db.DateTime, nullable=False)

    def __init__(self, email, codigo):
        self.email = email
        self.codigo = codigo
        self.expira_em = datetime.utcnow() + timedelta(minutes=10)


class SorteioAtendimento(db.Model):
    __tablename__ = "sorteio_atendimento"

    id = db.Column(db.Integer, primary_key=True)
    profissional_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    profissional = db.relationship("User", foreign_keys=[profissional_id], backref="sorteios_realizados")

    paciente_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    paciente = db.relationship("User", foreign_keys=[paciente_id], backref="sorteios_recebidos")
    
    especialidade = db.Column(db.String(120), nullable=False)
    estado = db.Column(db.String(2), nullable=False)
    municipio = db.Column(db.String(120), nullable=False)

    # NOVO: congelar o descritivo no momento da inscrição
    descricao_necessidade = db.Column(db.Text, nullable=True)

    # Datas
    data_inscricao = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_renovacao = db.Column(db.DateTime, nullable=True)
    data_sorteio = db.Column(db.DateTime, nullable=True)
    data_cancelamento_paciente = db.Column(db.DateTime, nullable=True)
    data_cancelamento_profissional = db.Column(db.DateTime, nullable=True)
    data_finalizacao = db.Column(db.DateTime, nullable=True)
    data_expiracao = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), nullable=False, default='aguardando_sorteio')
    
    inscricao_origem_id = db.Column(db.Integer, db.ForeignKey('sorteio_atendimento.id'), nullable=True)
    inscricao_origem = db.relationship('SorteioAtendimento', remote_side=[id], backref='inscricoes_derivadas', uselist=False)

    
    



class Atendimento(db.Model):
    __tablename__ = "atendimento"
    id = db.Column(db.Integer, primary_key=True)

    profissional_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    profissional = db.relationship("User", foreign_keys=[profissional_id])
    paciente_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    paciente = db.relationship("User", foreign_keys=[paciente_id])
    especialidade = db.Column(db.String(120))
    status = db.Column(db.String(50), default="Em atendimento")  # "Em atendimento", "Concluído", "Expirado"
    data_inicio = db.Column(db.DateTime, default=datetime.utcnow)
    data_fim = db.Column(db.DateTime, nullable=True)
    #descricao_necessidade = db.Column(db.String(50), nullable=False)

    
    
