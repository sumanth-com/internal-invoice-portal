export const LOGO_BUCKET = "company-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type LogoFormat = "png" | "jpg";

const STORED_PATH: Record<LogoFormat, string> = {
  png: "logo.png",
  jpg: "logo.jpg",
};

const INCOMING_PATH: Record<LogoFormat, string> = {
  png: "incoming.png",
  jpg: "incoming.jpg",
};

export function incomingLogoPath(format: LogoFormat) {
  return INCOMING_PATH[format];
}

export function storedLogoPath(format: LogoFormat) {
  return STORED_PATH[format];
}

export function logoContentType(format: LogoFormat) {
  return format === "png" ? "image/png" : "image/jpeg";
}

export function inspectLogo(bytes: Uint8Array): { format: LogoFormat } | { error: string } {
  if (bytes.byteLength === 0) {
    return { error: "Choose a PNG or JPEG logo." };
  }
  if (bytes.byteLength > LOGO_MAX_BYTES) {
    return { error: "Logo must be 2 MB or smaller." };
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
  return { error: "Logo must be a PNG or JPEG image." };
}

export function isIncomingLogoPath(value: string): value is "incoming.png" | "incoming.jpg" {
  return value === "incoming.png" || value === "incoming.jpg";
}
