"use server";

import { revalidatePath } from "next/cache";

import {
  AVATAR_BUCKET,
  avatarContentType,
  avatarObjectPath,
  avatarObjectPaths,
  emptyProfileSaveState,
  inspectAvatar,
  parseProfileName,
  type ProfileSaveState,
} from "@/lib/profile-avatar";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";

async function signedAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;
  const signed = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? null;
}

export async function saveProfile(
  _state: ProfileSaveState,
  formData: FormData,
): Promise<ProfileSaveState> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return { ...emptyProfileSaveState, error: "Sign in to update your profile." };
  }

  const parsed = parseProfileName(formData.get("fullName"));
  if (!parsed.ok) {
    return {
      ...emptyProfileSaveState,
      nameError: parsed.error,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    };
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return { ...emptyProfileSaveState, error: "Your profile could not be saved." };
  }

  const fileValue = formData.get("avatar");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const remove = formData.get("removeAvatar") === "1" && !file;
  const previousPath = existing.data.avatar_path as string | null;
  let avatarPath = previousPath;

  if (file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectAvatar(bytes);
    if ("error" in inspected) {
      return {
        ...emptyProfileSaveState,
        avatarError: inspected.error,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      };
    }

    avatarPath = avatarObjectPath(user.id, inspected.format);
    const uploaded = await supabase.storage.from(AVATAR_BUCKET).upload(
      avatarPath,
      new Blob([Uint8Array.from(bytes)], { type: avatarContentType(inspected.format) }),
      {
        upsert: true,
        contentType: avatarContentType(inspected.format),
        cacheControl: "3600",
      },
    );
    if (uploaded.error) {
      return {
        ...emptyProfileSaveState,
        avatarError: "The profile image could not be saved.",
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      };
    }
  } else if (remove) {
    avatarPath = null;
  }

  const updated = await supabase
    .from("profiles")
    .update({ full_name: parsed.name, avatar_path: avatarPath })
    .eq("id", user.id)
    .select("full_name, avatar_path");
  if (updated.error || !updated.data?.[0]) {
    if (file && avatarPath && avatarPath !== previousPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
    }
    return { ...emptyProfileSaveState, error: "Your profile could not be saved." };
  }

  const stale = avatarObjectPaths(user.id).filter((path) => path !== avatarPath);
  if (stale.length > 0) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  }

  revalidatePath("/profile");

  return {
    error: null,
    nameError: null,
    avatarError: null,
    savedAt: Date.now(),
    fullName: updated.data[0].full_name,
    avatarUrl: await signedAvatarUrl(supabase, updated.data[0].avatar_path),
  };
}
