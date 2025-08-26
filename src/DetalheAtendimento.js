import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Chip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";

const statusColor = (statusLegivel) => {
  switch (statusLegivel) {
    case "Concluído":
    case "atendimento_concluido":
    case "finalizado_profissional":
    case "finalizado_confirmado":
      return "success";
    case "Expirado":
    case "Inscrição expirada":
    case "Atendimento expirado":
    case "inscricao_expirada":
    case "atendimento_expirado":
      return "warning";
    case "Em atendimento":
    case "sorteado_em_atendimento":
      return "info";
    case "Cancelado pelo paciente":
    case "Cancelado pelo profissional":
    case "cancelado_paciente":
    case "cancelado_profissional":
      return "error";
    case "Aguardando sorteio":
    case "aguardando_sorteio":
      return "primary";
    default:
      return "default";
  }
};



const DetalheAtendimento = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [executando, setExecutando] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const me = await api.get("/auth/me");
        setTipoUsuario(me.data?.tipo);

        const res = await api.get(`/auth/atendimentos/${id}`);
        setDados(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Erro ao carregar atendimento.");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  const cancelarAtendimento = async () => {
    // Desabilitado quando finalizado_profissional
    if ((dados?.status || "") === "finalizado_profissional") return;

    // Validação mínima 20 caracteres (coerente com backend)
    if (justificativa.trim().length < 20) {
      setError("A justificativa deve conter ao menos 20 caracteres.");
      return;
    }
    setExecutando(true);
    setError("");
    setMsg("");

    try {
      await api.put(`/auth/atendimentos/${id}/cancelar`, { justificativa });
      setMsg("Atendimento cancelado com sucesso.");
      setTimeout(() => {
        if (tipoUsuario === "profissional") {
          navigate("/dashboard-profissional", { state: { reload: true } });
        } else {
          navigate("/dashboard-paciente", { state: { reload: true } });
        }
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || "Erro ao cancelar atendimento.");
    } finally {
      setExecutando(false);
    }
  };

  const concluirAtendimento = async () => {
    if (tipoUsuario !== "profissional") return;
    if (!window.confirm("Confirma que deseja concluir este atendimento?")) return;

    setExecutando(true);
    setError("");
    setMsg("");

    try {
      await api.put(`/auth/atendimentos/${id}/concluir`);
      setMsg("Atendimento concluído. Um e-mail foi enviado ao paciente para confirmação.");
      setTimeout(() => {
        navigate("/dashboard-profissional", { state: { reload: true } });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || "Erro ao concluir atendimento.");
    } finally {
      setExecutando(false);
    }
  };

  const confirmarConclusaoPaciente = async () => {
    if (tipoUsuario !== "paciente") return;
    setExecutando(true);
    setError("");
    setMsg("");

    try {
      await api.post(`/auth/atendimentos/${id}/confirmar-finalizacao`);
      setMsg("Finalização confirmada com sucesso.");
      setTimeout(() => {
        navigate("/dashboard-paciente", { state: { reload: true } });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || "Erro ao confirmar conclusão.");
    } finally {
      setExecutando(false);
    }
  };

  if (loading) return <CircularProgress />;

  if (error)
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Container>
    );

  if (!dados)
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="warning">Dados do atendimento não encontrados.</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Container>
    );

  const statusLegivel = dados.status_legivel || dados.status;

  // Status que impedem cancelamento (internos e legíveis)
  const isCancelado =
    dados.status === "cancelado_paciente" ||
    dados.status === "cancelado_profissional" ||
    statusLegivel === "Cancelado pelo paciente" ||
    statusLegivel === "Cancelado pelo profissional";

  const isFinalizado =
    dados.status === "finalizado_profissional" ||
    dados.status === "finalizado_confirmado" ||
    statusLegivel === "Concluído" ||
    statusLegivel === "Concluído (aguardando confirmação)";

  // Desabilitar cancelamento se cancelado ou finalizado
  const disableCancelar = isCancelado || isFinalizado;
  const disableConcluir = isCancelado || isFinalizado;
  const disableJustificativa = isCancelado || isFinalizado;

  // Datas (se disponíveis no backend)
  const dataSorteioTxt = dados.data_sorteio ? new Date(dados.data_sorteio).toLocaleString("pt-BR") : "-";
  const dataLimiteTxt = dados.data_fim ? new Date(dados.data_fim).toLocaleString("pt-BR") : "-";
  const dataInicioTxt = dados.data_inicio ? new Date(dados.data_inicio).toLocaleString("pt-BR") : "-";

  // PROFISSIONAL
  if (tipoUsuario === "profissional") {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Detalhes do Atendimento
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip label={statusLegivel} color={statusColor(statusLegivel)} size="small" />
          </Box>

          <Typography sx={{ mb: 1 }}>
            <strong>Data de início:</strong> {dataInicioTxt}
            <br />
            <strong>Data limite:</strong> {dataLimiteTxt}
            <br />
            <strong>Especialidade de inscrição:</strong> {dados?.especialidade || "-"}
            <br />
            <strong>Local de inscrição:</strong>{" "}
            {dados?.local_inscricao_nome
              ? `${dados.local_inscricao_nome} - ${dados?.local_inscricao_municipio || "-"} / ${dados?.local_inscricao_estado || "-"}`
              : `${dados?.local_inscricao_municipio || "-"} / ${dados?.local_inscricao_estado || "-"}`}
          </Typography>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
            Dados do Paciente
          </Typography>
          <Typography>
            <strong>Nome:</strong> {dados?.paciente_nome || "-"}
            <br />
            <strong>Email:</strong> {dados?.paciente_email || "-"}
            <br />
            <strong>Telefone:</strong> {dados?.paciente_telefone || "Não informado"}
          </Typography>

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
            Necessidade informada
          </Typography>
          <Typography sx={{ whiteSpace: "pre-line" }}>
            {dados?.descricao_necessidade || dados?.descricao || "Não informado"}
          </Typography>



          <TextField
            label="Justificativa para Cancelamento"
            placeholder="Descreva o motivo do cancelamento (mínimo 20 caracteres)"
            multiline
            minRows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            fullWidth
            sx={{ mt: 3 }}
            disabled={disableJustificativa}
          />

          <Box sx={{ display: "flex", gap: 2, mt: 2, flexDirection: "column" }}>
            <Button
              variant="contained"
              color="error"
              onClick={cancelarAtendimento}
              disabled={executando || justificativa.trim().length < 20 || disableCancelar}
              fullWidth
            >
              Cancelar Atendimento
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={concluirAtendimento}
              disabled={executando || disableConcluir}
              fullWidth
            >
              Concluir Atendimento
            </Button>

            <Button variant="outlined" onClick={() => navigate(-1)} fullWidth>
              Voltar
            </Button>
          </Box>

          {msg && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {msg}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Container>
    );
  }


  // PACIENTE
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Detalhe do Atendimento
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Chip label={statusLegivel} color={statusColor(statusLegivel)} size="small" />
        </Box>

        <Typography sx={{ mb: 1 }}>
          <strong>Data de início:</strong> {dataInicioTxt}
          <br />
          <strong>Data limite:</strong> {dataLimiteTxt}
          <br />
          <strong>Especialidade:</strong> {dados.especialidade}
          <br />
          <strong>Local de Atendimento:</strong> {dados?.local_inscricao_nome
            ? `${dados.local_inscricao_nome} - ${dados?.local_inscricao_municipio || "-"} / ${dados?.local_inscricao_estado || "-"}`
            : `${dados?.local_inscricao_municipio || "-"} / ${dados?.local_inscricao_estado || "-"}`}
          <br />
          <strong>Profissional Responsável:</strong> {dados.profissional_nome || "Não informado"}
        </Typography>

        <Typography sx={{ mb: 2, color: "red" }}>
          <br />
          <strong>Mantenha seus dados cadastrais atualizados para que o profissional possa contatá-lo.</strong>
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Seus Dados Cadastrais:
        </Typography>
        <Typography>
          Nome: {dados?.paciente_nome}
          <br />
          Email: {dados?.paciente_email}
          <br />
          Telefone: {dados?.paciente_telefone || "Não informado"}
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
          Necessidade informada
        </Typography>
        <Typography sx={{ whiteSpace: "pre-line" }}>
          {dados?.descricao_necessidade || dados?.paciente?.descricao_necessidade || "Não informado"}
        </Typography>



        {/* Cancelamento desabilitado quando finalizado_profissional */}
        <TextField
          label="Justificativa para Cancelamento"
          placeholder="Descreva o motivo do cancelamento (mínimo 20 caracteres)"
          multiline
          minRows={3}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          fullWidth
          sx={{ mt: 3 }}
          disabled={disableCancelar}
        />
        <Button
          variant="contained"
          color="error"
          onClick={cancelarAtendimento}
          disabled={executando || justificativa.trim().length < 20 || disableCancelar}
          sx={{ mt: 2 }}
          fullWidth
        >
          Cancelar Atendimento
        </Button>

        {/* Confirmar conclusão visível quando finalizado_profissional */}
        {dados.status === "finalizado_profissional" && (
          <Button
            variant="contained"
            color="primary"
            onClick={confirmarConclusaoPaciente}
            sx={{ mt: 2 }}
            fullWidth
          >
            Confirmar Conclusão
          </Button>
        )}

        {msg && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {msg}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 3 }} fullWidth>
          Voltar
        </Button>
      </Paper>
    </Container>
  );
};

export default DetalheAtendimento;
