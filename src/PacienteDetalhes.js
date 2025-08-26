import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";

const PacienteDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const res = await api.get(`/auth/pacientes/${id}`);
        setPaciente(res.data);
      } catch (err) {
        setMsg(err.response?.data?.message || "Erro ao carregar paciente.");
      } finally {
        setLoading(false);
      }
    };
    fetchPaciente();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!paciente) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            {msg || "Paciente não encontrado."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/dashboard-profissional")}
            sx={{ mt: 2 }}
          >
            Voltar
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" color="primary" gutterBottom>
          Detalhes do Paciente
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography><strong>Nome:</strong> {paciente.nome}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>CPF:</strong> {paciente.cpf}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>E-mail:</strong> {paciente.email}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Telefone:</strong> {paciente.telefone || "-"}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography><strong>CEP:</strong> {paciente.cep}</Typography>
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography>
              <strong>Endereço:</strong> {paciente.endereco}, {paciente.bairro}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Município:</strong> {paciente.municipio}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Estado:</strong> {paciente.estado}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Especialidade Necessária:</strong> {paciente.especialidade_necessaria}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Descrição da Necessidade:</strong> {paciente.descricao_necessidade}</Typography>
          </Grid>
        </Grid>
        <Button
          variant="outlined"
          onClick={() => navigate("/dashboard-profissional")}
          sx={{ mt: 3 }}
        >
          Voltar ao Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default PacienteDetalhes;
