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
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.85fr)]">
        <CompanySettingsSection
          company={profile}
          canEdit={canEdit}
          onSaved={(details) => setProfile((current) => ({ ...current, ...details, exists: true }))}
        />
        <CompanyLogoSection />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <BankAccountsSection banks={banks} canEdit={canEdit} />
        <GstDefaultsSection
          defaults={{
            defaultGstEnabled: profile.defaultGstEnabled,
            defaultGstRate: profile.defaultGstRate,
            gstin: profile.gstin,
            pan: profile.pan,
          }}
          currency={profile.defaultCurrency}
          country={profile.country}
          exists={profile.exists}
          canEdit={canEdit}
          onSaved={(defaults) => setProfile((current) => ({ ...current, ...defaults }))}
          onCurrencySaved={(defaultCurrency) => setProfile((current) => ({ ...current, defaultCurrency }))}
        />
      </div>
      <InvoiceNumberingSection sequences={sequences} />
    </div>
  );
}
