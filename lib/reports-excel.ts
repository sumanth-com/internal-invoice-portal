import "server-only";

import { roundMoney, statusLabel } from "@/lib/invoice";
import { REPORT_TYPE_LABELS, reportBeneficiaryRows, type ReportInvoice, type ReportType, type ReportView } from "@/lib/reports";
import ExcelJS from "exceljs";

const MONEY = "#,##0.00";
const DATE = "dd mmm yyyy";

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(`${value}T00:00:00+05:30`);
}

function sum(invoices: ReportInvoice[], pick: (invoice: ReportInvoice) => number) {
  return roundMoney(invoices.reduce((total, invoice) => total + pick(invoice), 0));
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
}

function paintMoney(row: ExcelJS.Row, columns: number[]) {
  for (const column of columns) row.getCell(column).numFmt = MONEY;
}

export async function reportWorkbook(input: {
  type: ReportType;
  view: ReportView;
  invoices: ReportInvoice[];
  query: string;
  beneficiary: string;
  generatedAt: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "iFranchise";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 32 },
    { header: "Value", key: "value", width: 42 },
  ];
  const summaryRows: { field: string; value: string | number | Date }[] = [
    { field: "Report", value: "iFranchise report" },
    { field: "Report type", value: REPORT_TYPE_LABELS[input.type] },
    { field: "From", value: dateValue(input.view.from) },
    { field: "To", value: dateValue(input.view.to) },
    { field: "Search", value: input.query || "—" },
    { field: "Beneficiary", value: input.beneficiary || "All beneficiaries" },
    { field: "Generated", value: input.generatedAt },
    { field: "Currency", value: input.view.currency },
    { field: "Total invoices", value: input.invoices.length },
    { field: "Invoice value", value: sum(input.invoices, (invoice) => invoice.total) },
    { field: "CGST", value: sum(input.invoices, (invoice) => invoice.cgstAmount) },
    { field: "SGST", value: sum(input.invoices, (invoice) => invoice.sgstAmount) },
    { field: "IGST", value: sum(input.invoices, (invoice) => invoice.igstAmount) },
    { field: "Total GST", value: sum(input.invoices, (invoice) => invoice.gstAmount) },
    { field: "TDS", value: sum(input.invoices, (invoice) => invoice.tdsAmount) },
    { field: "Balance due", value: sum(input.invoices, (invoice) => invoice.balanceDue) },
    { field: "Amount paid", value: sum(input.invoices, (invoice) => invoice.amountPaid) },
    { field: "Outstanding", value: sum(input.invoices, (invoice) => invoice.outstanding) },
  ];
  for (const status of input.view.statuses) {
    summaryRows.push({ field: `${status.label} invoices`, value: status.count });
  }
  for (const mode of input.view.payments.modes) {
    summaryRows.push({ field: `${mode.label} payments`, value: mode.count });
  }
  for (const entry of summaryRows) summary.addRow(entry);
  styleHeader(summary);
  summary.eachRow((row, index) => {
    if (index === 1) return;
    const cell = row.getCell(2);
    if (cell.value instanceof Date) cell.numFmt = DATE;
    const label = String(row.getCell(1).value ?? "");
    if (
      ["Invoice value", "CGST", "SGST", "IGST", "Total GST", "TDS", "Balance due", "Amount paid", "Outstanding"].includes(
        label,
      )
    ) {
      cell.numFmt = MONEY;
    }
  });

  if (input.type === "beneficiaries") {
    const details = workbook.addWorksheet("Beneficiaries");
    details.columns = [
      { header: "Beneficiary", key: "name", width: 36 },
      { header: "Invoices", key: "count", width: 14 },
      { header: "Value", key: "value", width: 18 },
    ];
    for (const row of reportBeneficiaryRows(input.invoices)) {
      const entry = details.addRow({ name: row.name, count: row.count, value: roundMoney(row.value) });
      entry.getCell(3).numFmt = MONEY;
    }
    styleHeader(details);
    details.views = [{ state: "frozen", ySplit: 1 }];
    details.autoFilter = { from: "A1", to: "C1" };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const details = workbook.addWorksheet("Invoices");
  details.columns = [
    { header: "Invoice number", key: "number", width: 20 },
    { header: "Invoice date", key: "date", width: 16 },
    { header: "Beneficiary", key: "beneficiary", width: 32 },
    { header: "Status", key: "status", width: 14 },
    { header: "Subtotal", key: "subtotal", width: 16 },
    { header: "CGST", key: "cgst", width: 14 },
    { header: "SGST", key: "sgst", width: 14 },
    { header: "IGST", key: "igst", width: 14 },
    { header: "Total GST", key: "gst", width: 16 },
    { header: "Invoice total", key: "total", width: 16 },
    { header: "TDS", key: "tds", width: 14 },
    { header: "Balance due", key: "balanceDue", width: 16 },
    { header: "Amount paid", key: "paid", width: 16 },
    { header: "Outstanding", key: "outstanding", width: 16 },
    { header: "Payment dates", key: "payments", width: 28 },
  ];
  const ordered = [...input.invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.number < right.number ? -1 : 1;
  });
  for (const invoice of ordered) {
    const row = details.addRow({
      number: invoice.number,
      date: dateValue(invoice.date),
      beneficiary: invoice.beneficiaryName,
      status: statusLabel(invoice.status),
      subtotal: roundMoney(invoice.subtotal),
      cgst: roundMoney(invoice.cgstAmount),
      sgst: roundMoney(invoice.sgstAmount),
      igst: roundMoney(invoice.igstAmount),
      gst: roundMoney(invoice.gstAmount),
      total: roundMoney(invoice.total),
      tds: roundMoney(invoice.tdsAmount),
      balanceDue: roundMoney(invoice.balanceDue),
      paid: roundMoney(invoice.amountPaid),
      outstanding: roundMoney(invoice.outstanding),
      payments: [...new Set(invoice.payments.map((payment) => payment.date).filter(Boolean))].sort().join(", "),
    });
    if (row.getCell(2).value instanceof Date) row.getCell(2).numFmt = DATE;
    paintMoney(row, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  }
  styleHeader(details);
  details.views = [{ state: "frozen", ySplit: 1 }];
  details.autoFilter = { from: "A1", to: "O1" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reportExcelName(type: ReportType, from: string, to: string) {
  return `ifranchise-${type}-report-${from}-to-${to}.xlsx`;
}
