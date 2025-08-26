import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "./api";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [tipo, setTipo] = useState(null); // começa sem seleção
  const [msg, setMsg] = useState("");
  const [tipoErro, setTipoErro] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleTipoChange = (_, novo) => {
    setTipo(novo);
    setTipoErro(false); // reset erro ao selecionar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!tipo) {
      setTipoErro(true);
      setMsg("Selecione se é Paciente ou Profissional.");
      return;
    }

    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        senha: form.senha,
        tipo,
      });
      const { access_token, user } = res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.tipo === "paciente") {
        navigate("/dashboard-paciente");
      } else {
        navigate("/dashboard-profissional");
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Erro ao fazer login.");
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10 }}>
      <Box
        sx={{
          bgcolor: "#f5f7fa",
          p: 4,
          borderRadius: 4,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" align="center" color="primary" gutterBottom>
          Entrar na Plataforma
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Campos de entrada */}
          <TextField
            fullWidth
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Senha"
            name="senha"
            type="password"
            value={form.senha}
            onChange={handleChange}
            margin="normal"
            required
          />

          {/* Seleção de tipo logo abaixo */}
          <ToggleButtonGroup
            color="primary"
            value={tipo}
            exclusive
            onChange={handleTipoChange}
            fullWidth
            sx={{ my: 2 }}
          >
            <ToggleButton value="paciente" sx={{ fontWeight: 600 }}>
              Paciente
            </ToggleButton>
            <ToggleButton value="profissional" sx={{ fontWeight: 600 }}>
              Profissional
            </ToggleButton>
          </ToggleButtonGroup>

          {tipoErro && (
            <Typography color="error" variant="body2" align="center">
              É necessário selecionar um tipo de usuário.
            </Typography>
          )}

          {/* Botão de envio */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, py: 1.3, fontWeight: 700 }}
          >
            Entrar
          </Button>

          {msg && !tipoErro && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {msg}
            </Typography>
          )}

          {/* Links extras */}
          <Grid container justifyContent="space-between" sx={{ mt: 2 }}>
            <Grid item>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/esqueci-senha")}
              >
                Esqueci minha senha
              </Link>
            </Grid>
            <Grid item>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/cadastro-paciente")}
              >
                Cadastrar Paciente
              </Link>
              {" | "}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/cadastro-profissional")}
              >
                Cadastrar Profissional
              </Link>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Container>
  );
};

export default Login;
