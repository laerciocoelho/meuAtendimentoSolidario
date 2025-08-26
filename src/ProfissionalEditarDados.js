import React, { useState, useEffect, useRef } from "react";
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
    Tooltip,
    IconButton,
    CircularProgress,
    Stack,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import api from "./api";
import { useNavigate } from "react-router-dom";

const GOOGLE_MAPS_API_KEY = "AIzaSyDZOsr7yaVkcm8BLALcb7s99dOTcrPKbbw"; // Sua chave do Google

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

const ProfissionalEditarDados = () => {
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
    const [loadingEstados, setLoadingEstados] = useState(false);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [estados, setEstados] = useState([]);
    const [municipios, setMunicipios] = useState([]);
    const [placesReady, setPlacesReady] = useState(false);

    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    // Busca dados do profissional logado
    useEffect(() => {
        const fetchDados = async () => {
            try {
                const res = await api.get("/auth/me");
                setForm((prev) => ({
                    ...prev,
                    ...res.data,
                    senha: "", // senha não vem do backend
                }));
            } catch {
                setMsg("Erro ao carregar dados do profissional.");
            }
        };
        fetchDados();
    }, []);

    // Carrega estados IBGE
    useEffect(() => {
        const fetchEstados = async () => {
            try {
                setLoadingEstados(true);
                const res = await fetch(
                    "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
                );
                const data = await res.json();
                setEstados(data.sort((a, b) => a.nome.localeCompare(b.nome, "pt")));
            } catch {
                setMsg("Falha ao carregar estados do IBGE.");
            } finally {
                setLoadingEstados(false);
            }
        };
        fetchEstados();
    }, []);

    // Carrega municípios IBGE quando estado muda
    useEffect(() => {
        const fetchMunicipios = async () => {
            if (!form.estado) {
                setMunicipios([]);
                setForm((prev) => ({ ...prev, municipio: "" }));
                return;
            }
            try {
                setLoadingMunicipios(true);
                const res = await fetch(
                    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`
                );
                const data = await res.json();
                setMunicipios(data.sort((a, b) => a.nome.localeCompare(b.nome, "pt")));
            } catch {
                setMsg("Falha ao carregar municípios do IBGE.");
            } finally {
                setLoadingMunicipios(false);
            }
        };
        fetchMunicipios();
    }, [form.estado]);

    // ViaCEP
    const normalizeCEP = (cep) => (cep || "").replace(/\D/g, "");
    const fetchCep = async () => {
        try {
            setMsg("");
            setLoadingCEP(true);
            const cepNum = normalizeCEP(form.cep);
            if (cepNum.length !== 8) {
                setMsg("CEP inválido.");
                return;
            }
            const resp = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
            const data = await resp.json();
            if (data?.erro) {
                setMsg("CEP não encontrado.");
                return;
            }
            setForm((prev) => ({
                ...prev,
                endereco: data.logradouro || prev.endereco,
                bairro: data.bairro || prev.bairro,
                estado: data.uf || prev.estado,
                municipio: data.localidade || prev.municipio,
                cidade: data.localidade || prev.cidade,
            }));
        } catch {
            setMsg("Erro ao buscar CEP.");
        } finally {
            setLoadingCEP(false);
        }
    };

    // Google Maps Places
    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) return;
        if (window.google && window.google.maps && window.google.maps.places) {
            setPlacesReady(true);
            return;
        }
        if (document.getElementById("gmaps-script")) {
            document
                .getElementById("gmaps-script")
                .addEventListener("load", () => setPlacesReady(true));
            return;
        }
        const script = document.createElement("script");
        script.id = "gmaps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=pt-BR&region=BR`;
        script.async = true;
        script.defer = true;
        script.onload = () => setPlacesReady(true);
        script.onerror = () =>
            setMsg("Erro ao carregar Google Maps Places API.");
        document.body.appendChild(script);
    }, []);

    // Inicializa Autocomplete
    useEffect(() => {
        if (!placesReady) return;
        if (!inputRef.current) return;
        if (autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["establishment"],
            componentRestrictions: { country: "br" },
            fields: ["formatted_address", "address_components", "name"],
        });

        ac.addListener("place_changed", () => {
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
        });
        autocompleteRef.current = ac;
    }, [placesReady]);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put("/auth/profissional/atualizar", form);
            setMsg("Dados atualizados com sucesso!");
        } catch (err) {
            setMsg(err.response?.data?.message || "Erro ao atualizar.");
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" align="center" gutterBottom>
                    Editar Dados Profissionais
                </Typography>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        {/* Dados pessoais */}
                        <Grid item xs={12} md={6}>
                            <TextField label="E-mail" name="email" value={form.email} onChange={handleChange} required fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField label="Nome" name="nome" value={form.nome} onChange={handleChange} required fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Especialidade</InputLabel>
                                <Select name="especialidade" value={form.especialidade} onChange={handleChange}>
                                    {especialidadesDisponiveis.map((esp) => (
                                        <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {/* Local atendimento */}
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    inputRef={inputRef}
                                    label="Local de Atendimento"
                                    name="local_atendimento"
                                    value={form.local_atendimento}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                                <Tooltip title="O endereço deve ser preferencialmente o do local de atendimento.">
                                    <IconButton><InfoOutlinedIcon /></IconButton>
                                </Tooltip>
                            </Stack>
                        </Grid>
                        {/* CEP e Endereço */}
                        <Grid item xs={8} md={4}>
                            <TextField label="CEP" name="cep" value={form.cep} onChange={handleChange} required fullWidth />
                        </Grid>
                        <Grid item xs={4} md={2}>
                            <Button onClick={fetchCep} disabled={loadingCEP} fullWidth sx={{ height: "100%" }}>
                                {loadingCEP ? "Buscando..." : "Buscar CEP"}
                            </Button>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField label="Endereço" name="endereco" value={form.endereco} onChange={handleChange} required fullWidth />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth required disabled={loadingEstados}>
                                <InputLabel>Estado (UF)</InputLabel>
                                <Select name="estado" value={form.estado} onChange={handleChange}>
                                    {estados.map((uf) => (
                                        <MenuItem key={uf.sigla} value={uf.sigla}>
                                            {uf.nome} ({uf.sigla})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth required disabled={!form.estado || loadingMunicipios}>
                                <InputLabel>Município</InputLabel>
                                <Select name="municipio" value={form.municipio} onChange={handleChange}>
                                    {municipios.map((m) => (
                                        <MenuItem key={m.id} value={m.nome}>{m.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} required fullWidth />
                        </Grid>
                        {/* Registro de conselho e UF */}
                        <Grid item xs={6}>
                            <TextField
                                label="Registro de Conselho"
                                name="registro_conselho"
                                value={form.registro_conselho}
                                fullWidth
                                InputProps={{ readOnly: true }}
                                sx={{
                                    backgroundColor: "#f0f0f0",
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "#6e6e6e",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="UF do Registro"
                                name="uf_registro"
                                value={form.uf_registro}
                                fullWidth
                                InputProps={{ readOnly: true }}
                                sx={{
                                    backgroundColor: "#f0f0f0",
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: "#6e6e6e",
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>
                    {/* Botões */}
                    <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                        <Button type="submit" variant="contained" fullWidth>Salvar Alterações</Button>
                        <Button variant="outlined" fullWidth onClick={() => navigate("/dashboard-profissional")}>
                            Voltar
                        </Button>
                    </Stack>
                    {msg && (
                        <Typography align="center" sx={{ mt: 2 }} color={msg.includes("sucesso") ? "success.main" : "error"}>
                            {msg}
                        </Typography>
                    )}
                </form>
            </Paper>
        </Container>
    );
};

export default ProfissionalEditarDados;
