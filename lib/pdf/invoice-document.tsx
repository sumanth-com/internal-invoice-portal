import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatGstRate, gstStateCode } from "@/lib/gst";
import {
  formatInvoiceDate,
  formatMoney,
  invoiceUsesLegacyGst,
  statusLabel,
  type InvoiceDetail,
} from "@/lib/invoice";

export type InvoicePdfLogo = { data: Buffer; format: "png" | "jpg" };

export type InvoicePdfData = {
  invoice: InvoiceDetail;
  logo: InvoicePdfLogo | null;
  website: string | null;
};

const FONT_DIR = path.join(process.cwd(), "lib", "pdf", "fonts");

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "Inter_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Inter_500Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "Inter_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "Inter_700Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const PURPLE = "#5B2BD6";
const PURPLE_DEEP = "#3C1D9E";
const INK = "#1C1733";
const BODY = "#3F3A4D";
const MUTED = "#6B6578";
const LINE = "#E6E3EE";
const SOFT = "#F6F4FB";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: BODY,
    backgroundColor: WHITE,
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 32,
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: PURPLE,
  },
  watermark: {
    position: "absolute",
    top: 340,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 6,
    color: "#B42318",
    opacity: 0.14,
    transform: "rotate(-28deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
  },
  logo: {
    width: 46,
    height: 46,
    objectFit: "contain",
  },
  titleBlock: { alignItems: "flex-end", maxWidth: 250 },
  kicker: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.4,
    color: PURPLE,
  },
  invoiceNo: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: 700,
    color: PURPLE_DEEP,
    lineHeight: "20pt",
  },
  invoiceDate: { marginTop: 2, color: MUTED, fontSize: 9 },
  badgeRow: { marginTop: 6, flexDirection: "row", justifyContent: "flex-end" },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  badgePaid: { backgroundColor: "#E8F8F0", color: "#047857" },
  badgeCancelled: { backgroundColor: "#FDECEC", color: "#B42318" },
  badgeIssued: { backgroundColor: SOFT, color: PURPLE_DEEP },
  rule: {
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  parties: { flexDirection: "row", gap: 12, marginTop: 14 },
  party: {
    flex: 1,
    backgroundColor: SOFT,
    borderRadius: 6,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  partyTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.9,
    color: PURPLE,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 700,
    color: INK,
    lineHeight: "14pt",
  },
  trade: { marginTop: 1, color: BODY, fontWeight: 500 },
  field: { flexDirection: "row", marginTop: 4 },
  fieldLabel: { width: 62, color: MUTED, fontSize: 8 },
  fieldValue: { flex: 1, color: INK, fontSize: 8.5, lineHeight: "12pt" },
  info: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
  },
  infoCell: {
    width: "33.33%",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  infoLabel: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.4,
    color: PURPLE,
    textTransform: "uppercase",
  },
  infoValue: { marginTop: 2, color: INK, fontWeight: 600, fontSize: 9 },
  table: { marginTop: 14 },
  thead: {
    flexDirection: "row",
    backgroundColor: PURPLE,
    color: WHITE,
    fontSize: 8,
    fontWeight: 600,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: WHITE,
  },
  rowAlt: { backgroundColor: "#FBFAFE" },
  colIndex: { width: 24 },
  colDescription: { flex: 1, paddingRight: 8, lineHeight: "12pt" },
  colHsn: { width: 58 },
  colQty: { width: 42, textAlign: "right" },
  colRate: { width: 78, textAlign: "right" },
  colAmount: { width: 86, textAlign: "right" },
  strong: { color: INK, fontWeight: 600 },
  empty: { paddingVertical: 12, paddingHorizontal: 8, color: MUTED },
  lower: { flexDirection: "row", gap: 16, marginTop: 14 },
  lowerLeft: { flex: 1 },
  panel: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: PURPLE,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  words: { color: INK, fontWeight: 500, lineHeight: "13pt" },
  bankRow: { flexDirection: "row", paddingVertical: 1.5 },
  bankLabel: { width: 88, color: MUTED, fontSize: 8 },
  bankValue: { flex: 1, color: INK, fontSize: 8.5 },
  totals: { width: 214 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  totalLabel: { color: MUTED },
  totalValue: { color: INK, fontWeight: 600 },
  totalDivider: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  balance: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PURPLE,
    color: WHITE,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  balanceLabel: { fontSize: 8, fontWeight: 600, letterSpacing: 0.4 },
  balanceValue: { fontSize: 12, fontWeight: 700 },
  notes: {
    marginTop: 4,
    backgroundColor: SOFT,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  noteText: { color: BODY, lineHeight: "12.5pt" },
  footerRule: {
    position: "absolute",
    bottom: 30,
    left: 32,
    right: 32,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  footerLeft: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 120,
    fontSize: 7.5,
    color: MUTED,
  },
  footerRight: {
    position: "absolute",
    bottom: 16,
    right: 32,
    width: 90,
    fontSize: 7.5,
    color: MUTED,
    textAlign: "right",
  },
});

function snapshotLines(text: string | null) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function takePrefixed(rows: string[], prefix: string) {
  const index = rows.findIndex((row) => row.toUpperCase().startsWith(prefix));
  if (index < 0) return null;
  const value = rows[index].slice(prefix.length).trim();
  rows.splice(index, 1);
  return value || null;
}

type PartyBlock = {
  name: string;
  trade: string | null;
  address: string | null;
  state: string | null;
  stateCode: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  contact: string | null;
};

function parseLocality(line: string) {
  const match = line.match(/^(.*?),\s*([A-Za-z][A-Za-z .'-]*?)(?:\s+(\d{5,6}))?\s*$/);
  if (!match) return null;
  const city = match[1].trim();
  const state = match[2].trim();
  if (!city || !state || /\d/.test(state)) return null;
  return { city, state, pin: match[3] ?? "" };
}

function partyBlock(text: string | null, stateCode: string | null): PartyBlock {
  const rows = snapshotLines(text);
  const gstin = takePrefixed(rows, "GSTIN:");
  const pan = takePrefixed(rows, "PAN:");
  const cin = takePrefixed(rows, "CIN:");
  const emailIndex = rows.findIndex((row) => row.includes("@"));
  const email = emailIndex >= 0 ? rows.splice(emailIndex, 1)[0] : null;
  const phoneIndex = rows.findIndex((row) => /^[+\d][\d\s().-]{6,}$/.test(row));
  const phone = phoneIndex >= 0 ? rows.splice(phoneIndex, 1)[0] : null;
  const name = rows.shift() ?? "";
  let trade: string | null = null;
  if (rows[0] && !rows[0].includes(",") && !/\d/.test(rows[0]) && rows.length > 1) {
    trade = rows.shift() ?? null;
  }
  let country: string | null = null;
  const countryIndex = rows.findLastIndex((row) => !row.includes(",") && !/\d/.test(row));
  if (countryIndex >= 0) country = rows.splice(countryIndex, 1)[0];

  const localities = rows
    .map((row, index) => ({ index, locality: parseLocality(row) }))
    .filter((entry): entry is { index: number; locality: NonNullable<ReturnType<typeof parseLocality>> } =>
      Boolean(entry.locality),
    );
  const chosen = localities.findLast((entry) => entry.locality.pin) ?? localities.at(-1) ?? null;
  let state: string | null = null;
  let localityLine: string | null = null;
  if (chosen) {
    rows.splice(chosen.index, 1);
    state = chosen.locality.state;
    localityLine = [chosen.locality.city, chosen.locality.pin].filter(Boolean).join(" ");
  }

  const address = [...rows, localityLine, country].filter((value): value is string => Boolean(value)).join("\n");
  const code = stateCode ?? gstStateCode(gstin) ?? gstStateCode(state);
  const contact = [email, phone].filter(Boolean).join("\n");
  return {
    name,
    trade,
    address: address || null,
    state,
    stateCode: code,
    gstin,
    pan,
    cin,
    contact: contact || null,
  };
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  );
}

function PartyCard({ title, party }: { title: string; party: PartyBlock }) {
  return (
    <View style={s.party}>
      <Text style={s.partyTitle}>{title}</Text>
      <Text style={s.partyName}>{party.name || "—"}</Text>
      {party.trade ? <Text style={s.trade}>{party.trade}</Text> : null}
      <Field label="Address" value={party.address} />
      <Field label="State" value={party.state} />
      <Field label="State code" value={party.stateCode} />
      <Field label="GSTIN" value={party.gstin} />
      <Field label="PAN" value={party.pan} />
      <Field label="CIN" value={party.cin} />
      <Field label="Contact" value={party.contact} />
    </View>
  );
}

function InfoCell({ label, value, index }: { label: string; value: string; index: number }) {
  const edge = {
    borderRightWidth: index % 3 === 2 ? 0 : 1,
    borderBottomWidth: index >= 3 ? 0 : 1,
  };
  return (
    <View style={[s.infoCell, edge]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function TableHead() {
  return (
    <View style={s.thead} fixed>
      <Text style={s.colIndex}>#</Text>
      <Text style={s.colDescription}>Description</Text>
      <Text style={s.colHsn}>SAC / HSN</Text>
      <Text style={s.colQty}>Qty</Text>
      <Text style={s.colRate}>Rate</Text>
      <Text style={s.colAmount}>Taxable amount</Text>
    </View>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={s.totalValue}>{value}</Text>
    </View>
  );
}

function BankRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={s.bankRow}>
      <Text style={s.bankLabel}>{label}</Text>
      <Text style={s.bankValue}>{value}</Text>
    </View>
  );
}

function taxLines(invoice: InvoiceDetail) {
  if (invoiceUsesLegacyGst(invoice)) {
    return [{ label: `GST @ ${formatGstRate(invoice.gstRate)}%`, amount: invoice.gstAmount }];
  }
  if (invoice.igstAmount > 0) {
    return [{ label: `IGST @ ${formatGstRate(invoice.gstRate)}%`, amount: invoice.igstAmount }];
  }
  const half = formatGstRate(invoice.gstEnabled ? invoice.gstRate / 2 : 0);
  const rows: { label: string; amount: number }[] = [];
  if (invoice.cgstAmount > 0) rows.push({ label: `CGST @ ${half}%`, amount: invoice.cgstAmount });
  if (invoice.sgstAmount > 0) rows.push({ label: `SGST @ ${half}%`, amount: invoice.sgstAmount });
  return rows;
}

function badgeStyle(status: InvoiceDetail["status"]) {
  if (status === "paid") return s.badgePaid;
  if (status === "cancelled") return s.badgeCancelled;
  return s.badgeIssued;
}

function InvoiceDocument({ invoice, logo, website }: InvoicePdfData) {
  const from = partyBlock(invoice.billFrom, null);
  const to = partyBlock(invoice.billTo, invoice.stateCode);
  const money = (value: number) => formatMoney(value, invoice.currency);
  const taxes = taxLines(invoice);
  const contact = [from.contact?.split("\n")[0], website].filter(Boolean).join("  ·  ");

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={from.name || "iFranchise"}
      subject={`Invoice ${invoice.invoiceNumber} for ${to.name || invoice.beneficiaryName}`}
      creator="iFranchise"
      producer="iFranchise"
      language="en-IN"
    >
      <Page size="A4" style={s.page}>
        <View style={s.bar} fixed />
        {invoice.status === "cancelled" ? (
          <Text style={s.watermark} fixed>
            CANCELLED
          </Text>
        ) : null}
        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>
          {`iFranchise${contact ? `  ·  ${contact}` : ""}`}
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />

        <View style={s.header}>
          {logo ? <Image src={logo} style={s.logo} /> : null}
          <View style={s.titleBlock}>
            <Text style={s.kicker}>{invoice.gstEnabled ? "TAX INVOICE" : "INVOICE"}</Text>
            <Text style={s.invoiceNo}>{invoice.invoiceNumber}</Text>
            <Text style={s.invoiceDate}>{formatInvoiceDate(invoice.invoiceDate)}</Text>
            <View style={s.badgeRow}>
              <Text style={[s.badge, badgeStyle(invoice.status)]}>{statusLabel(invoice.status).toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.parties}>
          <PartyCard title="BILL FROM" party={from} />
          <PartyCard title="BILL TO" party={to} />
        </View>

        <View style={s.info}>
          {[
            ["Invoice number", invoice.invoiceNumber],
            ["Invoice date", formatInvoiceDate(invoice.invoiceDate)],
            ["Due date", invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : "—"],
            ["Place of supply", invoice.placeOfSupply || "—"],
            ["Deal / brand", invoice.dealReference || "—"],
            ["Payment status", statusLabel(invoice.status)],
          ].map(([label, value], index) => (
            <InfoCell key={label} label={label} value={value} index={index} />
          ))}
        </View>

        <View style={s.table}>
          <TableHead />
          {invoice.items.length === 0 ? (
            <Text style={s.empty}>No line items.</Text>
          ) : (
            invoice.items.map((item, index) => (
              <View key={item.id} style={index % 2 === 1 ? [s.row, s.rowAlt] : s.row} wrap={false}>
                <Text style={s.colIndex}>{index + 1}</Text>
                <Text style={[s.colDescription, s.strong]}>{item.description}</Text>
                <Text style={s.colHsn}>{item.hsn || "—"}</Text>
                <Text style={s.colQty}>{formatQuantity(item.quantity)}</Text>
                <Text style={s.colRate}>{money(item.rate)}</Text>
                <Text style={[s.colAmount, s.strong]}>{money(item.lineSubtotal)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={s.lower} wrap={false}>
          <View style={s.lowerLeft}>
            <View style={s.panel}>
              <Text style={s.panelTitle}>Amount in words</Text>
              <Text style={s.words}>{invoice.amountInWords}</Text>
            </View>
            {invoice.bank ? (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Payment details</Text>
                <BankRow label="Bank name" value={invoice.bank.bankName} />
                <BankRow label="Account name" value={invoice.bank.accountHolderName} />
                <BankRow label="Account number" value={invoice.bank.accountNumber} />
                <BankRow label="IFSC" value={invoice.bank.ifscCode} />
                <BankRow label="Branch" value={invoice.bank.branch} />
              </View>
            ) : null}
          </View>
          <View style={s.totals}>
            <TotalRow label="Subtotal" value={money(invoice.subtotal)} />
            {taxes.map((tax) => (
              <TotalRow key={tax.label} label={tax.label} value={money(tax.amount)} />
            ))}
            <View style={s.totalDivider} />
            <TotalRow label="Invoice total" value={money(invoice.total)} />
            {invoice.tdsAmount > 0 ? <TotalRow label="TDS" value={money(invoice.tdsAmount)} /> : null}
            <View style={s.balance}>
              <Text style={s.balanceLabel}>BALANCE DUE</Text>
              <Text style={s.balanceValue}>{money(invoice.balanceDue)}</Text>
            </View>
          </View>
        </View>

        {invoice.paymentTerms || invoice.notes ? (
          <View style={s.notes} wrap={false}>
            {invoice.paymentTerms ? (
              <>
                <Text style={s.panelTitle}>Payment terms</Text>
                <Text style={s.noteText}>{invoice.paymentTerms}</Text>
              </>
            ) : null}
            {invoice.notes ? (
              <>
                <Text style={invoice.paymentTerms ? [s.panelTitle, { marginTop: 6 }] : s.panelTitle}>Notes</Text>
                <Text style={s.noteText}>{invoice.notes}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(data: InvoicePdfData) {
  return renderToBuffer(<InvoiceDocument {...data} />);
}
