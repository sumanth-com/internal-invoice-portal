const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function roundMoney(value: number) {
  return Math.round(Number((value * 100).toFixed(8))) / 100;
}

const STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  haryana: "06",
  delhi: "07",
  rajasthan: "08",
  "uttar pradesh": "09",
  bihar: "10",
  sikkim: "11",
  "arunachal pradesh": "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  gujarat: "24",
  "dadra and nagar haveli and daman and diu": "26",
  maharashtra: "27",
  "andhra pradesh": "37",
  karnataka: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  "tamil nadu": "33",
  puducherry: "34",
  "andaman and nicobar islands": "35",
  telangana: "36",
  ladakh: "38",
};

export function normalizeStateName(value: string | null | undefined) {
  const text = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  return text || null;
}

export function isGstin(value: string | null | undefined) {
  const text = value?.trim().toUpperCase() ?? "";
  return GSTIN_PATTERN.test(text);
}

export function gstStateCode(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (/^[0-9]{2}$/.test(text)) return text;
  const gstin = text.toUpperCase();
  if (GSTIN_PATTERN.test(gstin)) return gstin.slice(0, 2);
  return STATE_CODES[normalizeStateName(text) ?? ""] ?? null;
}

export function stateCodeForParty(input: {
  state?: string | null;
  gstin?: string | null;
}) {
  return gstStateCode(input.gstin) ?? gstStateCode(input.state);
}

export type SupplyIdentity = {
  state?: string | null;
  stateCode?: string | null;
  placeOfSupply?: string | null;
  gstin?: string | null;
};

export function supplyIsIntrastate(
  company: { state?: string | null; gstin?: string | null },
  supply: SupplyIdentity,
) {
  const companyCode = gstStateCode(company.gstin) ?? gstStateCode(company.state);
  const supplyCode =
    gstStateCode(supply.placeOfSupply) ??
    gstStateCode(supply.stateCode) ??
    gstStateCode(supply.gstin) ??
    gstStateCode(supply.state);
  if (companyCode && supplyCode) return companyCode === supplyCode;

  const companyName = normalizeStateName(company.state);
  const supplyName = normalizeStateName(supply.placeOfSupply) ?? normalizeStateName(supply.state);
  return Boolean(companyName && supplyName && companyName === supplyName);
}

export function halfGstRate(gstRate: number) {
  return roundMoney(gstRate / 2);
}

export function previewTax(input: {
  subtotal: number;
  gstEnabled: boolean;
  gstRate: number;
  tdsAmount: number;
  intrastate: boolean;
}) {
  const subtotal = roundMoney(input.subtotal);
  const rate = Number.isFinite(input.gstRate) ? input.gstRate : 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (input.gstEnabled && input.intrastate) {
    const gstAmount = roundMoney((subtotal * rate) / 100);
    cgstAmount = roundMoney((subtotal * rate) / 200);
    sgstAmount = roundMoney(gstAmount - cgstAmount);
  } else if (input.gstEnabled) {
    igstAmount = roundMoney((subtotal * rate) / 100);
  }
  const gstAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const total = roundMoney(subtotal + gstAmount);
  const tdsAmount = roundMoney(Math.max(input.tdsAmount, 0));
  return {
    subtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    total,
    tdsAmount,
    balanceDue: roundMoney(total - tdsAmount),
    intrastate: input.gstEnabled && input.intrastate,
  };
}

export function hasLegacyGst(input: {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
}) {
  const split = roundMoney(input.cgstAmount + input.sgstAmount + input.igstAmount);
  return split === 0 && roundMoney(input.gstAmount) > 0;
}

export function formatGstRate(rate: number) {
  const rounded = roundMoney(rate);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
