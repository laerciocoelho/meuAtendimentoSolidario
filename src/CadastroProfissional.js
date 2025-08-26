import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import api from "./api";

// Key do Google (use .env preferencialmente)
const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  (typeof import.meta !== "undefined" ? import.meta.env?.VITE_GOOGLE_MAPS_API_KEY : "") ||
  "";

// Lista de especialidades
const especialidadesDisponiveis = [
  "Clínico Geral",
  "Cardiologia",
  "Dermatologia",
  "Ginecologia",
  "Ortopedia",
  "Pediatria",
  "Oftalmologia",
  "Odontologia",
  "Psiquiatria",
  "Neurologia",
  "Endocrinologia",
];

export default function CadastroProfissional() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    senha: "",
    nome: "",
    telefone: "",
    cep: "",
    endereco: "",
    bairro: "",
    estado: "",
    municipio: "",
    cidade: "",
    especialidade: "",
    local_atendimento: "",
    registro_conselho: "",
    uf_registro: "",
  });

  const [msg, setMsg] = useState("");
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  // Autocomplete legado
  const [placesReady, setPlacesReady] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Carregar estados (IBGE)
  useEffect(() => {
    const fetchEstados = async () => {
      try {
        setLoadingEstados(true);
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const data = await res.json();
        setEstados((data || []).sort((a, b) => a.nome.localeCompare(b.nome, "pt")));
      } catch {
        setMsg("Falha ao carregar estados.");
      } finally {
        setLoadingEstados(false);
      }
    };
    fetchEstados();
  }, []);

  // Carregar municípios (IBGE) quando UF muda
  useEffect(() => {
    const fetchMunicipios = async () => {
      if (!form.estado) {
        setMunicipios([]);
        setForm((p) => ({ ...p, municipio: "" }));
        return;
      }
      try {
        setLoadingMunicipios(true);
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`
        );
        const data = await res.json();
        setMunicipios((data || []).sort((a, b) => a.nome.localeCompare(b.nome, "pt")));
      } catch {
        setMsg("Falha ao carregar municípios.");
      } finally {
        setLoadingMunicipios(false);
      }
    };
    fetchMunicipios();
  }, [form.estado]);

  const handleChange = (e) => {
    setMsg("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // ViaCEP
  const normalizeCEP = (v) => (v || "").replace(/\D/g, "");
  const fetchCep = async () => {
    try {
      setMsg("");
      setLoadingCEP(true);
      const cepNum = normalizeCEP(form.cep);
      if (cepNum.length !== 8) {
        setMsg("CEP inválido. Informe 8 dígitos.");
        return;
      }
      const resp = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
      const data = await resp.json();
      if (data?.erro) {
        setMsg("CEP não encontrado.");
        return;
      }
      setForm((p) => ({
        ...p,
        endereco: data.logradouro || p.endereco,
        bairro: data.bairro || p.bairro,
        estado: data.uf || p.estado,
        municipio: data.localidade || p.municipio,
        cidade: data.localidade || p.cidade,
      }));
    } catch {
      setMsg("Erro ao buscar CEP.");
    } finally {
      setLoadingCEP(false);
    }
  };

  // Carrega script Maps JS + Places (URL correta + loading=async + idempotente)
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    // Se já está pronta a lib 'places', sinaliza imediatamente
    if (window.google?.maps?.places) {
      setPlacesReady(true);
      return;
    }

    // Reaproveita um script existente com o mesmo id/URL
    const existing = document.getElementById("gmaps-places-script");
    if (existing) {
      const onLoad = () => setPlacesReady(true);
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }

    // ÚNICA URL canônica (inclui libraries=places e loading=async)
    const src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=pt-BR&region=BR&loading=async`;

    const script = document.createElement("script");
    script.id = "gmaps-places-script";
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => setPlacesReady(true);
    script.onerror = () => setMsg("Erro ao carregar Google Maps Places API.");
    document.body.appendChild(script);
  }, []);


  // Inicializa o Autocomplete legado (resiliente a reload/Strict Mode)
  useEffect(() => {
    if (!placesReady) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    const inputEl = inputRef.current;
    if (!inputEl) return;

    // Se havia um Autocomplete anterior, limpa o listener
    if (autocompleteRef.current?.__listenerCleanup) {
      autocompleteRef.current.__listenerCleanup();
    }

    // Cria Autocomplete no input atual
    const ac = new window.google.maps.places.Autocomplete(inputEl, {
      types: ["establishment"],
      componentRestrictions: { country: "br" },
      fields: ["formatted_address", "address_components", "name"],
    });

    const onPlaceChanged = () => {
      const place = ac.getPlace();
      if (!place?.address_components) return;

      const getComp = (type) =>
        place.address_components.find((c) => c.types.includes(type));

      const route = getComp("route")?.long_name || "";
      const num = getComp("street_number")?.long_name || "";
      const bairro =
        getComp("sublocality_level_1")?.long_name ||
        getComp("neighborhood")?.long_name ||
        "";
      const localidade =
        getComp("locality")?.long_name ||
        getComp("administrative_area_level_2")?.long_name ||
        "";
      const uf = getComp("administrative_area_level_1")?.short_name || "";
      const cep = getComp("postal_code")?.long_name || "";

      const enderecoLinha = [route, num].filter(Boolean).join(", ");

      setForm((prev) => ({
        ...prev,
        local_atendimento: place.name || prev.local_atendimento,
        endereco: enderecoLinha || prev.endereco,
        bairro: bairro || prev.bairro,
        cep: cep || prev.cep,
        estado: uf || prev.estado,
        municipio: localidade || prev.municipio,
        cidade: localidade || prev.cidade,
      }));
    };

    const listener = ac.addListener("place_changed", onPlaceChanged);

    // Cleanup seguro (evita duplicidade no Strict Mode)
    ac.__listenerCleanup = () => {
      window.google?.maps?.event?.removeListener(listener);
    };

    autocompleteRef.current = ac;

    // Se o input for recriado (reload), este efeito roda novamente e reinstala
    return () => {
      ac.__listenerCleanup?.();
    };
  }, [placesReady]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    const obrigatorios = [
      "email",
      "senha",
      "nome",
      "cep",
      "endereco",
      "estado",
      "municipio",
      "especialidade",
      "local_atendimento",
      "registro_conselho",
      "uf_registro",
      "cidade",
    ];
    const faltantes = obrigatorios.filter((k) => !String(form[k] || "").trim());
    if (faltantes.length) {
      setMsg("Preencha todos os campos obrigatórios (telefone é opcional).");
      return;
    }

    try {
      await api.post("/auth/register/profissional", form);
      setMsg("Cadastro realizado com sucesso!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Erro ao cadastrar.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Cadastro de Profissional
        </Typography>

        {!GOOGLE_MAPS_API_KEY && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Defina REACT_APP_GOOGLE_MAPS_API_KEY no arquivo .env e reinicie o servidor para ativar o Autocomplete.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Acesso */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="E-mail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="password"
                label="Senha"
                name="senha"
                value={form.senha}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </Grid>

            {/* Identificação Profissional */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Nome"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Telefone (opcional)"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Especialidade</InputLabel>
                <Select
                  name="especialidade"
                  value={form.especialidade}
                  onChange={handleChange}
                  label="Especialidade"
                >
                  {especialidadesDisponiveis.map((esp) => (
                    <MenuItem key={esp} value={esp}>
                      {esp}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Registro de Conselho"
                name="registro_conselho"
                value={form.registro_conselho}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth required>
                <InputLabel>UF do Registro</InputLabel>
                <Select
                  name="uf_registro"
                  value={form.uf_registro}
                  onChange={handleChange}
                  label="UF do Registro"
                >
                  {estados.map((uf) => (
                    <MenuItem key={uf.sigla} value={uf.sigla}>
                      {uf.nome} ({uf.sigla})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Local de atendimento (Autocomplete legado) */}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  inputRef={inputRef}
                  label="Local de atendimento"
                  placeholder="Digite o local de atendimento"
                  value={form.local_atendimento}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, local_atendimento: e.target.value }))
                  }
                  autoComplete="off"
                  inputProps={{
                    // evita o autofill do Chrome conflitar com o Places na recarga
                    name: "the_address",
                    autoComplete: "new-street-address",
                  }}
                />
                <Tooltip title="O endereço deve ser preferencialmente o do local de atendimento.">
                  <IconButton aria-label="ajuda">
                    <InfoOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>

            {/* Endereço + CEP */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="CEP"
                name="cep"
                value={form.cep}
                onChange={handleChange}
                placeholder="00000-000"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button
                variant="outlined"
                onClick={fetchCep}
                disabled={loadingCEP || !form.cep}
                fullWidth
                sx={{ height: "100%" }}
                startIcon={loadingCEP ? <CircularProgress size={18} /> : null}
              >
                {loadingCEP ? "Buscando..." : "Buscar CEP"}
              </Button>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Endereço (Logradouro)"
                name="endereco"
                value={form.endereco}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Bairro"
                name="bairro"
                value={form.bairro}
                onChange={handleChange}
              />
            </Grid>

            {/* Estado e Município com proteção out-of-range */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={loadingEstados}>
                <InputLabel>Estado (UF)</InputLabel>
                <Select
                  name="estado"
                  label="Estado (UF)"
                  value={estados.some((uf) => uf.sigla === form.estado) ? form.estado : ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, estado: e.target.value, municipio: "" }))
                  }
                >
                  <MenuItem value="">
                    <em>Selecione</em>
                  </MenuItem>
                  {estados.map((uf) => (
                    <MenuItem key={uf.sigla} value={uf.sigla}>
                      {uf.nome} ({uf.sigla})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.estado || loadingMunicipios}>
                <InputLabel>Município</InputLabel>
                <Select
                  name="municipio"
                  label="Município"
                  value={
                    municipios.some((m) => m.nome === form.municipio) ? form.municipio : ""
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, municipio: e.target.value }))
                  }
                >
                  <MenuItem value="">
                    <em>Selecione</em>
                  </MenuItem>
                  {municipios.map((m) => (
                    <MenuItem key={m.id} value={m.nome}>
                      {m.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Cidade (principal)"
                name="cidade"
                value={form.cidade}
                onChange={handleChange}
                required
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={() => navigate("/login")}
            >
              Voltar para Login
            </Button>
            <Button type="submit" variant="contained" fullWidth>
              Cadastrar
            </Button>
          </Stack>

          {msg && (
            <Typography
              align="center"
              color={msg.includes("sucesso") ? "success.main" : "error"}
              sx={{ mt: 2 }}
            >
              {msg}
            </Typography>
          )}
        </form>
      </Paper>
    </Container>
  );
}
