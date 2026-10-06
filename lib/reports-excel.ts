import "server-only";

import { roundMoney, statusLabel } from "@/lib/invoice";
import { reportBeneficiaryRows, type ReportInvoice, type ReportType, type ReportView } from "@/lib/reports";
import ExcelJS from "exceljs";

const DATE = "dd mmm yyyy";

type Align = "left" | "right";
type Kind = "text" | "date" | "money" | "number";

type ColumnSpec = {
  header: string;
  key: string;
  width: number;
  align: Align;
  kind: Kind;
};

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(`${value}T00:00:00+05:30`);
}

function moneyFormat(currency: string) {
  return currency === "INR" ? '"₹"#,##,##0.00' : `"${currency} "#,##0.00`;
}

function orderedInvoices(invoices: ReportInvoice[]) {
  return [...invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? 1 : -1;
    return left.number < right.number ? 1 : -1;
  });
}

const INVOICE_COLUMNS: ColumnSpec[] = [
  { header: "Invoice", key: "number", width: 18, align: "left", kind: "text" },
  { header: "Date", key: "date", width: 16, align: "left", kind: "date" },
  { header: "Beneficiary", key: "beneficiary", width: 28, align: "left", kind: "text" },
  { header: "Status", key: "status", width: 14, align: "left", kind: "text" },
  { header: "Subtotal", key: "subtotal", width: 16, align: "right", kind: "money" },
  { header: "CGST", key: "cgst", width: 14, align: "right", kind: "money" },
  { header: "SGST", key: "sgst", width: 14, align: "right", kind: "money" },
  { header: "IGST", key: "igst", width: 14, align: "right", kind: "money" },
  { header: "Total GST", key: "gst", width: 16, align: "right", kind: "money" },
  { header: "TDS", key: "tds", width: 14, align: "right", kind: "money" },
  { header: "Amount Paid", key: "paid", width: 16, align: "right", kind: "money" },
  { header: "Balance Due", key: "balanceDue", width: 16, align: "right", kind: "money" },
  { header: "Outstanding", key: "outstanding", width: 16, align: "right", kind: "money" },
  { header: "Total", key: "total", width: 16, align: "right", kind: "money" },
];

function invoiceRow(invoice: ReportInvoice) {
  return {
    number: invoice.number,
    date: dateValue(invoice.date),
    beneficiary: invoice.beneficiaryName,
    status: statusLabel(invoice.status),
    subtotal: roundMoney(invoice.subtotal),
    cgst: roundMoney(invoice.cgstAmount),
    sgst: roundMoney(invoice.sgstAmount),
    igst: roundMoney(invoice.igstAmount),
    gst: roundMoney(invoice.gstAmount),
    tds: roundMoney(invoice.tdsAmount),
    paid: roundMoney(invoice.amountPaid),
    balanceDue: roundMoney(invoice.balanceDue),
    outstanding: roundMoney(invoice.outstanding),
    total: roundMoney(invoice.total),
  };
}

function writeTable(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnSpec[],
  rows: Record<string, string | number | Date>[],
  currency: string,
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const header = sheet.addRow(Object.fromEntries(columns.map((column) => [column.key, column.header])));
  header.height = 22;
  header.eachCell((cell, index) => {
    const column = columns[index - 1];
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: column?.align ?? "left", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF0F172A" } } };
  });

  const format = moneyFormat(currency);
  for (const values of rows) {
    const row = sheet.addRow(values);
    row.height = 18;
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: column.align, vertical: "middle" };
      if (column.kind === "money") cell.numFmt = format;
      if (column.kind === "date" && cell.value instanceof Date) cell.numFmt = DATE;
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
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
  const currency = input.view.currency || "INR";

  if (input.type === "beneficiaries") {
    const columns: ColumnSpec[] = [
      { header: "Beneficiary", key: "name", width: 36, align: "left", kind: "text" },
      { header: "Invoices", key: "count", width: 14, align: "right", kind: "number" },
      { header: "Value", key: "value", width: 18, align: "right", kind: "money" },
    ];
    const rows = reportBeneficiaryRows(input.invoices).map((row) => ({
      name: row.name,
      count: row.count,
      value: roundMoney(row.value),
    }));
    writeTable(workbook, "Beneficiaries", columns, rows, currency);
  } else {
    const rows = orderedInvoices(input.invoices).map((invoice) => invoiceRow(invoice));
    writeTable(workbook, "Invoices", INVOICE_COLUMNS, rows, currency);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reportExcelName(type: ReportType, from: string, to: string) {
  return `ifranchise-${type}-report-${from}-to-${to}.xlsx`;
}
