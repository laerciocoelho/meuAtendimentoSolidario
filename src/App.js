import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline } from "@mui/material";

// Páginas públicas
import Home from "./Home";
import Login from "./Login";
import EsqueciSenha from "./EsqueciSenha";
import CadastroPaciente from "./CadastroPaciente";
import CadastroProfissional from "./CadastroProfissional";

// Paciente
import PacienteDashboard from "./PacienteDashboard";
import PacienteEditarDados from "./PacienteEditarDados";
import PacienteInscricaoAtendimento from "./PacienteInscricaoAtendimento";

// Profissional
import ProfissionalDashboard from "./ProfissionalDashboard";
import PacienteSorteado from "./PacienteSorteado";
import DetalheAtendimento from "./DetalheAtendimento";
import ProfissionalEditarDados from "./ProfissionalEditarDados";
import PacienteDetalhes from "./PacienteDetalhes";
import DetalhesInscricao from "./DetalhesInscricao";

// Proteção
import RequireAuth from "./RequireAuth";

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/cadastro-paciente" element={<CadastroPaciente />} />
        <Route path="/cadastro-profissional" element={<CadastroProfissional />} />
        <Route path="/paciente/inscricao/:id" element={<DetalhesInscricao />} />

        {/* Paciente */}
        <Route
          path="/dashboard-paciente" element={<RequireAuth tipoPermitido="paciente"> <PacienteDashboard /> </RequireAuth>}
        />
        <Route
          path="/paciente/editar-dados"
          element={
            <RequireAuth tipoPermitido="paciente">
              <PacienteEditarDados />
            </RequireAuth>
          }
        />
        <Route
          path="/paciente/inscricao-atendimento"
          element={
            <RequireAuth tipoPermitido="paciente">
              <PacienteInscricaoAtendimento />
            </RequireAuth>
          }
        />

        <Route 
          path="/paciente/atendimento/:id" element={<RequireAuth tipoPermitido="paciente"> <DetalheAtendimento /> </RequireAuth>} 
        />

        {/* Profissional */}
        <Route
          path="/dashboard-profissional"
          element={
            <RequireAuth tipoPermitido="profissional">
              <ProfissionalDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/profissional/paciente-sorteado"
          element={
            <RequireAuth tipoPermitido="profissional">
              <PacienteSorteado />
            </RequireAuth>
          }
        />
        <Route
          path="/profissional/atendimento/:id"
          element={
            <RequireAuth tipoPermitido="profissional">
              <DetalheAtendimento />
            </RequireAuth>
          }
        />
        <Route
          path="/profissional/editar-dados"
          element={
            <RequireAuth tipoPermitido="profissional">
              <ProfissionalEditarDados />
            </RequireAuth>
          }
        />
        <Route
          path="/profissional/paciente/:id"
          element={
            <RequireAuth tipoPermitido="profissional">
              <PacienteDetalhes />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;