export type AppRole = "admin" | "internal_user";

export type PortalUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  avatarUrl: string | null;
};

export function roleLabel(role: AppRole) {
  return role === "admin" ? "Administrator" : "Team Member";
}

export function displayName(user: Pick<PortalUser, "fullName" | "email">) {
  const name = user.fullName?.trim();
  return name || user.email;
}

export function userInitials(user: Pick<PortalUser, "fullName" | "email">) {
  const source = displayName(user);
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "U";
}
