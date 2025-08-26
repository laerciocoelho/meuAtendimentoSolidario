import React from "react";
import {
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Box
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";




const PacienteSorteado = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const paciente = state?.paciente || null;
  const atendimentoId = state?.atendimento_id || null;

  if (!paciente || !atendimentoId) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            Nenhum paciente foi sorteado.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/dashboard-profissional")}
            sx={{ mt: 2 }}
          >
            Voltar para o Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  // Preferir a chave padronizada; manter fallback para compatibilidade
  const descricaoNecessidade =
    (paciente.descricao_necessidade && paciente.descricao_necessidade.toString().trim()) ||
    (paciente.descricao && paciente.descricao.toString().trim()) ||
    "";

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" color="primary" align="center" gutterBottom>
          Paciente Sorteado
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography>
                <strong>Nome:</strong> {paciente.nome || "-"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography>
                <strong>Município:</strong> {paciente.municipio || "-"} - {paciente.estado || "-"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography>
                <strong>E-mail:</strong> {paciente.email || "-"}
              </Typography>
            </Grid>

            {paciente.telefone && (
              <Grid item xs={12}>
                <Typography>
                  <strong>Telefone:</strong> {paciente.telefone}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography>
                <strong>Especialidade buscada:</strong> {paciente.especialidade_necessaria || "-"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ whiteSpace: "pre-line" }}>
                <strong>Descrição da Necessidade:</strong>{" "}
                {descricaoNecessidade || "Não informado"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Button
          variant="contained"
          color="success"
          onClick={() => navigate(`/profissional/atendimento/${atendimentoId}`)}
          fullWidth
          sx={{ mt: 3 }}
        >
          Entrar em contato
        </Button>

        <Button
          variant="text"
          fullWidth
          onClick={() => navigate("/dashboard-profissional")}
          sx={{ mt: 1 }}
        >
          Voltar para o Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default PacienteSorteado;
