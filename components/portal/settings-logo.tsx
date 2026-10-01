"use client";

import { PortalLogo } from "@/components/brand-logo";
import { SettingsSection } from "@/components/portal/settings-fields";

export function CompanyLogoSection() {
  return (
    <SettingsSection
      title="Company logo"
      description="The iFranchise logo used across the portal."
    >
      <div className="flex flex-1 items-center justify-center py-4">
        <PortalLogo size={120} />
      </div>
    </SettingsSection>
  );
}
