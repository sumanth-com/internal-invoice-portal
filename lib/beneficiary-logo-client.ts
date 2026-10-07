"use client";

import {
  BENEFICIARY_LOGO_BUCKET,
  inspectBeneficiaryLogo,
  type BeneficiaryLogoFormat,
} from "@/lib/beneficiary-logo";
import { createClient } from "@/lib/supabase/client";

const EXTENSIONS: Record<BeneficiaryLogoFormat, string> = {
  jpg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
  bmp: "bmp",
  avif: "avif",
  tif: "tif",
  heic: "heic",
  heif: "heif",
  ico: "ico",
};

export async function uploadBeneficiaryLogo(file: File) {
  const inspected = inspectBeneficiaryLogo(new Uint8Array(await file.arrayBuffer()));
  if ("error" in inspected) throw new Error(inspected.error);

  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sign in again before uploading a logo.");
  }

  const path = `${data.user.id}/${crypto.randomUUID()}.${EXTENSIONS[inspected.format]}`;
  const uploaded = await supabase.storage.from(BENEFICIARY_LOGO_BUCKET).upload(path, file, {
    contentType: inspected.contentType,
    upsert: false,
  });
  if (uploaded.error) {
    const detail = uploaded.error.message ?? "";
    if (/payload|entity too large|size|exceeded/i.test(detail)) {
      throw new Error("Logo must be 4 MB or smaller.");
    }
    throw new Error("The logo could not be uploaded.");
  }
  return path;
}
