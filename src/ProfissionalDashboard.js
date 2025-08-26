import React, { useState, useMemo, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Stack,
  Paper,
  LinearProgress,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";

const statusColor = (statusLegivel) => {
  // Ajuste para usar os status amigáveis vindos do backend
  switch (statusLegivel) {
    case "Concluído":
      return "success";
    case "Expirado":
    case "Inscrição expirada":
    case "Atendimento expirado":
      return "warning";
    case "Em atendimento":
      return "info";
    case "Cancelado pelo paciente":
    case "Cancelado pelo profissional":
      return "error";
    case "Aguardando sorteio":
      return "primary";
    default:
      return "default";
  }
};

const ProfissionalDashboard = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/profissional/atendimentos");
      setAtendimentos(res.data);
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [state?.reload]);

  const resumo = useMemo(() => {
    const concluidos = atendimentos.filter((a) => {
      // Para o profissional, conte como concluído:
      // - finalizado_profissional (aguardando confirmação) E
      // - finalizado_confirmado (concluído definitivo)
      // Além de quando o status_legivel vier como "Concluído".
      return (
        a.status === "finalizado_confirmado" ||
        a.status === "finalizado_profissional" ||
        a.status_legivel === "Concluído" ||
        a.status_legivel === "Finalizado_confirmado"
      );
    }).length;


    const expirados = atendimentos.filter((a) => {
      return (
        a.status_legivel === "Expirado" ||
        a.status_legivel === "Inscrição expirada" ||
        a.status_legivel === "Atendimento expirado"
      );
    }).length;

    const emAtendimento = atendimentos.filter((a) => {
      return a.status_legivel === "Em atendimento" || a.status === "sorteado_em_atendimento";
    }).length;

    const cancelados = atendimentos.filter((a) => {
      return (
        a.status_legivel === "Cancelado pelo paciente" ||
        a.status_legivel === "Cancelado pelo profissional" ||
        a.status === "cancelado_paciente" ||
        a.status === "cancelado_profissional"
      );
    }).length;

    return { concluidos, expirados, emAtendimento, cancelados };
  }, [atendimentos]);


  const tempoRestante = (dataFim) => {
    if (!dataFim) return null;
    const prazoFinal = new Date(dataFim);
    const diff = prazoFinal - new Date();
    if (diff <= 0) return "Expirado";
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${dias}d ${horas}h restantes`;
  };

  const handleSortear = async () => {
    setMsg("");
    try {
      const res = await api.get("/auth/sortear-paciente");
      //navigate("/profissional/paciente-sorteado", {
      navigate(`/profissional/atendimento/${res.data.atendimento.id}`, {
        state: {
          paciente: res.data.paciente,
          atendimento_id: res.data.atendimento.id,
        },
      });
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao sortear paciente.");
    }
  };

  const abrirDetalhes = (id) => {
    navigate(`/profissional/atendimento/${id}`);
  };

  const editarDados = () => {
    navigate("/profissional/editar-dados");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Topo e ações */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Área do Profissional
        </Typography>
        <Button variant="contained" onClick={handleSortear}>
          Sortear Paciente
        </Button>
        <Button variant="outlined" onClick={editarDados}>
          Editar Dados
        </Button>
        <Button color="error" onClick={logout}>
          Sair
        </Button>
      </Stack>

      {/* Mensagem informativa */}
      {msg && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}

      {/* Resumo */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold">Resumo</Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
          <Chip label={`Concluídos: ${resumo.concluidos}`} color="success" />
          <Chip label={`Expirados: ${resumo.expirados}`} color="warning" />
          <Chip label={`Em atendimento: ${resumo.emAtendimento}`} color="info" />
          <Chip label={`Cancelados: ${resumo.cancelados}`} color="error" />
        </Stack>
      </Paper>

      {/* Histórico */}
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Histórico de Atendimentos
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : atendimentos.length === 0 ? (
        <Typography>Nenhum atendimento encontrado.</Typography>
      ) : (
        <List>
          {atendimentos.map((a) => {
            const statusBruto = a.status;
            const statusLegivelAPI = a.status_legivel || a.status;

            // Mapeamento de exibição: igual ao do paciente
            let statusExibicao = statusLegivelAPI;
            if (statusBruto === "finalizado_profissional") {
              statusExibicao = "Finalizado pelo profissional";
            } else if (statusBruto === "finalizado_confirmado") {
              statusExibicao = "Concluído";
            }

            const dataInicioTxt = a.data_inicio ? new Date(a.data_inicio).toLocaleDateString("pt-BR") : "-";
            const dataFimTxt = a.data_fim ? new Date(a.data_fim).toLocaleDateString("pt-BR") : "-";

            const emAtendimento = statusExibicao === "Em atendimento";
            const mostrarExpiracao = emAtendimento && a.data_fim;
            const mostrarDataFinal = !emAtendimento && a.data_fim;

            // Local de inscrição vindo do backend:
            const localMunicipio = a.local_inscricao_municipio || "-";
            const localEstado = a.local_inscricao_estado || "-";

            const primaryText = (
              <span>
                <strong>Paciente: {a.paciente || "-"}</strong>
                <br />
                Especialidade: {a.especialidade || "-"}
                <br />
                Local inscrição: {localMunicipio}/{localEstado}
                <br />
                Data início: {dataInicioTxt}
                {mostrarExpiracao && (
                  <>
                    <br />
                    Data expiração: {dataFimTxt}
                  </>
                )}
                {mostrarDataFinal && (
                  <>
                    <br />
                    Data final: {dataFimTxt}
                  </>
                )}
              </span>
            );

            const CardConteudo = (
              <>
                <ListItemText primary={primaryText} />
                <Box sx={{ position: "absolute", bottom: 8, right: 16 }}>
                  <Chip label={statusExibicao} color={statusColor(statusExibicao)} size="small" />
                </Box>
              </>
            );

            return (
              <Paper key={a.id} sx={{ p: 2, mb: 2, position: "relative" }}>
                <ListItemButton component="div" onClick={() => abrirDetalhes(a.id)} sx={{ pb: 3 }}>
                  {CardConteudo}
                </ListItemButton>
              </Paper>
            );
          })}
        </List>
      )}

    </Container>
  );
};

export default ProfissionalDashboard;
