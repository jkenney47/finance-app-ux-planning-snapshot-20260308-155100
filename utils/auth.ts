import { supabase } from "./supabaseClient";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

/**
 * Signs in a user with email and password.
 * @returns { error: string | null, data: Session | null }
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null; data: Session | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error: error?.message ?? null, data: data?.session ?? null };
}

/**
 * Signs up a user with email and password.
 * @returns { error: string | null, data: User | null }
 */
export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null; data: User | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null, data: data?.user ?? null };
}

/**
 * Signs out the current user.
 * @returns { error: string | null }
 */
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

/**
 * Gets the current session (client-side only).
 * @returns { error: string | null, data: Session | null }
 */
export async function getSession(): Promise<{
  error: string | null;
  data: Session | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  return { error: error?.message ?? null, data: data?.session ?? null };
}

/**
 * Gets the current user (client-side only).
 * @returns { error: string | null, data: User | null }
 */
export async function getUser(): Promise<{
  error: string | null;
  data: User | null;
}> {
  const { data, error } = await supabase.auth.getUser();
  return { error: error?.message ?? null, data: data?.user ?? null };
}

/**
 * Subscribes to auth state changes. Returns an unsubscribe function.
 */
export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } =>
  supabase.auth.onAuthStateChange(callback).data.subscription;
