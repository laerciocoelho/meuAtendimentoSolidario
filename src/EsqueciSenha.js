import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import api from "./api";
import { useNavigate } from "react-router-dom";

const EsqueciSenha = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  const [etapa, setEtapa] = useState(1); // 1: email, 2: código, 3: nova senha
  const [msg, setMsg] = useState("");
  const [msgColor, setMsgColor] = useState("error"); // "error" ou "success"

  const handleEnviarCodigo = async () => {
    setMsg("");
    try {
      const res = await api.post("/auth/enviar-codigo", { email });
      setMsg(res.data.message);
      setMsgColor("success.main");
      setEtapa(2);
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao enviar código.");
      setMsgColor("error.main");
    }
  };

  const handleVerificarCodigo = async () => {
    setMsg("");
    try {
      const res = await api.post("/auth/verificar-codigo", { email, codigo });
      setMsg(res.data.message);
      setMsgColor("success.main");
      setEtapa(3);
    } catch (err) {
      setMsg(err.response?.data?.message || "Código inválido.");
      setMsgColor("error.main");
    }
  };

  const handleResetarSenha = async () => {
    setMsg("");
    try {
      const res = await api.post("/auth/resetar-senha", {
        email,
        codigo,
        nova_senha: novaSenha,
      });
      setMsg(res.data.message);
      setMsgColor("success.main");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMsg(err.response?.data?.message || "Erro ao redefinir senha.");
      setMsgColor("error.main");
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" align="center" color="primary" gutterBottom>
          Recuperar Senha
        </Typography>

        {etapa === 1 && (
          <Box>
            <TextField
              fullWidth
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleEnviarCodigo}
            >
              Enviar código de verificação
            </Button>
          </Box>
        )}

        {etapa === 2 && (
          <Box>
            <TextField
              fullWidth
              label="Código de verificação"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              margin="normal"
              required
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleVerificarCodigo}
            >
              Verificar código
            </Button>
          </Box>
        )}

        {etapa === 3 && (
          <Box>
            <TextField
              fullWidth
              type="password"
              label="Nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              margin="normal"
              required
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleResetarSenha}
            >
              Redefinir senha
            </Button>
          </Box>
        )}

        {msg && (
          <Typography align="center" sx={{ mt: 2, color: msgColor }}>
            {msg}
          </Typography>
        )}

        <Button
          variant="text"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => navigate("/login")}
        >
          Voltar para Login
        </Button>
      </Paper>
    </Container>
  );
};

export default EsqueciSenha;
