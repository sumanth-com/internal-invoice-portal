import { MarketingShell } from "@/components/marketing/marketing-shell";
import { COMPANY_LEGAL_NAME, CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/marketing";

export function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-semibold text-[#5B2BD6]">{COMPANY_LEGAL_NAME}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm text-slate-500">Updated {POLICY_UPDATED}</p>
        <p className="mt-6 text-base leading-7 text-slate-600">{intro}</p>
        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-slate-950">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm leading-7 text-slate-600">
          Questions about this page can be sent to{" "}
          <a className="font-medium text-[#5B2BD6] underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </article>
    </MarketingShell>
  );
}
