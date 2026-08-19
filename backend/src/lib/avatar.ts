import { supabaseAdmin } from "./supabaseAdmin";

const AVATAR_BUCKET = "avatars";

export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
