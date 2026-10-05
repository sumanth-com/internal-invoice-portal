"use client";

import { saveProfile } from "@/app/(portal)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVATAR_MAX_BYTES, emptyProfileSaveState, inspectAvatar } from "@/lib/profile-avatar";
import { userInitials } from "@/lib/portal";
import { useActionToast } from "@/components/portal/toasts";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";

const accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function ProfileForm({
  email,
  fullName,
  roleLabel,
  avatarUrl,
}: {
  email: string;
  fullName: string;
  roleLabel: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { notify } = usePortalModals();
  const [state, formAction, pending] = useActionState(saveProfile, emptyProfileSaveState);
  useActionToast(state, state.error, "error");
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const handledSave = useRef<number | null>(null);
  const previewRef = useRef<string | null>(null);

  const [name, setName] = useState(fullName);
  const [baselineName, setBaselineName] = useState(fullName);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(avatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const shownAvatar = previewUrl ?? (removed ? null : savedAvatarUrl);
  const dirty =
    name.trim() !== baselineName.trim() || file !== null || (removed && Boolean(savedAvatarUrl));

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!state.savedAt || handledSave.current === state.savedAt) return;
    handledSave.current = state.savedAt;
    notify("Profile saved.");
    const nextName = state.fullName?.trim() || "";
    setName(nextName);
    setBaselineName(nextName);
    setSavedAvatarUrl(state.avatarUrl);
    setFile(null);
    setRemoved(false);
    setClientError(null);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    startTransition(() => router.refresh());
  }, [notify, router, state.avatarUrl, state.fullName, state.savedAt]);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  async function onFile(next: File | null) {
    setClientError(null);
    if (!next) return;
    if (next.size > AVATAR_MAX_BYTES) {
      setClientError("Image must be 5 MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const type = next.type.toLowerCase();
    const extensionOk = /\.(jpe?g|png|webp)$/i.test(next.name);
    if (
      type !== "image/jpeg" &&
      type !== "image/jpg" &&
      type !== "image/png" &&
      type !== "image/webp" &&
      !extensionOk
    ) {
      setClientError("Use a JPG, PNG, or WEBP image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    clearPreview();
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
    setFile(next);
    setRemoved(false);
    setChecking(true);
    const inspected = inspectAvatar(new Uint8Array(await next.arrayBuffer()));
    setChecking(false);
    if ("error" in inspected) {
      clearPreview();
      setFile(null);
      setClientError(inspected.error);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage() {
    clearPreview();
    setFile(null);
    setRemoved(true);
    setClientError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function cancel() {
    if (pending) return;
    setName(baselineName);
    setRemoved(false);
    setFile(null);
    setClientError(null);
    clearPreview();
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || checking) return;
    const formData = new FormData();
    formData.set("fullName", name);
    formData.set("removeAvatar", removed && !file ? "1" : "0");
    if (file) formData.set("avatar", file);
    startTransition(() => formAction(formData));
  }

  const avatarError = clientError ?? state.avatarError;
  const initials = userInitials({ fullName: name || baselineName, email });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account details.</p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border bg-primary text-lg font-medium text-primary-foreground">
          {shownAvatar ? (
            <span
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${JSON.stringify(shownAvatar)})` }}
            />
          ) : (
            initials
          )}
          {pending || checking ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
              <Loader2 className="size-5 animate-spin" />
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {shownAvatar ? "Change photo" : "Upload photo"}
          </Button>
          {shownAvatar ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={removeImage}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          JPG, PNG, or WEBP. 5 MB maximum.
        </p>
        {avatarError ? <p className="mt-2 text-center text-sm text-destructive">{avatarError}</p> : null}
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            name="fullName"
            value={name}
            maxLength={80}
            autoComplete="name"
            disabled={pending}
            className="mt-1.5"
            onChange={(event) => setName(event.target.value)}
          />
          {state.nameError ? <p className="mt-1.5 text-sm text-destructive">{state.nameError}</p> : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <Label>Email</Label>
            <span className="text-xs text-muted-foreground">Read-only</span>
          </div>
          <p className="mt-1.5 rounded-md border bg-muted/50 px-3 py-2 text-sm break-all">{email}</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <Label>Role</Label>
            <span className="text-xs text-muted-foreground">Read-only</span>
          </div>
          <p className="mt-1.5 rounded-md border bg-muted/50 px-3 py-2 text-sm">{roleLabel}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" disabled={pending || !dirty} onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || checking || !dirty}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
