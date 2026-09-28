import { PlaceholderPage } from "@/components/portal/placeholder-page";
import { getPortalUser } from "@/lib/portal-user";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Admin Management",
};

async function AdminContent() {
  const user = await getPortalUser();

  if (!user?.isActive || user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <PlaceholderPage
      title="Admin Management"
      description="User and role management will appear here."
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
    >
      <AdminContent />
    </Suspense>
  );
}
