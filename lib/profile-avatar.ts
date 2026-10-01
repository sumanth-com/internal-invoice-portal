export const AVATAR_BUCKET = "profile-avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AvatarFormat = "jpg" | "png" | "webp";

const EXTENSIONS: Record<AvatarFormat, string> = {
  jpg: "jpg",
  png: "png",
  webp: "webp",
};

export function avatarContentType(format: AvatarFormat) {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

export function avatarObjectPath(userId: string, format: AvatarFormat) {
  return `${userId}/avatar.${EXTENSIONS[format]}`;
}

export function avatarObjectPaths(userId: string) {
  return (Object.keys(EXTENSIONS) as AvatarFormat[]).map((format) =>
    avatarObjectPath(userId, format),
  );
}

export function inspectAvatar(bytes: Uint8Array): { format: AvatarFormat } | { error: string } {
  if (bytes.byteLength === 0) {
    return { error: "Choose a JPG, PNG, or WEBP image." };
  }
  if (bytes.byteLength > AVATAR_MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller." };
  }
  if (
    bytes.byteLength > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { format: "png" };
  }
  if (bytes.byteLength > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { format: "jpg" };
  }
  if (
    bytes.byteLength > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { format: "webp" };
  }
  return { error: "Use a JPG, PNG, or WEBP image." };
}

export type ProfileSaveState = {
  error: string | null;
  nameError: string | null;
  avatarError: string | null;
  savedAt: number | null;
  fullName: string | null;
  avatarUrl: string | null;
};

export const emptyProfileSaveState: ProfileSaveState = {
  error: null,
  nameError: null,
  avatarError: null,
  savedAt: null,
  fullName: null,
  avatarUrl: null,
};

export function parseProfileName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Enter your name." };
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    return { ok: false, error: "Enter your name." };
  }
  if (name.length > 80) {
    return { ok: false, error: "Name must be 80 characters or fewer." };
  }
  if (/[\u0000-\u001F]/.test(name)) {
    return { ok: false, error: "Name contains invalid characters." };
  }
  return { ok: true, name };
}
