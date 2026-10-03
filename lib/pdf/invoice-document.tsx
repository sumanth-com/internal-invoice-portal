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
import { formatGstRate } from "@/lib/gst";
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

const INK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const RULE = "#e2e8f0";
const TINT = "#f8fafc";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: BODY,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },
  text: { lineHeight: "13pt" },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: INK,
  },
  watermark: {
    position: "absolute",
    top: 360,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 96,
    fontWeight: 700,
    color: "#dc2626",
    opacity: 0.08,
    transform: "rotate(-30deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  brand: { flex: 1, maxWidth: 300 },
  logo: {
    height: 44,
    maxWidth: 180,
    alignSelf: "flex-start",
    objectFit: "contain",
    marginBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: INK,
    lineHeight: "19pt",
  },
  companyMeta: { marginTop: 4, color: MUTED, lineHeight: "13pt" },
  titleBlock: { alignItems: "flex-end", minWidth: 190 },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
    letterSpacing: 1.5,
    lineHeight: "24pt",
  },
  statusRow: { marginTop: 6, flexDirection: "row", justifyContent: "flex-end" },
  status: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderWidth: 1,
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1,
  },
  metaTable: { marginTop: 10, width: 190 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  metaLabel: { color: MUTED },
  metaValue: { color: INK, fontWeight: 600, textAlign: "right" },
  parties: { flexDirection: "row", gap: 16, marginTop: 18 },
  party: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
  },
  label: {
    fontSize: 7.5,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  partyName: { fontSize: 10.5, fontWeight: 600, color: INK, marginBottom: 2 },
  table: { marginTop: 20 },
  thead: {
    flexDirection: "row",
    backgroundColor: INK,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 600,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  rowAlt: { backgroundColor: TINT },
  colIndex: { width: 22 },
  colDescription: { flex: 1, paddingRight: 10, lineHeight: "12.5pt" },
  colHsn: { width: 62 },
  colQty: { width: 48, textAlign: "right" },
  colRate: { width: 82, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  cellStrong: { color: INK },
  empty: { paddingVertical: 14, paddingHorizontal: 8, color: MUTED },
  summary: { flexDirection: "row", gap: 24, marginTop: 16 },
  summaryLeft: { flex: 1, gap: 12 },
  box: { padding: 10, borderWidth: 1, borderColor: RULE, borderRadius: 4 },
  words: { color: INK, fontWeight: 500, lineHeight: "13pt" },
  bankRow: { flexDirection: "row", paddingVertical: 1.5 },
  bankLabel: { width: 78, color: MUTED },
  bankValue: { flex: 1, color: INK },
  totals: { width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: INK,
    color: "#ffffff",
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 700,
  },
  section: { marginTop: 16 },
  thanks: { color: MUTED, fontSize: 8, lineHeight: "12pt" },
  signature: { marginTop: "auto", paddingTop: 24, alignItems: "center" },
  signatureFor: { color: INK, fontWeight: 600, textAlign: "center" },
  signatureLine: {
    marginTop: 30,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: BODY,
    paddingTop: 4,
    textAlign: "center",
    color: MUTED,
  },
  footerRule: {
    position: "absolute",
    bottom: 38,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: RULE,
  },
  footerLeft: {
    position: "absolute",
    bottom: 24,
    left: 40,
    fontSize: 7.5,
    color: MUTED,
  },
  footerRight: {
    position: "absolute",
    bottom: 24,
    right: 40,
    width: 120,
    fontSize: 7.5,
    color: MUTED,
    textAlign: "right",
  },
});

function lines(text: string | null) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function taxIdFrom(snapshot: string[], label: "GSTIN" | "PAN") {
  const prefix = `${label}:`;
  const match = snapshot.find((value) =>
    value.toUpperCase().startsWith(prefix),
  );
  return match ? match.slice(prefix.length).trim() : null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(
    value,
  );
}

function Party({ label, snapshot }: { label: string; snapshot: string[] }) {
  const [name, ...rest] = snapshot;
  return (
    <View style={s.party}>
      <Text style={s.label}>{label}</Text>
      {name ? <Text style={s.partyName}>{name}</Text> : <Text>—</Text>}
      {rest.map((value, index) => (
        <Text key={index} style={s.text}>
          {value}
        </Text>
      ))}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
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

function InvoiceDocument({ invoice, logo, website }: InvoicePdfData) {
  const billFrom = lines(invoice.billFrom);
  const billTo = lines(invoice.billTo);
  const companyName = billFrom[0] ?? "Invoice";
  const gstin = taxIdFrom(billFrom, "GSTIN");
  const pan = taxIdFrom(billFrom, "PAN");
  const money = (value: number) => formatMoney(value, invoice.currency);
  const statusTone =
    invoice.status === "cancelled"
      ? { color: "#b91c1c", borderColor: "#fca5a5" }
      : { color: "#047857", borderColor: "#6ee7b7" };

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={companyName}
      subject={`Invoice ${invoice.invoiceNumber} for ${billTo[0] ?? invoice.beneficiaryName}`}
      creator="Internal Invoice Portal"
      producer="Internal Invoice Portal"
      language="en-IN"
    >
      <Page size="A4" style={s.page}>
        <View style={s.accent} fixed />
        {invoice.status === "cancelled" ? (
          <Text style={s.watermark} fixed>
            CANCELLED
          </Text>
        ) : null}
        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>
          {companyName} · Invoice {invoice.invoiceNumber}
        </Text>

        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.companyName}>{companyName}</Text>
            {gstin || pan ? (
              <Text style={s.companyMeta}>
                {[gstin ? `GSTIN ${gstin}` : null, pan ? `PAN ${pan}` : null]
                  .filter(Boolean)
                  .join("   ·   ")}
              </Text>
            ) : null}
            {website ? <Text style={s.companyMeta}>{website}</Text> : null}
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>
              {invoice.gstEnabled ? "TAX INVOICE" : "INVOICE"}
            </Text>
            {invoice.status === "paid" || invoice.status === "cancelled" ? (
              <View style={s.statusRow}>
                <Text style={[s.status, statusTone]}>
                  {statusLabel(invoice.status).toUpperCase()}
                </Text>
              </View>
            ) : null}
            <View style={s.metaTable}>
              <MetaRow label="Invoice no." value={invoice.invoiceNumber} />
              <MetaRow
                label="Invoice date"
                value={formatInvoiceDate(invoice.invoiceDate)}
              />
              {invoice.dueDate ? (
                <MetaRow
                  label="Due date"
                  value={formatInvoiceDate(invoice.dueDate)}
                />
              ) : null}
              <MetaRow label="Currency" value={invoice.currency} />
              {invoice.placeOfSupply ? (
                <MetaRow label="Place of supply" value={invoice.placeOfSupply} />
              ) : null}
              {invoice.supplyState ? <MetaRow label="State" value={invoice.supplyState} /> : null}
              {invoice.stateCode ? <MetaRow label="State code" value={invoice.stateCode} /> : null}
              {invoice.clientGstin ? <MetaRow label="Client GSTIN" value={invoice.clientGstin} /> : null}
              {invoice.dealReference ? (
                <MetaRow label="Deal / brand" value={invoice.dealReference} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={s.parties}>
          <Party label="Bill from" snapshot={billFrom} />
          <Party label="Bill to" snapshot={billTo} />
        </View>

        <View style={s.table}>
          <View style={s.thead} fixed>
            <Text style={s.colIndex}>#</Text>
            <Text style={s.colDescription}>Description</Text>
            <Text style={s.colHsn}>SAC</Text>
            <Text style={s.colQty}>Qty</Text>
            <Text style={s.colRate}>Rate</Text>
            <Text style={s.colAmount}>Taxable</Text>
          </View>
          {invoice.items.length === 0 ? (
            <Text style={s.empty}>No line items.</Text>
          ) : (
            invoice.items.map((item, index) => (
              <View
                key={item.id}
                style={index % 2 === 1 ? [s.row, s.rowAlt] : s.row}
                wrap={false}
              >
                <Text style={s.colIndex}>{index + 1}</Text>
                <Text style={[s.colDescription, s.cellStrong]}>
                  {item.description}
                </Text>
                <Text style={s.colHsn}>{item.hsn || "—"}</Text>
                <Text style={s.colQty}>{formatQuantity(item.quantity)}</Text>
                <Text style={s.colRate}>{money(item.rate)}</Text>
                <Text style={[s.colAmount, s.cellStrong]}>
                  {money(item.lineSubtotal)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={s.summary} wrap={false}>
          <View style={s.summaryLeft}>
            <View style={s.box}>
              <Text style={s.label}>Amount in words</Text>
              <Text style={s.words}>{invoice.amountInWords}</Text>
            </View>
            {invoice.bank || invoice.paymentTerms ? (
              <View style={s.box}>
                <Text style={s.label}>Payment details</Text>
                <BankRow label="Terms" value={invoice.paymentTerms} />
                {invoice.bank ? (
                  <>
                    <BankRow
                      label="Account name"
                      value={invoice.bank.accountHolderName}
                    />
                    <BankRow label="Bank" value={invoice.bank.bankName} />
                    <BankRow
                      label="Account no."
                      value={invoice.bank.accountNumber}
                    />
                    <BankRow label="IFSC" value={invoice.bank.ifscCode} />
                    <BankRow label="Branch" value={invoice.bank.branch} />
                  </>
                ) : null}
              </View>
            ) : null}
            <Text style={s.thanks}>
              Thank you for your business. This is a computer-generated invoice.
            </Text>
          </View>
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.metaLabel}>Subtotal</Text>
              <Text style={s.cellStrong}>{money(invoice.subtotal)}</Text>
            </View>
            {invoiceUsesLegacyGst(invoice) ? (
              <View style={s.totalRow}>
                <Text style={s.metaLabel}>GST</Text>
                <Text style={s.cellStrong}>{money(invoice.gstAmount)}</Text>
              </View>
            ) : invoice.igstAmount > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.metaLabel}>{`IGST @ ${formatGstRate(invoice.gstRate)}%`}</Text>
                <Text style={s.cellStrong}>{money(invoice.igstAmount)}</Text>
              </View>
            ) : (
              <>
                <View style={s.totalRow}>
                  <Text style={s.metaLabel}>
                    {`CGST @ ${formatGstRate(invoice.gstEnabled ? invoice.gstRate / 2 : 0)}%`}
                  </Text>
                  <Text style={s.cellStrong}>{money(invoice.cgstAmount)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.metaLabel}>
                    {`SGST @ ${formatGstRate(invoice.gstEnabled ? invoice.gstRate / 2 : 0)}%`}
                  </Text>
                  <Text style={s.cellStrong}>{money(invoice.sgstAmount)}</Text>
                </View>
              </>
            )}
            <View style={s.totalRow}>
              <Text style={s.metaLabel}>Invoice total</Text>
              <Text style={s.cellStrong}>{money(invoice.total)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.metaLabel}>TDS</Text>
              <Text style={s.cellStrong}>{money(invoice.tdsAmount)}</Text>
            </View>
            <View style={s.grandTotal}>
              <Text>Balance due</Text>
              <Text>{money(invoice.balanceDue)}</Text>
            </View>
            <View style={s.signature}>
              <Text style={s.signatureFor}>For {companyName}</Text>
              <Text style={s.signatureLine}>Authorised signatory</Text>
            </View>
          </View>
        </View>

        {invoice.notes ? (
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <Text style={s.text}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(data: InvoicePdfData) {
  return renderToBuffer(<InvoiceDocument {...data} />);
}
