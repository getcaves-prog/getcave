import type { User } from "@supabase/supabase-js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  username: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export type { User };
