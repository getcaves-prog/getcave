import { createClient } from "@/shared/lib/supabase/client";
import type {
  LoginCredentials,
  SignupCredentials,
} from "@/features/auth/types/auth.types";

export async function signIn(credentials: LoginCredentials) {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function signUp(credentials: SignupCredentials) {
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        username: credentials.username,
        terms_version: "1.0",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
