"use client";

import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

function fileNameFrom(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function InvoicePdfActions({
  id,
  number,
}: {
  id: string;
  number: string;
}) {
  const { notify } = usePortalModals();
  const [downloading, setDownloading] = useState(false);
  const href = `/invoices/${id}/pdf`;

  async function download() {
    setDownloading(true);
    try {
      const response = await fetch(`${href}?download=1`, { cache: "no-store" });
      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "The PDF could not be downloaded.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFrom(
        response.headers.get("Content-Disposition"),
        `Invoice-${number}.pdf`,
      );
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "The PDF could not be downloaded.",
        "error",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <Button asChild variant="outline">
        <a href={href} target="_blank" rel="noopener">
          <FileText />
          Preview PDF
        </a>
      </Button>
      <Button
        type="button"
        onClick={() => void download()}
        disabled={downloading}
      >
        {downloading ? <Loader2 className="animate-spin" /> : <Download />}
        {downloading ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
