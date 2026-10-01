import type { AppRole } from "@/lib/portal";

export const PROFILE_COLUMNS =
  "id, email, full_name, role, is_active, created_at, updated_at";

export type UserRoleFilter = AppRole | "all";
export type UserAccountStatus = "pending" | "active" | "inactive";
export type UserStatusFilter = "all" | UserAccountStatus;

export type PortalUserAccess = {
  invitationPending?: boolean;
  emailConfirmed?: boolean;
};

export type PortalUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  status: UserAccountStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type PortalUserList = {
  users: PortalUserRow[];
  total: number;
  active: number;
  inactive: number;
  search: string;
  role: UserRoleFilter;
  status: UserStatusFilter;
};

export type PortalUserField = "full_name" | "email" | "role" | "is_active";

export type PortalUserFormState = {
  error: string | null;
  fieldErrors: Partial<Record<PortalUserField, string>>;
  saved?: PortalUserRow;
};

export type PortalUserMutationState = {
  error: string | null;
  saved?: PortalUserRow;
  deletedId?: string;
};

export const emptyPortalUserFormState: PortalUserFormState = {
  error: null,
  fieldErrors: {},
};

export const emptyPortalUserMutationState: PortalUserMutationState = {
  error: null,
};

const RECORD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export function isPortalUserId(value: string) {
  return RECORD_ID_PATTERN.test(value);
}

export function isAppRole(value: string): value is AppRole {
  return value === "admin" || value === "internal_user";
}

export function normalizeUserSearch(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function normalizeUserRoleFilter(value: string | undefined): UserRoleFilter {
  if (value === "admin" || value === "internal_user") return value;
  return "all";
}

export function normalizeUserStatusFilter(value: string | undefined): UserStatusFilter {
  if (value === "pending" || value === "active" || value === "inactive") return value;
  return "all";
}

export function accountStatus(
  isActive: boolean,
  access?: PortalUserAccess,
): UserAccountStatus {
  if (!isActive) return "inactive";
  if (access?.invitationPending === true || access?.emailConfirmed === false) return "pending";
  return "active";
}

export function mapPortalUser(row: ProfileRow, access?: PortalUserAccess): PortalUserRow {
  const isActive = row.is_active;
  return {
    id: row.id,
    email: row.email?.trim() || "—",
    fullName: row.full_name?.trim() || null,
    role: row.role === "admin" ? "admin" : "internal_user",
    isActive,
    status: accountStatus(isActive, access),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function userMatchesFilters(
  user: PortalUserRow,
  filters: Pick<PortalUserList, "search" | "role" | "status">,
) {
  if (filters.role !== "all" && user.role !== filters.role) return false;
  if (filters.status !== "all" && user.status !== filters.status) return false;
  if (filters.search) {
    const query = filters.search.toLowerCase();
    const name = user.fullName?.toLowerCase() ?? "";
    const email = user.email.toLowerCase();
    if (!name.includes(query) && !email.includes(query)) return false;
  }
  return true;
}

function fieldText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseInviteForm(
  formData: FormData,
): { ok: true; fullName: string; email: string; role: AppRole } | {
  ok: false;
  fieldErrors: PortalUserFormState["fieldErrors"];
} {
  const errors: PortalUserFormState["fieldErrors"] = {};
  const fullName = fieldText(formData, "full_name");
  const email = fieldText(formData, "email").toLowerCase();
  const roleValue = fieldText(formData, "role") || "internal_user";

  if (!fullName) errors.full_name = "Enter the user's name.";
  else if (fullName.length > 120) errors.full_name = "Name must be 120 characters or fewer.";

  if (!email) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    errors.email = "Enter a valid email address.";
  }

  if (!isAppRole(roleValue)) errors.role = "Choose Administrator or Team Member.";

  if (Object.keys(errors).length > 0 || !isAppRole(roleValue)) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, fullName, email, role: roleValue };
}

export function parseUserEditForm(
  formData: FormData,
): { ok: true; fullName: string; role: AppRole; isActive: boolean } | {
  ok: false;
  fieldErrors: PortalUserFormState["fieldErrors"];
} {
  const errors: PortalUserFormState["fieldErrors"] = {};
  const fullName = fieldText(formData, "full_name");
  const role = fieldText(formData, "role");
  const isActive = fieldText(formData, "is_active") === "true";

  if (!fullName) errors.full_name = "Enter the user's name.";
  else if (fullName.length > 120) errors.full_name = "Name must be 120 characters or fewer.";
  if (!isAppRole(role)) errors.role = "Choose Administrator or Team Member.";

  if (Object.keys(errors).length > 0 || !isAppRole(role)) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, fullName, role, isActive };
}

export function removesOwnAccess(
  actorId: string,
  targetId: string,
  role: AppRole,
  isActive: boolean,
) {
  return actorId === targetId && (role !== "admin" || !isActive);
}
