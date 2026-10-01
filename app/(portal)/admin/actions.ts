"use server";

import { sendInviteEmail } from "@/lib/email/send-invite-email";
import { getPortalUser } from "@/lib/portal-user";
import { invitationAccessFor } from "@/lib/portal-user-data";
import {
  emptyPortalUserFormState,
  emptyPortalUserMutationState,
  isPortalUserId,
  mapPortalUser,
  parseInviteForm,
  parseUserEditForm,
  PROFILE_COLUMNS,
  removesOwnAccess,
  type PortalUserFormState,
  type PortalUserMutationState,
  type ProfileRow,
} from "@/lib/portal-users";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function requireAdmin() {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") return null;
  return user;
}

async function requestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function inviteError(message: string) {
  if (/already (been )?registered|already exists|duplicate/i.test(message)) {
    return "A user with this email already exists.";
  }
  if (/invalid.*email|unable to validate email/i.test(message)) {
    return "Enter a valid email address.";
  }
  return "The user could not be invited.";
}

async function invitationLink(email: string, fullName: string) {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false as const, error: "User invites are not configured on the server." };
  }

  const origin = await requestOrigin();
  const linked = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${origin}/auth/confirm`,
    },
  });
  const token = linked.data?.properties?.hashed_token;
  const userId = linked.data?.user?.id;
  if (linked.error || !userId || !token) {
    return { ok: false as const, error: inviteError(linked.error?.message ?? "") };
  }

  const flagged = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { invitation_pending: true },
  });
  if (flagged.error) {
    return { ok: false as const, error: "The invitation could not be prepared." };
  }

  return {
    ok: true as const,
    userId,
    acceptUrl: `${origin}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=invite`,
  };
}

async function activeAdminCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exceptId: string,
) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", exceptId);
  if (error) return { error: error.message, count: 0 };
  return { error: null, count: count ?? 0 };
}

export async function invitePortalUser(
  _state: PortalUserFormState,
  formData: FormData,
): Promise<PortalUserFormState> {
  const actor = await requireAdmin();
  if (!actor) {
    return { ...emptyPortalUserFormState, error: "Only an admin can add a user." };
  }

  const parsed = parseInviteForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const invited = await invitationLink(parsed.email, parsed.fullName);
  if (!invited.ok) {
    return { ...emptyPortalUserFormState, error: invited.error };
  }

  const supabase = await createClient();
  const profile = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", invited.userId)
    .maybeSingle();
  if (profile.error) {
    return {
      ...emptyPortalUserFormState,
      error: "The invitation was sent, but the profile could not be loaded.",
    };
  }
  if (!profile.data) {
    return {
      ...emptyPortalUserFormState,
      error: "The invitation was sent, but the profile was not created.",
    };
  }

  let row = profile.data as ProfileRow;
  const patch: { full_name?: string; role?: typeof parsed.role } = {};
  if ((row.full_name?.trim() || "") !== parsed.fullName) {
    patch.full_name = parsed.fullName;
  }
  if (row.role !== parsed.role) patch.role = parsed.role;
  if (Object.keys(patch).length > 0) {
    const updated = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", row.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (updated.error || !updated.data) {
      return {
        ...emptyPortalUserFormState,
        error:
          parsed.role === "admin"
            ? "The account was created, but Administrator access could not be assigned."
            : "The account was created, but the profile could not be updated.",
      };
    }
    row = updated.data as ProfileRow;
  }

  const emailed = await sendInviteEmail({
    to: parsed.email,
    recipientName: parsed.fullName,
    role: parsed.role,
    acceptUrl: invited.acceptUrl,
  });
  if (!emailed.ok) {
    return {
      ...emptyPortalUserFormState,
      error: "The account was created, but the invitation email could not be sent.",
    };
  }

  revalidatePath("/admin");
  return {
    error: null,
    fieldErrors: {},
    saved: mapPortalUser(row, { invitationPending: true, emailConfirmed: false }),
  };
}

export async function resendPortalInvite(
  _state: PortalUserMutationState,
  formData: FormData,
): Promise<PortalUserMutationState> {
  const actor = await requireAdmin();
  if (!actor) {
    return { ...emptyPortalUserMutationState, error: "Only an admin can resend an invitation." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isPortalUserId(id)) {
    return { ...emptyPortalUserMutationState, error: "This user was not found." };
  }

  const access = await invitationAccessFor(id);
  if (!access || (access.emailConfirmed && !access.invitationPending)) {
    return {
      ...emptyPortalUserMutationState,
      error: "This user has already activated their account.",
    };
  }

  const supabase = await createClient();
  const profile = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (profile.error || !profile.data) {
    return { ...emptyPortalUserMutationState, error: "This user was not found." };
  }

  const row = profile.data as ProfileRow;
  const email = row.email?.trim().toLowerCase() ?? "";
  const fullName = row.full_name?.trim() || email;
  if (!email) {
    return { ...emptyPortalUserMutationState, error: "This user does not have an email address." };
  }

  const invited = await invitationLink(email, fullName);
  if (!invited.ok) {
    return {
      ...emptyPortalUserMutationState,
      error:
        invited.error === "A user with this email already exists."
          ? "This user has already activated their account."
          : invited.error,
    };
  }

  const emailed = await sendInviteEmail({
    to: email,
    recipientName: fullName,
    role: row.role === "admin" ? "admin" : "internal_user",
    acceptUrl: invited.acceptUrl,
  });
  if (!emailed.ok) {
    return { ...emptyPortalUserMutationState, error: emailed.error };
  }

  revalidatePath("/admin");
  return {
    error: null,
    saved: mapPortalUser(row, { invitationPending: true, emailConfirmed: false }),
  };
}

export async function updatePortalUser(
  _state: PortalUserFormState,
  formData: FormData,
): Promise<PortalUserFormState> {
  const actor = await requireAdmin();
  if (!actor) {
    return { ...emptyPortalUserFormState, error: "Only an admin can edit a user." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isPortalUserId(id)) {
    return { ...emptyPortalUserFormState, error: "This user was not found." };
  }

  const parsed = parseUserEditForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  if (removesOwnAccess(actor.id, id, parsed.role, parsed.isActive)) {
    return {
      ...emptyPortalUserFormState,
      error: "You cannot remove your own admin access.",
    };
  }

  const supabase = await createClient();
  if (parsed.role !== "admin" || !parsed.isActive) {
    const remaining = await activeAdminCount(supabase, id);
    if (remaining.error) {
      return { ...emptyPortalUserFormState, error: "The user could not be saved." };
    }
    if (remaining.count === 0) {
      return {
        ...emptyPortalUserFormState,
        error: "This would leave the portal with no active admin.",
      };
    }
  }

  const updated = await supabase
    .from("profiles")
    .update({
      full_name: parsed.fullName,
      role: parsed.role,
      is_active: parsed.isActive,
    })
    .eq("id", id)
    .select(PROFILE_COLUMNS);

  if (updated.error || !updated.data?.[0]) {
    const message = updated.error?.message ?? "";
    return {
      ...emptyPortalUserFormState,
      error: /only an admin can change/i.test(message)
        ? "Only an admin can change role or status."
        : "The user could not be saved.",
    };
  }

  revalidatePath("/admin");
  return {
    error: null,
    fieldErrors: {},
    saved: mapPortalUser(updated.data[0] as ProfileRow, await invitationAccessFor(id)),
  };
}

export async function setPortalUserActive(
  _state: PortalUserMutationState,
  formData: FormData,
): Promise<PortalUserMutationState> {
  const actor = await requireAdmin();
  if (!actor) {
    return { ...emptyPortalUserMutationState, error: "Only an admin can change a user's status." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isPortalUserId(id)) {
    return { ...emptyPortalUserMutationState, error: "This user was not found." };
  }

  const isActive = formData.get("is_active") === "true";
  if (!isActive && id === actor.id) {
    return {
      ...emptyPortalUserMutationState,
      error: "You cannot deactivate your own account.",
    };
  }

  const supabase = await createClient();
  if (!isActive) {
    const existing = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (existing.error || !existing.data) {
      return { ...emptyPortalUserMutationState, error: "This user was not found." };
    }
    if (existing.data.role === "admin") {
      const remaining = await activeAdminCount(supabase, id);
      if (remaining.error) {
        return { ...emptyPortalUserMutationState, error: "The user could not be updated." };
      }
      if (remaining.count === 0) {
        return {
          ...emptyPortalUserMutationState,
          error: "This would leave the portal with no active admin.",
        };
      }
    }
  }

  const updated = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(PROFILE_COLUMNS);

  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyPortalUserMutationState,
      error: updated.error?.message?.match(/only an admin/i)
        ? "Only an admin can change a user's status."
        : "The user could not be updated.",
    };
  }

  revalidatePath("/admin");
  return {
    error: null,
    saved: mapPortalUser(updated.data[0] as ProfileRow, await invitationAccessFor(id)),
  };
}

export async function deletePortalUser(
  _state: PortalUserMutationState,
  formData: FormData,
): Promise<PortalUserMutationState> {
  const actor = await requireAdmin();
  if (!actor) {
    return { ...emptyPortalUserMutationState, error: "Only an admin can delete a pending invitation." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isPortalUserId(id)) {
    return { ...emptyPortalUserMutationState, error: "This user was not found." };
  }
  if (id === actor.id) {
    return { ...emptyPortalUserMutationState, error: "You cannot delete your own account." };
  }

  const access = await invitationAccessFor(id);
  if (!access || access.emailConfirmed) {
    return {
      ...emptyPortalUserMutationState,
      error: "Only a pending invitation can be deleted.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ...emptyPortalUserMutationState,
      error: "User invites are not configured on the server.",
    };
  }

  const removed = await admin.auth.admin.deleteUser(id);
  if (removed.error) {
    return { ...emptyPortalUserMutationState, error: "The invitation could not be deleted." };
  }

  revalidatePath("/admin");
  return { error: null, deletedId: id };
}
