import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getToken, isExpired } from "../auth/session";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const token = getToken();

  if (!token || isExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}