"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  LoginCredentials,
  SignupCredentials,
} from "@/features/auth/types/auth.types";

export async function signIn(credentials: LoginCredentials) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signUp(credentials: SignupCredentials) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username: credentials.username,
    });

    if (profileError) {
      return { error: profileError.message };
    }
  }

  return { error: null, requiresConfirmation: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
