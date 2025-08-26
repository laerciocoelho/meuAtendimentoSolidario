import React, { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Paper,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Box,
    Chip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";

const DetalhesInscricao = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [inscricao, setInscricao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [justificativa, setJustificativa] = useState("");
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");
    const [executando, setExecutando] = useState(false);

    useEffect(() => {
        const fetchInscricao = async () => {
            try {
                const res = await api.get(`/auth/paciente/sorteios/${id}`); // Crie esse endpoint no backend!
                setInscricao(res.data);
            } catch (err) {
                setError(
                    err.response?.data?.message || "Erro ao carregar detalhes da inscrição."
                );
            } finally {
                setLoading(false);
            }
        };
        fetchInscricao();
    }, [id]);

    const renovar = async () => {
        setExecutando(true);
        setError("");
        try {
            await api.put(`/auth/paciente/sorteios/${id}/renovar`);
            setMsg("Prazo renovado com sucesso!");
        } catch (err) {
            setError(err.response?.data?.message || "Erro ao renovar prazo.");
        } finally {
            setExecutando(false);
        }
    };

    const cancelar = async () => {
        setExecutando(true);
        setError("");
        if (justificativa.trim().length < 1) {
            setError("Justificativa é obrigatória.");
            setExecutando(false);
            return;
        }
        try {
            await api.put(`/auth/paciente/sorteios/${id}/cancelar`, { justificativa });
            setMsg("Inscrição cancelada com sucesso!");
            setTimeout(() => navigate("/dashboard-paciente"), 1200);
        } catch (err) {
            setError(err.response?.data?.message || "Erro ao cancelar inscrição.");
        } finally {
            setExecutando(false);
        }
    };

    if (loading) return <CircularProgress />;

    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Detalhes da Inscrição
                </Typography>

                {/* Status com Chip */}
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={inscricao.status_legivel || inscricao.status || "-"}
                        color={statusColor(inscricao.status_legivel || inscricao.status)}
                        size="small"
                    />
                </Box>

                <Typography sx={{ mb: 1 }}>
                    <strong>Especialidade:</strong> {inscricao.especialidade}
                    <br />
                    <strong>Local:</strong> {inscricao.profissional_municipio}/{inscricao.profissional_estado}
                    <br />
                    <strong>Data da inscrição:</strong>{" "}
                    {inscricao.data_inscricao
                        ? new Date(inscricao.data_inscricao).toLocaleDateString("pt-BR")
                        : "Sem informação"}
                    <br />
                    <strong>Expira em:</strong>{" "}
                    {inscricao.data_expiracao
                        ? new Date(inscricao.data_expiracao).toLocaleDateString("pt-BR")
                        : "Sem data"}

                    <Button variant="text" size="small" onClick={renovar} disabled={executando} >
                        Renovar Prazo
                    </Button>

                </Typography>


                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Necessidade informada
                </Typography>
                <Typography sx={{ whiteSpace: "pre-line" }}>
                    {inscricao.descricao_necessidade || "Não informado"}
                </Typography>


                <TextField
                    label="Justificativa para Cancelamento"
                    placeholder="Descreva o motivo do cancelamento"
                    multiline
                    minRows={3}
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    fullWidth
                    sx={{ mt: 3 }}
                    required
                />


                <Button sx={{ mt: 2 }}
                    variant="contained"
                    color="error"
                    onClick={cancelar}
                    disabled={executando || justificativa.trim().length < 1} fullWidth>
                    Cancelar Inscrição
                </Button>

                {msg && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        {msg}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                <Button variant="outlined" onClick={() => navigate("/dashboard-paciente")} sx={{ mt: 3 }} fullWidth>
                    Voltar
                </Button>
            </Paper>
        </Container>
    );

};

function statusColor(status) {
    switch (status) {
        case "Concluído":
            return "success";
        case "Expirado":
            return "error";
        case "Em atendimento":
            return "info";
        case "Cancelado pelo profissional":
        case "Cancelado pelo paciente":
            return "error";
        case "Aguardando sorteio":
            return "warning";
        default:
            return "default";
    }
}

export default DetalhesInscricao;