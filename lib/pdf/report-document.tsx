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
import { formatInvoiceDate, formatMoney, roundMoney, statusLabel } from "@/lib/invoice";
import { paymentModeLabel } from "@/lib/payment";
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

const INK = "#0F172A";
const MUTED = "#64748B";
const RULE = "#E2E8F0";
const HAIRLINE = "#EEF2F6";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 8,
    color: INK,
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 28, height: 28, objectFit: "contain" },
  title: { fontSize: 14, fontWeight: 700, color: INK },
  reportType: { marginTop: 1, fontSize: 8, color: MUTED },
  meta: { alignItems: "flex-end" },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", marginTop: 1 },
  metaLabel: { width: 58, textAlign: "right", color: MUTED, fontSize: 8 },
  metaValue: { width: 118, textAlign: "right", color: INK, fontSize: 8, fontWeight: 500 },
  filters: { marginTop: 8, color: MUTED, fontSize: 8 },
  summary: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: RULE,
  },
  summaryItem: { flex: 1, paddingRight: 8 },
  summaryLabel: { fontSize: 7, color: MUTED, marginBottom: 2 },
  summaryValue: { fontSize: 9, fontWeight: 600, color: INK },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    alignItems: "flex-start",
  },
  cell: { paddingVertical: 5, paddingRight: 6 },
  headText: { fontSize: 7.5, fontWeight: 600, color: INK },
  right: { textAlign: "right" },
  empty: { marginTop: 12, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    justifyContent: "space-between",
    color: MUTED,
    fontSize: 7.5,
  },
});

type Column = {
  label: string;
  width: string;
  align: "left" | "right";
  text: (invoice: ReportInvoice) => string;
};

function money(amount: number, currency: string) {
  return formatMoney(roundMoney(amount), currency || "INR");
}

function sum(invoices: ReportInvoice[], pick: (invoice: ReportInvoice) => number) {
  return roundMoney(invoices.reduce((total, invoice) => total + pick(invoice), 0));
}

function orderedInvoices(invoices: ReportInvoice[]) {
  return [...invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? 1 : -1;
    return left.number < right.number ? 1 : -1;
  });
}

function paymentModes(invoice: ReportInvoice) {
  const labels = [...new Set(invoice.payments.map((payment) => paymentModeLabel(payment.mode)))];
  return labels.length > 0 ? labels.join(", ") : "—";
}

function reportColumns(type: ReportType): Column[] {
  const taxSplit = type === "gst";
  const showMode = type === "payments";
  const showOutstanding = type === "outstanding" || type === "payments";
  const width = taxSplit
    ? {
        invoice: "10%",
        date: "8%",
        beneficiary: "11%",
        status: "7%",
        subtotal: "7.5%",
        gst: "8%",
        tds: "6%",
        paid: "8%",
        balance: "8%",
        total: "7%",
      }
    : showMode
      ? {
          invoice: "11%",
          date: "8%",
          beneficiary: "12%",
          status: "7%",
          subtotal: "8%",
          gst: "8%",
          tds: "6%",
          paid: "8%",
          balance: "8%",
          total: "8%",
        }
      : showOutstanding
        ? {
            invoice: "12%",
            date: "9%",
            beneficiary: "14%",
            status: "8%",
            subtotal: "8%",
            gst: "8%",
            tds: "6%",
            paid: "8%",
            balance: "8%",
            total: "8%",
          }
        : {
            invoice: "13%",
            date: "11%",
            beneficiary: "16%",
            status: "8%",
            subtotal: "10%",
            gst: "10%",
            tds: "7%",
            paid: "9%",
            balance: "9%",
            total: "7%",
          };
  const columns: Column[] = [
    { label: "Invoice", width: width.invoice, align: "left", text: (invoice) => invoice.number },
    { label: "Date", width: width.date, align: "left", text: (invoice) => formatInvoiceDate(invoice.date) },
    { label: "Beneficiary", width: width.beneficiary, align: "left", text: (invoice) => invoice.beneficiaryName },
    { label: "Status", width: width.status, align: "left", text: (invoice) => statusLabel(invoice.status) },
  ];
  if (showMode) columns.push({ label: "Mode", width: "8%", align: "left", text: paymentModes });
  columns.push({
    label: "Subtotal",
    width: width.subtotal,
    align: "right",
    text: (invoice) => money(invoice.subtotal, invoice.currency),
  });
  if (taxSplit) {
    columns.push(
      { label: "CGST", width: "6.5%", align: "right", text: (invoice) => money(invoice.cgstAmount, invoice.currency) },
      { label: "SGST", width: "6.5%", align: "right", text: (invoice) => money(invoice.sgstAmount, invoice.currency) },
      { label: "IGST", width: "6.5%", align: "right", text: (invoice) => money(invoice.igstAmount, invoice.currency) },
    );
  }
  columns.push(
    { label: "Total GST", width: width.gst, align: "right", text: (invoice) => money(invoice.gstAmount, invoice.currency) },
    { label: "TDS", width: width.tds, align: "right", text: (invoice) => money(invoice.tdsAmount, invoice.currency) },
    { label: "Amount Paid", width: width.paid, align: "right", text: (invoice) => money(invoice.amountPaid, invoice.currency) },
    { label: "Balance Due", width: width.balance, align: "right", text: (invoice) => money(invoice.balanceDue, invoice.currency) },
  );
  if (showOutstanding) {
    columns.push({
      label: "Outstanding",
      width: showMode ? "8%" : "11%",
      align: "right",
      text: (invoice) => money(invoice.outstanding, invoice.currency),
    });
  }
  columns.push({ label: "Total", width: width.total, align: "right", text: (invoice) => money(invoice.total, invoice.currency) });
  return columns;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaLine}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function Cell({ column, value, header = false }: { column: Column; value: string; header?: boolean }) {
  return (
    <Text
      style={[
        styles.cell,
        header ? styles.headText : {},
        { width: column.width },
        column.align === "right" ? styles.right : {},
      ]}
    >
      {value}
    </Text>
  );
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
  const currency = view.currency || "INR";
  const ordered = orderedInvoices(invoices);
  const columns = reportColumns(type);
  const filters = [
    beneficiary ? `Beneficiary  ${beneficiary}` : "",
    query ? `Search  ${query}` : "",
  ].filter(Boolean);
  const figures =
    type === "beneficiaries"
      ? [
          { label: "Beneficiaries", value: String(reportBeneficiaryRows(invoices).length) },
          { label: "Invoices", value: String(invoices.length) },
          { label: "Total", value: money(sum(invoices, (invoice) => invoice.total), currency) },
        ]
      : [
          { label: "Invoices", value: String(invoices.length) },
          { label: "Subtotal", value: money(sum(invoices, (invoice) => invoice.subtotal), currency) },
          { label: "Total GST", value: money(sum(invoices, (invoice) => invoice.gstAmount), currency) },
          { label: "TDS", value: money(sum(invoices, (invoice) => invoice.tdsAmount), currency) },
          { label: "Amount Paid", value: money(sum(invoices, (invoice) => invoice.amountPaid), currency) },
          { label: "Balance Due", value: money(sum(invoices, (invoice) => invoice.balanceDue), currency) },
          { label: "Total", value: money(sum(invoices, (invoice) => invoice.total), currency) },
        ];

  return (
    <Document title={`${REPORT_TYPE_LABELS[type]} ${view.from} to ${view.to}`} author="iFranchise">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
              <Image src={{ data: logo, format: "png" }} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.title}>iFranchise</Text>
              <Text style={styles.reportType}>{REPORT_TYPE_LABELS[type]}</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <MetaLine label="From" value={formatInvoiceDate(view.from)} />
            <MetaLine label="To" value={formatInvoiceDate(view.to)} />
            <MetaLine label="Generated" value={generatedAt} />
          </View>
        </View>
        {filters.length > 0 ? <Text style={styles.filters}>{filters.join("     ")}</Text> : null}
        <View style={styles.summary}>
          {figures.map((figure) => (
            <SummaryItem key={figure.label} label={figure.label} value={figure.value} />
          ))}
        </View>
        {type === "beneficiaries" ? (
          <BeneficiaryTable invoices={invoices} />
        ) : (
          <>
            <View style={styles.tableHead} fixed>
              {columns.map((column) => (
                <Cell key={column.label} column={column} value={column.label} header />
              ))}
            </View>
            {ordered.length === 0 ? (
              <Text style={styles.empty}>No rows match this report.</Text>
            ) : (
              ordered.map((invoice) => (
                <View key={invoice.id} style={styles.row} wrap={false}>
                  {columns.map((column) => (
                    <Cell key={column.label} column={column} value={column.text(invoice)} />
                  ))}
                </View>
              ))
            )}
          </>
        )}
        <View style={styles.footer} fixed>
          <Text>{`iFranchise  ·  ${REPORT_TYPE_LABELS[type]}  ·  ${formatInvoiceDate(view.from)} – ${formatInvoiceDate(view.to)}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function BeneficiaryTable({ invoices }: { invoices: ReportInvoice[] }) {
  const rows = reportBeneficiaryRows(invoices);
  const head = [
    { label: "Beneficiary", width: "58%", align: "left" as const },
    { label: "Invoices", width: "16%", align: "right" as const },
    { label: "Value", width: "26%", align: "right" as const },
  ];
  return (
    <>
      <View style={styles.tableHead} fixed>
        {head.map((column) => (
          <Text
            key={column.label}
            style={[styles.cell, styles.headText, { width: column.width }, column.align === "right" ? styles.right : {}]}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={styles.empty}>No rows match this report.</Text>
      ) : (
        rows.map((row) => (
          <View key={row.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, { width: "58%" }]}>{row.name}</Text>
            <Text style={[styles.cell, styles.right, { width: "16%" }]}>{String(row.count)}</Text>
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
