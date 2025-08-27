Aplicação web para cadastro e gestão de atendimentos solidários, com autenticação, cadastro de profissionais e pacientes, integração com Google Places (preenchimento de endereço), consultas a serviços públicos (IBGE e ViaCEP), persistência de dados e ranking. O repositório contém o front-end em React (Create React App) e um back-end na pasta backend (Python/Node, conforme sua implementação local).

Objetivo:

A aplicação nasceu com a ideia de conectar pessoas que não têm condições de pagar por um atendimento profissional, com profissionais solidários que podem disponibilizar seu tempo e conhecimento ajudando a quem precisa.

Funcionamento:

- O paciente se cadastra para uma especialidade e município.

- A inscrição tem validade de 30 dias, mas pode ser prolongada pelo paciente. Isso diminui a chance do profissional sortear um paciente que não necessita mais do atendimento, devido a uma possível espera excessiva.

- O paciente pode cancelar sua inscrição ao sorteio, caso seu atendimento não seja mais necessário.

- O profissional se cadastra em uma especialidade e endereço de atendimento (município).

- O profissional agora é capaz de sortear apenas pacientes cadastrados em sua especialidade/município.

- Ao sortear um paciente, o profissional recebe os dados para contatá-lo (nome, telefone, email, descritivo da necessidade de atendimento) e marcar o atendimento.

- Com um atendimento criado (paciente sorteado), o profissional pode concluir ou cancelar o atendimento.

- Caso o profissional cancele o atendimento, o paciente volta para a lista de sorteio. Isso evita que o paciente seja prejudicado por uma decisão que não é de sua responsabilidade.

- Ao concluir um atendimento, o profissional passa a ser exibido em um ranking, onde os profissionais serão ordenados de acordo com a quantidade de atendimentos concluidos. Essa é uma forma de reconhecer o empenho do profissional em ajudar quem precisa.

- Para evitar fraudes, o atendimento é intransferível! Ou seja, será exclusivo para o paciente cadastrado. Isso mantém a plataforma justa, evita múltiplos cadastros e possibilita chances iguais para todos os inscritos.

- O profissional tem a capacidade de sinalizar o paciente como "Suspeita de fraude" e cancelar o atendimento. Isso faz com que o paciente não retorne ao sorteio e seja penalizado.

Requisitos

Node.js LTS (18+) e npm ou yarn para o front-end.

Python 3.10+ (ou Node, conforme o backend efetivo) para a API.

Conta Google Cloud com Maps JavaScript API e Places API habilitadas (billing ativo).

Configuração de ambiente.

Clone o repositório:

git clone https://github.com/laerciocoelho/meuAtendimentoSolidario.git

Entre na pasta do front-end e instale:

npm install

Crie um .env (não versionado) com as variáveis:

CRA (React App):

REACT_APP_GOOGLE_MAPS_API_KEY=chave_google

Vite (se usar Vite em algum pacote):

VITE_GOOGLE_MAPS_API_KEY=chave_google

Outras variáveis do backend (SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_FROM, DATABASE_URL, JWT_SECRET etc.) devem ir no backend/.env (não versionado).

Execução em desenvolvimento.

Front-end (CRA):

npm start

O CRA sobe em http://localhost:3000 com live reload.

Back-end:

Python/Flask: python -m venv .venv && source .venv/bin/activate (Linux/macOS) ou .venv\Scripts\activate (Windows), pip install -r requirements.txt, flask run.

Node/Express: npm install && npm run dev (ou node server.js), conforme scripts do backend.

Scripts disponíveis (front-end)

npm start: inicia o front-end em modo de desenvolvimento.

Variáveis de ambiente (resumo)

Front-end:

REACT_APP_GOOGLE_MAPS_API_KEY: chave do Google Maps JavaScript + Places.

Back-end:

JWT_SECRET, DATABASE_URL, PORT, e chaves de serviços externos conforme a sua implementação.

Nunca comite o .env no repositório; mantenha o .env e variações no .gitignore e use o .env.example para referência.

