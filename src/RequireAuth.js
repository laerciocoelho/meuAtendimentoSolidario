import React from "react";
import { Navigate } from "react-router-dom";

const RequireAuth = ({ children, tipoPermitido }) => {
  const token = localStorage.getItem("access_token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!token || !user) return <Navigate to="/login" replace />;
  if (tipoPermitido && user.tipo !== tipoPermitido) return <Navigate to="/login" replace />;
  return children;
};

export default RequireAuth;
