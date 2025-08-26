import React, { useState } from "react";
import axios from "axios";

function SorteioPaciente() {
  const [especialidade, setEspecialidade] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token"); // ou onde você armazena o JWT

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = "http://localhost:5000/auth/sortear-paciente"; // endpoint correto
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg(response.data.message);
    } catch (err) {
      // Exibe a mensagem detalhada do backend, se existir
      const backendMsg = err.response?.data?.message;
      setMsg(backendMsg || "Erro no sorteio.");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <button type="submit">Sortear Paciente</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}

export default SorteioPaciente;