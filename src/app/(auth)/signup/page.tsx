import { SignupForm } from "@/features/auth/components/signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta | Caves",
  description: "Registrate en Caves y descubre eventos cerca de ti.",
};

export default function SignupPage() {
  return <SignupForm />;
}
