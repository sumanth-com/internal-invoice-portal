"use client";

import {
  incomingLogoPath,
  LOGO_BUCKET,
  type LogoFormat,
} from "@/lib/company-logo";
import { createClient } from "@/lib/supabase/client";

export async function uploadIncomingLogo(
  file: File,
  format: LogoFormat,
  onProgress: (percent: number) => void,
) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error("Sign in again before uploading a logo.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apiKey) {
    throw new Error("Logo upload is not configured.");
  }

  const path = incomingLogoPath(format);
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file, path);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${url}/storage/v1/object/${LOGO_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => reject(new Error("The logo could not be uploaded."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = "The logo could not be uploaded.";
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        const detail = parsed.message || parsed.error || "";
        if (xhr.status === 401 || xhr.status === 403 || /row-level security|unauthorized/i.test(detail)) {
          message = "Only an admin can change the company logo.";
        } else if (/payload too large|entity too large|size/i.test(detail)) {
          message = "Logo must be 2 MB or smaller.";
        }
      } catch {
        if (xhr.status === 401 || xhr.status === 403) {
          message = "Only an admin can change the company logo.";
        }
      }
      reject(new Error(message));
    };
    xhr.send(body);
  });

  return path;
}
