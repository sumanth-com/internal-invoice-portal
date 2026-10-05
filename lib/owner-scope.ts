import { getPortalUser } from "@/lib/portal-user";

export async function activeOwnerId() {
  const user = await getPortalUser();
  if (!user?.isActive) return null;
  return user.id;
}
