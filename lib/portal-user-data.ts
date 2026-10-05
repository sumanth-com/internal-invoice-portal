import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  mapPortalUser,
  normalizeUserRoleFilter,
  normalizeUserSearch,
  normalizeUserStatusFilter,
  PROFILE_COLUMNS,
  userMatchesFilters,
  type PortalUserAccess,
  type PortalUserList,
  type ProfileRow,
} from "@/lib/portal-users";

export async function loadPortalUsers(filters: {
  q?: string;
  role?: string;
  status?: string;
}): Promise<PortalUserList> {
  const search = normalizeUserSearch(filters.q);
  const role = normalizeUserRoleFilter(filters.role);
  const status = normalizeUserStatusFilter(filters.status);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  const access = await loadInvitationAccess();
  const users = ((data ?? []) as ProfileRow[]).map((row) => mapPortalUser(row, access.get(row.id)));
  const view = { search, role, status };

  return {
    users: users.filter((user) => userMatchesFilters(user, view)),
    total: users.length,
    active: users.filter((user) => user.status === "active").length,
    pending: users.filter((user) => user.status === "pending").length,
    inactive: users.filter((user) => user.status === "inactive").length,
    ...view,
  };
}

export async function invitationAccessFor(userId: string): Promise<PortalUserAccess | undefined> {
  const admin = createAdminClient();
  if (!admin) return undefined;
  const found = await admin.auth.admin.getUserById(userId);
  if (found.error || !found.data.user) return undefined;
  const metadata = found.data.user.app_metadata as { invitation_pending?: unknown } | undefined;
  return {
    invitationPending: metadata?.invitation_pending === true,
    emailConfirmed: Boolean(found.data.user.email_confirmed_at),
  };
}

async function loadInvitationAccess() {
  const access = new Map<string, PortalUserAccess>();
  const admin = createAdminClient();
  if (!admin) return access;

  for (let page = 1; page <= 20; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error || !listed.data?.users?.length) break;
    for (const user of listed.data.users) {
      const metadata = user.app_metadata as { invitation_pending?: unknown } | undefined;
      access.set(user.id, {
        invitationPending: metadata?.invitation_pending === true,
        emailConfirmed: Boolean(user.email_confirmed_at),
      });
    }
    if (listed.data.users.length < 200) break;
  }

  return access;
}
