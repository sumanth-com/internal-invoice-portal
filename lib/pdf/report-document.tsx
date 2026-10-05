import "server-only";

import path from "node:path";
import { readFile } from "node:fs/promises";
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
import { formatInvoiceDate, roundMoney, statusLabel } from "@/lib/invoice";
import {
  REPORT_TYPE_LABELS,
  reportBeneficiaryRows,
  type ReportInvoice,
  type ReportType,
  type ReportView,
} from "@/lib/reports";

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
const MUTED = "#64748b";
const RULE = "#e2e8f0";
const TINT = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 8,
    color: INK,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  accent: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: INK },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 29, height: 28, objectFit: "contain" },
  title: { fontSize: 16, fontWeight: 700 },
  meta: { marginTop: 2, color: MUTED },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  figure: { width: "23%", borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 8, backgroundColor: TINT },
  figureLabel: { color: MUTED, marginBottom: 3 },
  figureValue: { fontSize: 11, fontWeight: 600 },
  tableHead: { flexDirection: "row", backgroundColor: TINT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: RULE },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: RULE },
  cell: { paddingVertical: 4, paddingHorizontal: 4 },
  headText: { fontWeight: 600, color: MUTED },
  right: { textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    color: MUTED,
    fontSize: 8,
  },
});

const columns = [
  { label: "Invoice", width: "16%" },
  { label: "Date", width: "12%" },
  { label: "Beneficiary", width: "22%" },
  { label: "Status", width: "12%" },
  { label: "Subtotal", width: "12%", right: true },
  { label: "GST", width: "10%", right: true },
  { label: "Total", width: "12%", right: true },
  { label: "Outstanding", width: "14%", right: true },
];

function money(amount: number, currency: string) {
  return `${currency} ${roundMoney(amount).toFixed(2)}`;
}

function sum(invoices: ReportInvoice[], pick: (invoice: ReportInvoice) => number) {
  return roundMoney(invoices.reduce((total, invoice) => total + pick(invoice), 0));
}

function ReportDocument({
  type,
  view,
  invoices,
  query,
  beneficiary,
  generatedAt,
  logo,
}: {
  type: ReportType;
  view: ReportView;
  invoices: ReportInvoice[];
  query: string;
  beneficiary: string;
  generatedAt: string;
  logo: Buffer | null;
}) {
  const ordered = [...invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.number < right.number ? -1 : 1;
  });
  const figures = [
    { label: "Invoices", value: String(invoices.length) },
    { label: "Invoice value", value: money(sum(invoices, (invoice) => invoice.total), view.currency) },
    { label: "CGST", value: money(sum(invoices, (invoice) => invoice.cgstAmount), view.currency) },
    { label: "SGST", value: money(sum(invoices, (invoice) => invoice.sgstAmount), view.currency) },
    { label: "IGST", value: money(sum(invoices, (invoice) => invoice.igstAmount), view.currency) },
    { label: "Total GST", value: money(sum(invoices, (invoice) => invoice.gstAmount), view.currency) },
    { label: "TDS", value: money(sum(invoices, (invoice) => invoice.tdsAmount), view.currency) },
    { label: "Balance due", value: money(sum(invoices, (invoice) => invoice.balanceDue), view.currency) },
    { label: "Amount paid", value: money(sum(invoices, (invoice) => invoice.amountPaid), view.currency) },
    { label: "Outstanding", value: money(sum(invoices, (invoice) => invoice.outstanding), view.currency) },
  ];

  return (
    <Document title={`${REPORT_TYPE_LABELS[type]} ${view.from} to ${view.to}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} fixed />
        <View style={styles.header}>
          <View style={styles.brand}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
              <Image src={{ data: logo, format: "png" }} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.title}>iFranchise report</Text>
              <Text style={styles.meta}>{REPORT_TYPE_LABELS[type]}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.meta}>From {formatInvoiceDate(view.from)}</Text>
            <Text style={styles.meta}>To {formatInvoiceDate(view.to)}</Text>
            <Text style={styles.meta}>Generated {generatedAt}</Text>
            {query ? <Text style={styles.meta}>Search: {query}</Text> : null}
            {beneficiary ? <Text style={styles.meta}>Beneficiary: {beneficiary}</Text> : null}
          </View>
        </View>
        <View style={styles.summary}>
          {figures.map((figure) => (
            <View key={figure.label} style={styles.figure}>
              <Text style={styles.figureLabel}>{figure.label}</Text>
              <Text style={styles.figureValue}>{figure.value}</Text>
            </View>
          ))}
        </View>
        {type === "beneficiaries" ? (
          <BeneficiaryTable invoices={invoices} />
        ) : (
          <>
            <View style={styles.tableHead} fixed>
              {columns.map((column) => (
                <Text
                  key={column.label}
                  style={[styles.cell, styles.headText, { width: column.width }, column.right ? styles.right : {}]}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {ordered.length === 0 ? (
              <Text style={{ marginTop: 12, color: MUTED }}>No rows match this report.</Text>
            ) : (
              ordered.map((invoice) => (
                <View key={invoice.id} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, { width: "16%" }]}>{invoice.number}</Text>
                  <Text style={[styles.cell, { width: "12%" }]}>{formatInvoiceDate(invoice.date)}</Text>
                  <Text style={[styles.cell, { width: "22%" }]}>{invoice.beneficiaryName}</Text>
                  <Text style={[styles.cell, { width: "12%" }]}>{statusLabel(invoice.status)}</Text>
                  <Text style={[styles.cell, styles.right, { width: "12%" }]}>{roundMoney(invoice.subtotal).toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.right, { width: "10%" }]}>{roundMoney(invoice.gstAmount).toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.right, { width: "12%" }]}>{roundMoney(invoice.total).toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.right, { width: "14%" }]}>{roundMoney(invoice.outstanding).toFixed(2)}</Text>
                </View>
              ))
            )}
          </>
        )}
        <View style={styles.footer} fixed>
          <Text>iFranchise internal invoice portal</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function BeneficiaryTable({ invoices }: { invoices: ReportInvoice[] }) {
  const rows = reportBeneficiaryRows(invoices);
  const head = [
    { label: "Beneficiary", width: "56%" },
    { label: "Invoices", width: "18%", right: true },
    { label: "Value", width: "26%", right: true },
  ];
  return (
    <>
      <View style={styles.tableHead} fixed>
        {head.map((column) => (
          <Text
            key={column.label}
            style={[styles.cell, styles.headText, { width: column.width }, column.right ? styles.right : {}]}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={{ marginTop: 12, color: MUTED }}>No rows match this report.</Text>
      ) : (
        rows.map((row) => (
          <View key={row.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, { width: "56%" }]}>{row.name}</Text>
            <Text style={[styles.cell, styles.right, { width: "18%" }]}>{row.count}</Text>
            <Text style={[styles.cell, styles.right, { width: "26%" }]}>{row.valueLabel}</Text>
          </View>
        ))
      )}
    </>
  );
}

export async function renderReportPdf(input: {
  type: ReportType;
  view: ReportView;
  invoices: ReportInvoice[];
  query: string;
  beneficiary: string;
  generatedAt: string;
}) {
  let logo: Buffer | null = null;
  try {
    logo = await readFile(path.join(process.cwd(), "assets", "Logo.png"));
  } catch {
    logo = null;
  }
  return renderToBuffer(<ReportDocument {...input} logo={logo} />);
}

export function reportPdfName(type: ReportType, from: string, to: string) {
  return `ifranchise-${type}-report-${from}-to-${to}.pdf`;
}
