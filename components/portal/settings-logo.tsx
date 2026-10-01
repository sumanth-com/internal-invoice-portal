"use client";

import { removeCompanyLogo, saveCompanyLogo } from "@/app/(portal)/settings/actions";
import { SettingsNotice, SettingsSection } from "@/components/portal/settings-fields";
import { Button } from "@/components/ui/button";
import { inspectLogo } from "@/lib/company-logo";
import { uploadIncomingLogo } from "@/lib/company-logo-client";
import { emptyLogoState } from "@/lib/settings";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

export function CompanyLogoSection({
  exists,
  canEdit,
  initialPreviewUrl,
}: {
  exists: boolean;
  canEdit: boolean;
  initialPreviewUrl: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saveState, saveAction, savePending] = useActionState(saveCompanyLogo, emptyLogoState);
  const [removeState, removeAction, removePending] = useActionState(removeCompanyLogo, emptyLogoState);
  const handledSave = useRef<typeof saveState | null>(null);
  const handledRemove = useRef<typeof removeState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null || savePending || removePending;

  useEffect(() => {
    if (handledSave.current === saveState) return;
    if (saveState.error) {
      handledSave.current = saveState;
      setProgress(null);
      return;
    }
    if (!saveState.saved) return;
    handledSave.current = saveState;
    setPreviewUrl(saveState.saved.logoPreviewUrl);
    setProgress(null);
    setUploadError(null);
  }, [saveState]);

  useEffect(() => {
    if (!removeState.saved || handledRemove.current === removeState) return;
    handledRemove.current = removeState;
    setPreviewUrl(null);
    setConfirmRemove(false);
  }, [removeState]);

  async function onFile(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectLogo(bytes);
    if ("error" in inspected) {
      setUploadError(inspected.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setProgress(0);
    try {
      const path = await uploadIncomingLogo(file, inspected.format, setProgress);
      const formData = new FormData();
      formData.set("path", path);
      startTransition(() => saveAction(formData));
    } catch (error) {
      setProgress(null);
      setUploadError(error instanceof Error ? error.message : "The logo could not be uploaded.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const error = uploadError || saveState.error || removeState.error;

  return (
    <SettingsSection
      title="Company logo"
      description="Stored in the private company logo bucket. Active members can view it. Invoice PDFs use the current logo."
    >
      <div className="grid gap-4">
        {error ? <SettingsNotice tone="error">{error}</SettingsNotice> : null}
        {saveState.saved && !saveState.error ? (
          <SettingsNotice tone="success">Logo saved.</SettingsNotice>
        ) : null}
        {removeState.saved && !removeState.error ? (
          <SettingsNotice tone="success">Logo removed.</SettingsNotice>
        ) : null}
        {previewUrl ? (
          // Signed logo URLs are unique per save, so a plain img is enough.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Company logo"
            className="max-h-24 max-w-full rounded-md border bg-white object-contain p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No logo uploaded.</p>
        )}
        {canEdit ? (
          exists ? (
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                {previewUrl ? "Replace logo" : "Upload logo"}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy}
                  className="block w-full text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void onFile(file);
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG or JPEG, up to 2 MB.</p>
              {progress !== null ? (
                <div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label={progress < 100 ? "Uploading logo" : "Checking logo"}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {savePending || progress >= 100 ? "Checking the logo…" : `Uploading ${progress}%`}
                  </p>
                </div>
              ) : null}
              {previewUrl ? (
                confirmRemove ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (removePending) return;
                      startTransition(() => removeAction(new FormData()));
                    }}
                    className="rounded-lg border border-destructive/30 p-3"
                  >
                    <p className="text-sm font-medium">Remove the company logo?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      It will no longer appear on invoice PDFs.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="submit" variant="destructive" disabled={busy}>
                        {removePending ? <Loader2 className="animate-spin" /> : null}
                        {removePending ? "Removing…" : "Remove logo"}
                      </Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmRemove(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmRemove(true)} className="w-full sm:w-auto">
                    Remove logo
                  </Button>
                )
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Save company details before uploading a logo.</p>
          )
        ) : null}
      </div>
    </SettingsSection>
  );
}
