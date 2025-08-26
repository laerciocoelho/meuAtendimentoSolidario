from werkzeug.security import generate_password_hash
from app import create_app
from database import db
from models import User

app = create_app()

with app.app_context():
    # Limpar tabelas existentes (opcional)
    db.drop_all()
    db.create_all()

    # ====== Profissionais ======
    prof1 = User(
        tipo="profissional",
        email="dr.joao@example.com",
        senha_hash=generate_password_hash("123456"),
        nome="Dr. João Silva",
        telefone="11988887777",
        cep="01001000",
        endereco="Praça da Sé, 100",
        bairro="Sé",
        estado="SP",
        municipio="São Paulo",
        cidade="São Paulo",
        especialidade="Cardiologia",
        local_atendimento="Clínica Coração Saudável",
        registro_conselho="CRM12345",
        uf_registro="SP"
    )

    prof2 = User(
        tipo="profissional",
        email="dra.maria@example.com",
        senha_hash=generate_password_hash("123456"),
        nome="Dra. Maria Oliveira",
        telefone="21999998888",
        cep="20040002",
        endereco="Rua da Saúde, 50",
        bairro="Centro",
        estado="RJ",
        municipio="Rio de Janeiro",
        cidade="Rio de Janeiro",
        especialidade="Dermatologia",
        local_atendimento="Clínica Pele Limpa",
        registro_conselho="CRM67890",
        uf_registro="RJ"
    )

    # ====== Pacientes ======
    pac1 = User(
        tipo="paciente",
        cpf="12345678901",
        email="ana@example.com",
        senha_hash=generate_password_hash("123456"),
        nome="Ana Souza",
        telefone="11977776666",
        cep="01002000",
        endereco="Rua 1",
        bairro="Centro",
        estado="SP",
        municipio="São Paulo",
        especialidade_necessaria="Cardiologia"
    )

    pac2 = User(
        tipo="paciente",
        cpf="23456789012",
        email="carlos@example.com",
        senha_hash=generate_password_hash("123456"),
        nome="Carlos Pereira",
        telefone="11955554444",
        cep="02020000",
        endereco="Rua 2",
        bairro="Jardins",
        estado="SP",
        municipio="São Paulo",
        especialidade_necessaria="Dermatologia"
    )

    pac3 = User(
        tipo="paciente",
        cpf="34567890123",
        email="beatriz@example.com",
        senha_hash=generate_password_hash("123456"),
        nome="Beatriz Lima",
        telefone="21944443333",
        cep="20030000",
        endereco="Rua 3",
        bairro="Copacabana",
        estado="RJ",
        municipio="Rio de Janeiro",
        especialidade_necessaria="Cardiologia"
    )

    # ====== Admin ======
    admin = User(
        tipo="admin",
        email="admin@example.com",
        senha_hash=generate_password_hash("admin123"),
        nome="Administrador"
        # Você pode adicionar mais campos se desejar
    )

    db.session.add_all([prof1, prof2, pac1, pac2, pac3, admin])
    db.session.commit()

    print("✅ Registros inseridos com sucesso!")
