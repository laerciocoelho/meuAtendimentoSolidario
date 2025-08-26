import React, { useState } from "react";
import axios from "axios";

function Ranking() {
  const [especialidade, setEspecialidade] = useState("");
  const [cidade, setCidade] = useState("");
  const [dados, setDados] = useState([]);

  const atualizar = async () => {
    let url = "http://localhost:5000/ranking";
    const params = [];
    if (especialidade) params.push(`especialidade=${especialidade}`);
    if (cidade) params.push(`cidade=${cidade}`);
    if (params.length) url += `?${params.join("&")}`;
    try {
      const resp = await axios.get(url);
      setDados(resp.data);
    } catch {
      setDados([]);
    }
  };

  return (
    <div>
      <h2>Ranking de Profissionais</h2>
      <input placeholder="Filtrar especialidade" value={especialidade} onChange={e => setEspecialidade(e.target.value)} />
      <input placeholder="Filtrar cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
      <button onClick={atualizar}>Buscar Ranking</button>
      <ul>
        {dados.map((item, i) =>
          <li key={i}>{item.nome} | {item.especialidade} | {item.cidade} | {item.atendimentos} atendimentos</li>
        )}
      </ul>
    </div>
  );
}

export default Ranking;
