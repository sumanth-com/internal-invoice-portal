import { ProfileForm } from "@/components/portal/profile-form";
import { roleLabel } from "@/lib/portal";
import { getPortalUser } from "@/lib/portal-user";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Profile",
};

function ProfileFallback() {
  return (
    <div className="flex justify-center py-4 sm:py-8">
      <div className="h-[32rem] w-full max-w-md animate-pulse rounded-xl border bg-card" />
    </div>
  );
}

async function ProfileDetails() {
  const user = await getPortalUser();
  if (!user?.isActive) redirect("/auth/login");

  return (
    <div className="flex justify-center py-4 sm:py-8">
      <ProfileForm
        email={user.email}
        fullName={user.fullName?.trim() ?? ""}
        roleLabel={roleLabel(user.role)}
        avatarUrl={user.avatarUrl}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileDetails />
    </Suspense>
  );
}
