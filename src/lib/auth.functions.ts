import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
});

export const resolveUsernameEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error("Lookup failed");
    if (!row?.email) throw new Error("Username non trovato");
    return { email: row.email };
  });
