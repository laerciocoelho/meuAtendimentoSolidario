import React, { useState } from "react";
import axios from "axios";

function FinalizarAtendimento() {
  const [atendimentoId, setAtendimentoId] = useState("");
  const [quem, setQuem] = useState("profissional");
  const [msg, setMsg] = useState("");

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const url = `http://localhost:5000/atendimento/${atendimentoId}/finalizar`;
      const resp = await axios.post(url, { quem });
      setMsg(resp.data.message);
    } catch (err) {
      setMsg("Erro ao finalizar.");
    }
  };

  return (
    <div>
      <h2>Finalizar Atendimento</h2>
      <form onSubmit={onSubmit}>
        <input placeholder="ID Atendimento" value={atendimentoId} onChange={e => setAtendimentoId(e.target.value)} required />
        <select value={quem} onChange={e => setQuem(e.target.value)}>
          <option value="profissional">Profissional</option>
          <option value="paciente">Paciente</option>
        </select>
        <button type="submit">Finalizar</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}

export default FinalizarAtendimento;
