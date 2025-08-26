import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  CircularProgress,
} from "@mui/material";
import api from "./api";
import { useNavigate } from "react-router-dom";

const PacienteEditarDados = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cpf: "",
    email: "",
    nome: "",
    telefone: "",
    cep: "",
    endereco: "",
    bairro: "",
    estado: "",
    municipio: "",
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get("/auth/me");
        setForm({
          cpf: res.data.cpf || "",
          email: res.data.email || "",
          nome: res.data.nome || "",
          telefone: res.data.telefone || "",
          cep: res.data.cep || "",
          endereco: res.data.endereco || "",
          bairro: res.data.bairro || "",
          estado: res.data.estado || "",
          municipio: res.data.municipio || "",
        });
      } catch {
        setMsg("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/paciente/atualizar", form);
      setMsg("Dados atualizados com sucesso!");
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao atualizar dados.");
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Editar Dados Pessoais - Paciente
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="CPF"
                name="cpf"
                value={form.cpf}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  backgroundColor: "#f0f0f0",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ccc",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="E-mail" name="email" value={form.email} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Nome" name="nome" value={form.nome} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="CEP" name="cep" value={form.cep} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Endereço" name="endereco" value={form.endereco} onChange={handleChange} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="Estado" name="estado" value={form.estado} onChange={handleChange} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="Município" name="municipio" value={form.municipio} onChange={handleChange} />
            </Grid>
          </Grid>
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
            Salvar Alterações
          </Button>
          {msg && (
            <Typography align="center" color={msg.includes("sucesso") ? "success.main" : "error"} sx={{ mt: 2 }}>
              {msg}
            </Typography>
          )}
          <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => navigate("/dashboard-paciente")}>
            Voltar
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default PacienteEditarDados;
