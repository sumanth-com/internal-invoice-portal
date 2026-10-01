import { SettingsView } from "@/components/portal/settings-view";
import { PageHeader, SettingsSkeleton } from "@/components/portal/skeletons";
import { getPortalUser } from "@/lib/portal-user";
import { loadPortalSettings } from "@/lib/settings-data";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Settings",
};

async function SettingsContent() {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") redirect("/dashboard");

  try {
    const settings = await loadPortalSettings();
    return (
      <SettingsView
        company={settings.company}
        banks={settings.banks}
        sequences={settings.sequences}
        canEdit={user.role === "admin"}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settings could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

async function SettingsPageContent() {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Company details, logo, GST defaults, bank accounts, and invoice numbering."
      />
      <SettingsContent />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}
