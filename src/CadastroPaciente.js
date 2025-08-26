import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "./api";

// Lista mock de especialidades; pode vir do backend futuramente
const especialidadesDisponiveis = [
  "Clínico Geral",
  "Cardiologia",
  "Dermatologia",
  "Ginecologia",
  "Ortopedia",
  "Pediatria",
  "Oftalmologia",
  "Odontologia",
];

// Função de validação de CPF
const isCPFValido = (cpf) => {
  if (!cpf) return false;
  const num = String(cpf).replace(/\D/g, "");
  if (num.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(num)) return false;

  const calcDV = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (base.length + 1 - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcDV(num.slice(0, 9));
  if (dv1 !== parseInt(num[9], 10)) return false;
  const dv2 = calcDV(num.slice(0, 10));
  if (dv2 !== parseInt(num[10], 10)) return false;

  return true;
};

const CadastroPaciente = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cpf: "",
    email: "",
    senha: "",
    nome: "",
    telefone: "",
    cep: "",
    endereco: "",
    bairro: "",
    especialidade_necessaria: "",
    descricao_necessidade: "",
    estado: "",
    municipio: "",
  });

  const [msg, setMsg] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  // ====== Buscar lista de estados no IBGE ======
  useEffect(() => {
    const fetchEstados = async () => {
      try {
        setLoadingEstados(true);
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const data = await res.json();
        const ordenados = [...data].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
        setEstados(ordenados);
      } catch (e) {
        console.error("Erro ao carregar estados IBGE:", e);
        setMsg("Falha ao carregar a lista de estados do IBGE.");
      } finally {
        setLoadingEstados(false);
      }
    };
    fetchEstados();
  }, []);

  // ====== Buscar lista de municípios no IBGE ======
  useEffect(() => {
    const fetchMunicipios = async () => {
      if (!form.estado) {
        setMunicipios([]);
        setForm((prev) => ({ ...prev, municipio: "" }));
        return;
      }
      try {
        setLoadingMunicipios(true);
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`);
        const data = await res.json();
        const ordenados = [...data].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
        setMunicipios(ordenados);
      } catch (e) {
        console.error("Erro ao carregar municípios IBGE:", e);
        setMsg("Falha ao carregar a lista de municípios do IBGE.");
      } finally {
        setLoadingMunicipios(false);
      }
    };
    fetchMunicipios();
  }, [form.estado]);

  // ====== Manipula inputs ======
  const handleChange = (e) => {
    setMsg("");
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ====== Busca CEP via ViaCEP ======
  const normalizeCEP = (cep) => (cep || "").replace(/\D/g, "");
  const fetchCep = async () => {
    try {
      setMsg("");
      setLoadingCEP(true);

      const cepNum = normalizeCEP(form.cep);
      if (cepNum.length !== 8) {
        setMsg("CEP inválido. Informe 8 dígitos.");
        return;
      }

      const resp = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
      const data = await resp.json();

      if (data?.erro) {
        setMsg("CEP não encontrado no ViaCEP.");
        return;
      }

      const { logradouro, bairro, localidade, uf } = data;

      setForm((prev) => ({
        ...prev,
        endereco: logradouro || prev.endereco,
        bairro: bairro || prev.bairro,
        estado: uf || prev.estado,
        municipio: localidade || prev.municipio,
      }));
    } catch (e) {
      console.error("Erro ao consultar ViaCEP:", e);
      setMsg("Falha ao consultar o CEP no ViaCEP.");
    } finally {
      setLoadingCEP(false);
    }
  };

  // ====== Validação CPF no blur ======
  const validarCPFAtual = (valor) => {
    if (!isCPFValido(valor)) {
      setCpfErro("CPF inválido.");
      return false;
    }
    setCpfErro("");
    return true;
  };

  // ====== Submissão do formulário ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!isCPFValido(form.cpf)) {
      setCpfErro("CPF inválido.");
      return;
    }

    const obrigatorios = [
      "cpf",
      "email",
      "senha",
      "nome",
      "telefone",
      "cep",
      "endereco",
      "especialidade_necessaria",
      "descricao_necessidade",
      "estado",
      "municipio",
    ];
    const faltantes = obrigatorios.filter((k) => !String(form[k] || "").trim());
    if (faltantes.length) {
      setMsg("Todos os campos são obrigatórios.");
      return;
    }

    try {
      await api.post("/auth/register/paciente", { ...form, cpf: form.cpf.replace(/\D/g, "") });
      setMsg("Cadastro realizado com sucesso!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Erro ao cadastrar.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" color="primary" align="center" gutterBottom>
          Cadastro de Paciente
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="CPF"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                onBlur={(e) => validarCPFAtual(e.target.value)}
                required
                error={Boolean(cpfErro)}
                helperText={cpfErro || ""}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="E-mail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                type="password"
                fullWidth
                label="Senha"
                name="senha"
                value={form.senha}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Telefone"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={8}>
              <TextField
                fullWidth
                label="CEP"
                name="cep"
                value={form.cep}
                onChange={handleChange}
                onBlur={fetchCep}
                required
                placeholder="00000-000"
              />
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="outlined"
                onClick={fetchCep}
                disabled={loadingCEP || !form.cep}
                fullWidth
                sx={{ height: "100%" }}
                startIcon={loadingCEP ? <CircularProgress size={18} /> : null}
              >
                {loadingCEP ? "Buscando..." : "Buscar CEP"}
              </Button>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço (Logradouro)"
                name="endereco"
                value={form.endereco}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Especialidade Necessária</InputLabel>
                <Select
                  name="especialidade_necessaria"
                  value={form.especialidade_necessaria}
                  onChange={handleChange}
                >
                  {especialidadesDisponiveis.map((esp) => (
                    <MenuItem key={esp} value={esp}>
                      {esp}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição da Necessidade"
                name="descricao_necessidade"
                value={form.descricao_necessidade}
                onChange={handleChange}
                required
                multiline
                minRows={2}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth required disabled={loadingEstados}>
                <InputLabel>Estado (UF)</InputLabel>
                <Select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                >
                  {estados.map((uf) => (
                    <MenuItem key={uf.sigla} value={uf.sigla}>
                      {uf.nome} ({uf.sigla})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth required disabled={!form.estado || loadingMunicipios}>
                <InputLabel>Município</InputLabel>
                <Select
                  name="municipio"
                  value={form.municipio}
                  onChange={handleChange}
                >
                  {municipios.map((m) => (
                    <MenuItem key={m.id} value={m.nome}>
                      {m.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              color="secondary"
              onClick={() => navigate("/login")}
            >
              Voltar para Login
            </Button>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loadingEstados || loadingMunicipios || loadingCEP}
            >
              Cadastrar
            </Button>
          </Stack>

          {msg && (
            <Typography
              align="center"
              color={msg.includes("sucesso") ? "success.main" : "error"}
              sx={{ mt: 2 }}
            >
              {msg}
            </Typography>
          )}
        </form>
      </Paper>
    </Container>
  );
};

export default CadastroPaciente;
