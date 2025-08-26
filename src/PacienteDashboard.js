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
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";

const statusColor = (statusLegivel) => {
  switch (statusLegivel) {
    case "Concluído":
      return "success";
    case "Expirado":
      return "error";
    case "Em atendimento":
      return "info";
    case "Cancelado pelo profissional":
      return "error";
    case "Cancelado pelo paciente":
      return "error";
    case "Aguardando sorteio":
      return "warning";
    default:
      return "default";
  }
};

const PacienteDashboard = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [atendimentos, setAtendimentos] = useState([]);
  const [sorteios, setSorteios] = useState([]);
  const [loadingAtend, setLoadingAtend] = useState(true);
  const [loadingSorteios, setLoadingSorteios] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchHistorico = async () => {
    setLoadingAtend(true);
    try {
      const res = await api.get("/auth/paciente/atendimentos");
      setAtendimentos(res.data);
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao carregar histórico.");
    } finally {
      setLoadingAtend(false);
    }
  };

  const fetchSorteios = async () => {
    setLoadingSorteios(true);
    try {
      const res = await api.get("/auth/paciente/sorteios");
      setSorteios(res.data);
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao carregar lista de sorteios.");
    } finally {
      setLoadingSorteios(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
    fetchSorteios();
  }, [state?.reload]);

  const resumo = useMemo(() => {
    const concluidos = atendimentos.filter((a) => {
      // Conta como concluído quando status interno é finalizado_confirmado
      // ou quando a label amigável já vier como "Concluído".
      return a.status === "finalizado_confirmado" || a.status_legivel === "Concluído";
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
        a.status_legivel === "Cancelado pelo profissional" ||
        a.status_legivel === "Cancelado pelo paciente" ||
        a.status === "cancelado_profissional" ||
        a.status === "cancelado_paciente"
      );
    }).length;

    return { concluidos, expirados, emAtendimento, cancelados };
  }, [atendimentos]);


  const tempoRestante = (dataSorteio) => {
    if (!dataSorteio) return "Sem data";
    const expiracao = new Date(dataSorteio);
    expiracao.setDate(expiracao.getDate() + 30);
    const diff = expiracao - new Date();
    if (diff <= 0) return "Expirado";
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${dias}d ${horas}h restantes`;
  };

  const editarDados = () => navigate("/paciente/editar-dados");

  const abrirDetalhes = (id) => navigate(`/paciente/atendimento/${id}`);

  const inscreverAtendimento = () => navigate("/paciente/inscricao-atendimento");

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  // Renovar prazo do sorteio
  const renovarSorteio = async (id) => {
    try {
      await api.put(`/auth/paciente/sorteios/${id}/renovar`);
      fetchSorteios();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao renovar prazo do sorteio.");
    }
  };

  // Cancelar inscrição do sorteio
  const cancelarSorteio = async (id) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta inscrição?")) return;

    try {
      await api.put(`/auth/paciente/sorteios/${id}/cancelar`);
      alert("Inscrição cancelada com sucesso.");
      fetchSorteios();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao cancelar inscrição.");
    }
  };

  const abrirDetalhesInscricao = (id) => navigate(`/paciente/inscricao/${id}`);

  <List>
    {sorteios.map((s) => (
      <Paper key={s.id} sx={{ p: 2, mb: 2, position: "relative" }}>
        <ListItemButton onClick={() => abrirDetalhesInscricao(s.id)}>
          <ListItemText
            primary={
              <>
                <Chip
                  label={s.status_legivel || s.status}
                  color={statusColor(s.status_legivel || s.status)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                {s.especialidade} - {s.profissional_municipio}/{s.profissional_estado}
              </>
            }
            secondary={
              <>
                Expira em: {s.data_expiracao ? new Date(s.data_expiracao).toLocaleDateString("pt-BR") : "Sem data"}
              </>
            }
          />
        </ListItemButton>
      </Paper>
    ))}
  </List>

  // Cancelar atendimento ativo
  const cancelarAtendimento = async (id) => {
    if (!window.confirm("Tem certeza que deseja cancelar este atendimento?")) return;

    try {
      await api.put(`/auth/atendimentos/${id}/cancelar`, {
        justificativa: "Cancelamento pelo paciente" // Ou você pode abrir modal para coletar justificativa
      });
      alert("Atendimento cancelado com sucesso.");
      fetchHistorico(); // Atualiza a lista para refletir mudança
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao cancelar atendimento.");
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Topo e Ações */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 0 }}>
          Área do Paciente
        </Typography>
        <Button variant="contained" onClick={inscreverAtendimento}>
          Inscrever-se para Sorteio
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

      {/* Resumo de Atendimentos */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography fontWeight="bold">Resumo de Atendimentos</Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
          <Chip label={`Concluídos: ${resumo.concluidos}`} color="success" />
          <Chip label={`Expirados: ${resumo.expirados}`} color="warning" />
          <Chip label={`Em atendimento: ${resumo.emAtendimento}`} color="info" />
          <Chip label={`Cancelados: ${resumo.cancelados}`} color="error" />
        </Stack>
      </Paper>

      {/* Lista dos Sorteios Ativos */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Sorteios em que você está participando
      </Typography>
      {loadingSorteios ? (
        <CircularProgress />
      ) : sorteios.length === 0 ? (
        <Typography sx={{ mt: 2 }}>Você não está participando de nenhum sorteio.</Typography>
      ) : (
        <List>
          {sorteios.map((s) => {
            const dataInscricaoTxt = s.data_inscricao
              ? new Date(s.data_inscricao).toLocaleDateString("pt-BR")
              : "Sem data";
            const dataExpiracaoTxt = s.data_expiracao
              ? new Date(s.data_expiracao).toLocaleDateString("pt-BR")
              : "Sem data";

            const primaryText = (
              <span>
                Especialidade: {s.especialidade || "-"}
                <br />
                Local: {(s.profissional_municipio || s.municipio || "-")}/{(s.profissional_estado || s.estado || "-")}
                <br />
                Inscrito em: {dataInscricaoTxt}
                <br />
                Expira em: {dataExpiracaoTxt}
              </span>
            );

            const CardConteudo = (
              <>
                <ListItemText primary={primaryText} />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 25,
                    right: 16,
                  }}
                >
                  <Chip
                    label={s.status_legivel || s.status}
                    color={statusColor(s.status_legivel || s.status)}
                    size="small"
                  />
                </Box>
              </>
            );

            return (
              <Paper key={s.id} sx={{ p: 2, mb: 2, position: "relative" }}>
                <ListItemButton
                  component="div"
                  onClick={() => navigate(`/paciente/inscricao/${s.id}`)}
                  sx={{ pb: 3 }}
                >
                  {CardConteudo}
                </ListItemButton>
              </Paper>
            );
          })}
        </List>
      )}

      {/* Histórico de Atendimentos */}
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Histórico de Atendimentos
      </Typography>
      {loadingAtend ? (
        <CircularProgress />
      ) : atendimentos.length === 0 ? (
        <Typography>Nenhum atendimento encontrado.</Typography>
      ) : (
        <List>
          {atendimentos.map((a) => {
            const statusBruto = a.status; // ex.: "finalizado_profissional", "finalizado_confirmado"
            const statusLegivelAPI = a.status_legivel || a.status;

            // Mapeamento de exibição:
            // - finalizado_profissional => "Finalizado pelo profissional"
            // - finalizado_confirmado  => "Concluído"
            let statusExibicao = statusLegivelAPI;
            if (statusBruto === "finalizado_profissional") {
              statusExibicao = "Finalizado pelo profissional";
            } else if (statusBruto === "finalizado_confirmado") {
              statusExibicao = "Concluído";
            }

            // Card clicável quando "Em atendimento" ou "finalizado_profissional"
            const podeClicar =
              statusExibicao === "Em atendimento" || statusBruto === "finalizado_profissional";

            const dataInicioTxt = a.data_inicio
              ? new Date(a.data_inicio).toLocaleDateString("pt-BR")
              : "-";
            const dataFimTxt = a.data_fim
              ? new Date(a.data_fim).toLocaleDateString("pt-BR")
              : "-";

            const mostrarDataLimite = statusExibicao === "Em atendimento";
            const mostrarDataFinal =
              statusExibicao === "Cancelado pelo paciente" ||
              statusExibicao === "Cancelado pelo profissional" ||
              statusExibicao === "Finalizado pelo profissional" ||
              statusExibicao === "Concluído";

            const primaryText = (
              <span>
                Especialidade: {a.especialidade || "-"}
                <br />
                Profissional: {a.profissional || "-"}
                <br />
                Data início: {dataInicioTxt}
                {mostrarDataLimite && (
                  <>
                    <br />
                    Data limite: {dataFimTxt}
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
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 25,
                    right: 30,
                  }}
                >
                  <Chip
                    label={statusExibicao}
                    color={statusColor(statusExibicao)}
                    size="small"
                  />
                </Box>
              </>
            );

            return (
              <Paper key={a.id} sx={{ p: 2, mb: 2, position: "relative" }}>
                {podeClicar ? (
                  <ListItemButton
                    component="div"
                    onClick={() => navigate(`/paciente/atendimento/${a.id}`)}
                    sx={{ pb: 3 }}
                  >
                    {CardConteudo}
                  </ListItemButton>
                ) : (
                  <>{CardConteudo}</>
                )}
              </Paper>
            );
          })}
        </List>
      )}


    </Container>
  );
};

export default PacienteDashboard;
