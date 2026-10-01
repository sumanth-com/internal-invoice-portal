"use client";

import { BankAccountsSection } from "@/components/portal/settings-banks";
import { CompanySettingsSection } from "@/components/portal/settings-company";
import { GstDefaultsSection } from "@/components/portal/settings-gst";
import { CompanyLogoSection } from "@/components/portal/settings-logo";
import { InvoiceNumberingSection } from "@/components/portal/settings-numbering";
import type { CompanyProfile, InvoiceSequenceRow, SettingsBankAccount } from "@/lib/settings";
import { useState } from "react";

export function SettingsView({
  company,
  banks,
  sequences,
  canEdit,
}: {
  company: CompanyProfile;
  banks: SettingsBankAccount[];
  sequences: InvoiceSequenceRow[];
  canEdit: boolean;
}) {
  const [profile, setProfile] = useState(company);

  return (
    <div className="flex flex-col gap-6">
      {canEdit ? null : (
        <p className="text-sm text-muted-foreground">
          You can view these settings. Only an admin can change them.
        </p>
      )}
      <CompanySettingsSection
        company={profile}
        canEdit={canEdit}
        onSaved={(details) => setProfile((current) => ({ ...current, ...details, exists: true }))}
      />
      <CompanyLogoSection
        exists={profile.exists}
        canEdit={canEdit}
        initialPreviewUrl={profile.logoPreviewUrl}
      />
      <GstDefaultsSection
        defaults={{
          defaultGstEnabled: profile.defaultGstEnabled,
          defaultGstRate: profile.defaultGstRate,
        }}
        exists={profile.exists}
        canEdit={canEdit}
        onSaved={(defaults) => setProfile((current) => ({ ...current, ...defaults }))}
      />
      <BankAccountsSection banks={banks} canEdit={canEdit} />
      <InvoiceNumberingSection sequences={sequences} canEdit={canEdit} />
    </div>
  );
}
