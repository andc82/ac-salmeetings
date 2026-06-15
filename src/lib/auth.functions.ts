import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(1).max(256),
});

/**
 * Resolves the email for a username server-side and signs the user in.
 * Returns only session tokens — the email never leaves the server.
 * On any failure (unknown username or wrong password) returns the same
 * generic error to avoid username enumeration.
 */
export const loginWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const genericError = new Error("Credenziali non valide");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: lookupErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("username", data.username)
      .maybeSingle();
    if (lookupErr || !row?.email) throw genericError;

    const { createClient } = await import("@supabase/supabase-js");
    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email: row.email,
      password: data.password,
    });
    if (signInErr || !signIn.session) throw genericError;

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
