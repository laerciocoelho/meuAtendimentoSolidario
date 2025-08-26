import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "./api";

function Home() {
  const navigate = useNavigate();

  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setLoading(true);
      setErro("");
      try {
        const res = await api.get("/auth/ranking-profissionais");
        if (!cancelado) setRanking(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelado) setErro(err?.response?.data?.message || "Erro ao carregar ranking.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  // Ordenação defensiva no front: total desc; empate: nome asc
  const rankingOrdenado = useMemo(() => {
    const arr = Array.isArray(ranking) ? [...ranking] : [];
    return arr.sort((a, b) => {
      const diff = (b.total_concluidos || 0) - (a.total_concluidos || 0);
      if (diff !== 0) return diff;
      const nomeA = (a.nome || "").toLocaleLowerCase("pt-BR");
      const nomeB = (b.nome || "").toLocaleLowerCase("pt-BR");
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [ranking]);

  return (
    <Container maxWidth="md" sx={{ mt: 10, mb: 8 }}>
      {/* Hero */}
      <Box sx={{ bgcolor: "#f5f7fa", p: 5, borderRadius: 3, boxShadow: 2, mb: 4 }}>
        <Typography variant="h3" gutterBottom align="center" color="primary">
          Atendimento Solidário
        </Typography>
        <Typography variant="body1" gutterBottom align="center" sx={{ mb: 2 }}>
          Plataforma gratuita para conectar profissionais voluntários da saúde e pacientes que necessitam de atendimento.
          Sorteios justos, histórico de atendimentos, ranking por especialidade e cidade e políticas de uso consciente
          para garantir ética e acesso igualitário.
        </Typography>
        <Box display="flex" justifyContent="center">
          <Button variant="contained" size="large" onClick={() => navigate("/login")}>
            Entrar
          </Button>
        </Box>
      </Box>

      {/* Como funciona */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Como funciona
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} divider={<Divider flexItem orientation="vertical" />}>
          {/* Pacientes */}
          <Box flex={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Para Pacientes
            </Typography>
            <List dense>
              <ListItem disableGutters>
                <ListItemText
                  primary="1) Cadastro"
                  secondary="Crie uma conta informando seus dados e a especialidade necessária."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="2) Inscrição no sorteio"
                  secondary="Escolha estado e município onde deseja ser atendido e inscreva-se para a especialidade desejada."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="3) Sorteio e contato"
                  secondary="Quando um profissional local sorteá-lo, um atendimento é criado e o contato poderá ser feito para combinar o cuidado."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="4) Conclusão e confirmação"
                  secondary="Após o atendimento, o profissional conclui e você confirma a finalização pelo sistema."
                />
              </ListItem>
            </List>
          </Box>

          {/* Profissionais */}
          <Box flex={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Para Profissionais
            </Typography>
            <List dense>
              <ListItem disableGutters>
                <ListItemText
                  primary="1) Cadastro"
                  secondary="Crie uma conta informando especialidade, local de atendimento e registro profissional."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="2) Sortear paciente"
                  secondary="Acesse o painel e realize o sorteio para sua especialidade/localidade, criando o atendimento automaticamente."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="3) Condução do caso"
                  secondary="Combine com o paciente, realize o atendimento e, ao final, conclua o atendimento no sistema."
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText
                  primary="4) Ranking"
                  secondary="Atendimentos confirmados contam no ranking público por especialidade e estado."
                />
              </ListItem>
            </List>
          </Box>
        </Stack>
      </Paper>

      {/* Ranking */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ranking de Profissionais
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : erro ? (
          <Alert severity="error">{erro}</Alert>
        ) : rankingOrdenado.length === 0 ? (
          <Alert severity="info">Ainda não há profissionais com atendimentos concluídos.</Alert>
        ) : (
          <Table size="small" aria-label="ranking-profissionais">
            <TableHead>
              <TableRow>
                <TableCell>Profissional</TableCell>
                <TableCell>Especialidade</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Concluídos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankingOrdenado.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell>{p.especialidade || "-"}</TableCell>
                  <TableCell>{p.estado || "-"}</TableCell>
                  <TableCell align="right">{p.total_concluidos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
}

export default Home;
