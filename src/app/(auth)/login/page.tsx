import { LoginForm } from "@/features/auth/components/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesion | Caves",
  description: "Inicia sesion en Caves y descubre eventos cerca de ti.",
};

export default function LoginPage() {
  return <LoginForm />;
}
