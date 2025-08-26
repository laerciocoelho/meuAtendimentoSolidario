import React, { useMemo, useState } from "react";
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
  Alert,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "./api"; // import da instância axios configurada

// Mock de Estados e Municípios
const estadosMunicipios = {
  AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira"],
  AL: ["Maceió", "Arapiraca", "Palmeira dos Índios"],
  AM: ["Manaus", "Parintins", "Itacoatiara"],
  AP: ["Macapá", "Santana", "Laranjal do Jari"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
  DF: ["Brasília"],
  ES: ["Vitória", "Vila Velha", "Serra"],
  GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis"],
  MA: ["São Luís", "Imperatriz", "Caxias"],
  MG: ["Belo Horizonte", "Contagem", "Uberlândia"],
  MS: ["Campo Grande", "Dourados", "Três Lagoas"],
  MT: ["Cuiabá", "Várzea Grande", "Rondonópolis"],
  PA: ["Belém", "Ananindeua", "Santarém"],
  PB: ["João Pessoa", "Campina Grande", "Santa Rita"],
  PE: ["Recife", "Olinda", "Caruaru"],
  PI: ["Teresina", "Parnaíba", "Picos"],
  PR: ["Curitiba", "Londrina", "Maringá"],
  RJ: ["Rio de Janeiro", "Niterói", "Duque de Caxias"],
  RN: ["Natal", "Mossoró", "Parnamirim"],
  RO: ["Porto Velho", "Ji-Paraná", "Ariquemes"],
  RR: ["Boa Vista", "Rorainópolis", "Caracaraí"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
  SC: ["Florianópolis", "Joinville", "Blumenau"],
  SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto"],
  SP: ["São Paulo", "Guarulhos", "Campinas"],
  TO: ["Palmas", "Araguaína", "Gurupi"],
};

const especialidadesMock = [
  "Clínico Geral",
  "Dermatologia",
  "Oftalmologia",
  "Odontologia",
  "Cardiologia",
  "Pediatria",
  "Ginecologia",
  "Ortopedia",
];

const PacienteInscricaoAtendimento = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    estado: "",
    municipio: "",
    especialidade: "",
    descricao: "",
  });

  const [msg, setMsg] = useState("");
  const [msgTipo, setMsgTipo] = useState("info");

  const municipiosDoEstado = useMemo(() => {
    if (!form.estado) return [];
    return estadosMunicipios[form.estado] || [];
  }, [form.estado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Se o estado mudar, reseta o município
    if (name === "estado") {
      setForm((prev) => ({ ...prev, estado: value, municipio: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleInscrever = async (e) => {
    e.preventDefault();

    if (
      !form.estado ||
      !form.municipio ||
      !form.especialidade ||
      !form.descricao.trim()
    ) {
      setMsgTipo("warning");
      setMsg("Preencha todos os campos para concluir a inscrição.");
      return;
    }

    try {
      await api.post("/auth/paciente/sorteios", {
        estado: form.estado,
        municipio: form.municipio,
        especialidade: form.especialidade,
        descricao: form.descricao,
      });

      setMsgTipo("success");
      setMsg("Inscrição realizada com sucesso! Aguarde ser sorteado.");

      setTimeout(() => {
        navigate("/dashboard-paciente", { state: { reload: true } });
      }, 1000);

    } catch (err) {
      const status = err.response?.status;
      const backendMessage = err.response?.data?.message;

      if (status === 400 || status === 409) {
        setMsgTipo("warning");
        setMsg(backendMessage || "Não foi possível realizar a inscrição.");
      } else {
        setMsgTipo("error");
        setMsg("Erro ao realizar inscrição. Tente novamente.");
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Inscrever-se para um atendimento
        </Typography>

        <form onSubmit={handleInscrever}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                >
                  {Object.keys(estadosMunicipios).map((uf) => (
                    <MenuItem key={uf} value={uf}>
                      {uf}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Município</InputLabel>
                <Select
                  name="municipio"
                  value={form.municipio}
                  onChange={handleChange}
                  disabled={!form.estado}
                >
                  {municipiosDoEstado.map((cidade) => (
                    <MenuItem key={cidade} value={cidade}>
                      {cidade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Especialidade</InputLabel>
                <Select
                  name="especialidade"
                  value={form.especialidade}
                  onChange={handleChange}
                >
                  {especialidadesMock.map((esp) => (
                    <MenuItem key={esp} value={esp}>
                      {esp}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="descricao"
                label="Descritivo da Necessidade"
                value={form.descricao}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Confirmar inscrição
              </Button>
            </Grid>
          </Grid>
        </form>

        {msg && (
          <Alert severity={msgTipo} sx={{ mt: 2 }}>
            {msg}
          </Alert>
        )}

        {/* Regras e advertências */}
        <Typography variant="h6" sx={{ mt: 4 }}>
          Regras e Advertências
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • A inscrição é exclusivamente para a pessoa cadastrada — não é
          permitido “ceder” ou repassar o atendimento.
          <br />
          • Cadastro de terceiros, informações falsas ou tentativa de burlar o
          sorteio caracterizam fraude e resultam em bloqueio por 6 meses.
          <br />• Mantenha telefone e e-mail atualizados: a impossibilidade de
          contato pode implicar penalidades e remoção do sorteio.
          <br />• A validade da inscrição é de 30 dias, podendo ser renovada a
          qualquer momento a partir do seu painel.
        </Typography>

        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Button variant="text" onClick={() => navigate("/dashboard-paciente")}>
            Voltar ao painel
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default PacienteInscricaoAtendimento;
