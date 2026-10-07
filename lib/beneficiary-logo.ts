export const BENEFICIARY_LOGO_BUCKET = "beneficiary-logos";
export const BENEFICIARY_LOGO_MAX_BYTES = 4 * 1024 * 1024;

export type BeneficiaryLogoFormat =
  | "jpg"
  | "png"
  | "gif"
  | "webp"
  | "bmp"
  | "avif"
  | "tif"
  | "heic"
  | "heif"
  | "ico";

const CONTENT_TYPES: Record<BeneficiaryLogoFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
};

const LOGO_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp|bmp|avif|tif|heic|heif|ico)$/i;

export function beneficiaryLogoContentType(format: BeneficiaryLogoFormat) {
  return CONTENT_TYPES[format];
}

export function isOwnedBeneficiaryLogoPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && LOGO_PATH.test(path);
}

export function beneficiaryLogoPathFromForm(
  userId: string,
  formData: FormData,
  existingPath: string | null,
): { path: string | null } | { error: string } {
  const raw = formData.get("logo_path");
  const requested = typeof raw === "string" ? raw.trim() : "";
  if (requested) {
    if (!isOwnedBeneficiaryLogoPath(userId, requested)) {
      return { error: "The logo could not be saved." };
    }
    return { path: requested };
  }
  if (formData.get("remove_logo") === "1") return { path: null };
  return { path: existingPath };
}

export function inspectBeneficiaryLogo(
  bytes: Uint8Array,
): { format: BeneficiaryLogoFormat; contentType: string } | { error: string } {
  if (bytes.byteLength === 0) {
    return { error: "Choose an image for the logo." };
  }
  if (bytes.byteLength > BENEFICIARY_LOGO_MAX_BYTES) {
    return { error: "Logo must be 4 MB or smaller." };
  }
  const format = detectFormat(bytes);
  if (!format) {
    return { error: "Use an image file such as JPEG, PNG, WEBP, or GIF." };
  }
  return { format, contentType: CONTENT_TYPES[format] };
}

function detectFormat(bytes: Uint8Array): BeneficiaryLogoFormat | null {
  if (
    bytes.byteLength > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.byteLength > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.byteLength > 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
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
    return "webp";
  }
  if (bytes.byteLength > 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  if (
    bytes.byteLength > 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return "tif";
  }
  if (bytes.byteLength > 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "ico";
  }
  const brand = boxBrand(bytes);
  if (brand === "avif" || brand === "avis") return "avif";
  if (brand === "heif" || brand === "heis") return "heif";
  if (
    brand === "heic" ||
    brand === "heix" ||
    brand === "hevc" ||
    brand === "hevx" ||
    brand === "mif1" ||
    brand === "msf1"
  ) {
    return "heic";
  }
  return null;
}

function boxBrand(bytes: Uint8Array) {
  if (bytes.byteLength < 12) return "";
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return "";
  return String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
}

export async function signBeneficiaryLogoMap(
  supabase: { storage: { from: (bucket: string) => unknown } },
  paths: readonly (string | null | undefined)[],
) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const urls = new Map<string, string>();
  const bucket = supabase.storage.from(BENEFICIARY_LOGO_BUCKET) as {
    createSignedUrls: (
      paths: string[],
      expiresIn: number,
    ) => Promise<{ data: { path: string | null; signedUrl: string | null }[] | null }>;
  };
  for (let index = 0; index < unique.length; index += 100) {
    const signed = await bucket.createSignedUrls(unique.slice(index, index + 100), 60 * 60);
    for (const item of signed.data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}

export async function removeBeneficiaryLogo(
  supabase: { storage: { from: (bucket: string) => unknown } },
  path: string | null | undefined,
) {
  if (!path) return;
  const bucket = supabase.storage.from(BENEFICIARY_LOGO_BUCKET) as {
    remove: (paths: string[]) => Promise<unknown>;
  };
  await bucket.remove([path]);
}
