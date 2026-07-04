import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;           // = auth.user.id (UUID)
  email: string;
  role: "student" | "teacher";
  name: string;
  last: string;
  grade: string;        // e.g. "3°A"
  hair_color: string;
  hair_style: string;
  skin_tone: string;
  shirt_color: string;
  pet: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  subject: string | null;   // teacher only
  group_name: string | null; // teacher only
  created_at?: string;
}

// ─── Profile helpers ──────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("getProfile:", error.message); return null; }
  return data as Profile;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  const { error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" });
  if (error) console.error("upsertProfile:", error.message);
}

export async function updateXP(userId: string, xp: number, coins: number, level: number) {
  await supabase
    .from("profiles")
    .update({ xp, coins, level })
    .eq("id", userId);
}
