export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belgium", "Bhutan", "Brazil", "Bulgaria",
  "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Egypt", "Estonia", "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya",
  "Kuwait", "Latvia", "Lebanon", "Lithuania", "Luxembourg", "Malaysia", "Maldives", "Malta",
  "Mauritius", "Mexico", "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Oman", "Pakistan", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Saudi Arabia",
  "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Vietnam",
] as const;

export const CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "CHF", "CNY", "HKD",
  "NZD", "SAR", "QAR", "KWD", "OMR", "BHD", "ZAR", "LKR", "NPR", "BDT", "THB", "MYR",
] as const;

const CURRENCY_LABELS: Record<string, string> = {
  INR: "Indian rupee",
  USD: "US dollar",
  EUR: "Euro",
  GBP: "Pound sterling",
  AED: "UAE dirham",
  SGD: "Singapore dollar",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  JPY: "Yen",
  CHF: "Swiss franc",
  CNY: "Yuan",
  HKD: "Hong Kong dollar",
  NZD: "New Zealand dollar",
  SAR: "Saudi riyal",
  QAR: "Qatari riyal",
  KWD: "Kuwaiti dinar",
  OMR: "Omani rial",
  BHD: "Bahraini dinar",
  ZAR: "Rand",
  LKR: "Sri Lankan rupee",
  NPR: "Nepalese rupee",
  BDT: "Taka",
  THB: "Baht",
  MYR: "Ringgit",
  SEK: "Swedish krona",
  NOK: "Norwegian krone",
  DKK: "Danish krone",
  PLN: "Zloty",
  CZK: "Czech koruna",
  HUF: "Forint",
  RON: "Leu",
  BGN: "Lev",
  TRY: "Turkish lira",
  ILS: "Shekel",
  EGP: "Egyptian pound",
  TWD: "New Taiwan dollar",
  PHP: "Philippine peso",
  IDR: "Rupiah",
  VND: "Dong",
  KRW: "Won",
  KES: "Kenyan shilling",
  NGN: "Naira",
  MUR: "Mauritian rupee",
  MVR: "Rufiyaa",
  BTN: "Ngultrum",
  PKR: "Pakistani rupee",
  UGX: "Ugandan shilling",
  UAH: "Hryvnia",
  MAD: "Moroccan dirham",
  MXN: "Mexican peso",
  BRL: "Real",
  CLP: "Chilean peso",
  COP: "Colombian peso",
  ARS: "Argentine peso",
  JOD: "Jordanian dinar",
  LBP: "Lebanese pound",
  ISK: "Icelandic krona",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  India: "INR",
  "United States": "USD",
  "United Kingdom": "GBP",
  "United Arab Emirates": "AED",
  Singapore: "SGD",
  Australia: "AUD",
  Canada: "CAD",
  Japan: "JPY",
  Switzerland: "CHF",
  China: "CNY",
  "Hong Kong": "HKD",
  "New Zealand": "NZD",
  "Saudi Arabia": "SAR",
  Qatar: "QAR",
  Kuwait: "KWD",
  Oman: "OMR",
  Bahrain: "BHD",
  "South Africa": "ZAR",
  "Sri Lanka": "LKR",
  Nepal: "NPR",
  Bangladesh: "BDT",
  Thailand: "THB",
  Malaysia: "MYR",
  Sweden: "SEK",
  Norway: "NOK",
  Denmark: "DKK",
  Poland: "PLN",
  Czechia: "CZK",
  Hungary: "HUF",
  Romania: "RON",
  Bulgaria: "BGN",
  Turkey: "TRY",
  Israel: "ILS",
  Egypt: "EGP",
  Taiwan: "TWD",
  Philippines: "PHP",
  Indonesia: "IDR",
  Vietnam: "VND",
  "South Korea": "KRW",
  Kenya: "KES",
  Nigeria: "NGN",
  Mauritius: "MUR",
  Maldives: "MVR",
  Bhutan: "BTN",
  Pakistan: "PKR",
  Uganda: "UGX",
  Ukraine: "UAH",
  Morocco: "MAD",
  Mexico: "MXN",
  Brazil: "BRL",
  Chile: "CLP",
  Colombia: "COP",
  Argentina: "ARS",
  Jordan: "JOD",
  Lebanon: "LBP",
  Iceland: "ISK",
  Austria: "EUR",
  Belgium: "EUR",
  Croatia: "EUR",
  Cyprus: "EUR",
  Estonia: "EUR",
  Finland: "EUR",
  France: "EUR",
  Germany: "EUR",
  Greece: "EUR",
  Ireland: "EUR",
  Italy: "EUR",
  Latvia: "EUR",
  Lithuania: "EUR",
  Luxembourg: "EUR",
  Malta: "EUR",
  Netherlands: "EUR",
  Portugal: "EUR",
  Slovakia: "EUR",
  Slovenia: "EUR",
  Spain: "EUR",
  Andorra: "EUR",
};

export function currencyForCountry(country: string) {
  const match = Object.keys(COUNTRY_CURRENCY).find(
    (name) => name.toLowerCase() === country.trim().toLowerCase(),
  );
  return match ? COUNTRY_CURRENCY[match] : "INR";
}

export function currencyChoices(country: string) {
  const primary = currencyForCountry(country);
  const codes = [primary, ...CURRENCIES.filter((code) => code !== primary)];
  return codes.map((code) => ({
    value: code,
    label: CURRENCY_LABELS[code] ?? code,
  }));
}

export const DIAL_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "United States / Canada" },
  { code: "+44", country: "United Kingdom" },
  { code: "+971", country: "United Arab Emirates" },
  { code: "+65", country: "Singapore" },
  { code: "+61", country: "Australia" },
  { code: "+81", country: "Japan" },
  { code: "+86", country: "China" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+39", country: "Italy" },
  { code: "+34", country: "Spain" },
  { code: "+31", country: "Netherlands" },
  { code: "+41", country: "Switzerland" },
  { code: "+46", country: "Sweden" },
  { code: "+47", country: "Norway" },
  { code: "+45", country: "Denmark" },
  { code: "+353", country: "Ireland" },
  { code: "+64", country: "New Zealand" },
  { code: "+27", country: "South Africa" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+974", country: "Qatar" },
  { code: "+965", country: "Kuwait" },
  { code: "+968", country: "Oman" },
  { code: "+973", country: "Bahrain" },
  { code: "+60", country: "Malaysia" },
  { code: "+62", country: "Indonesia" },
  { code: "+63", country: "Philippines" },
  { code: "+66", country: "Thailand" },
  { code: "+84", country: "Vietnam" },
  { code: "+82", country: "South Korea" },
  { code: "+852", country: "Hong Kong" },
  { code: "+94", country: "Sri Lanka" },
  { code: "+977", country: "Nepal" },
  { code: "+880", country: "Bangladesh" },
  { code: "+92", country: "Pakistan" },
  { code: "+975", country: "Bhutan" },
  { code: "+960", country: "Maldives" },
  { code: "+230", country: "Mauritius" },
  { code: "+254", country: "Kenya" },
  { code: "+234", country: "Nigeria" },
] as const;

const INDIA: Record<string, Record<string, string[]>> = {
  "Andhra Pradesh": {
    Visakhapatnam: ["530001", "530002", "530003", "530016"],
    Vijayawada: ["520001", "520002", "520003", "520010"],
    Guntur: ["522001", "522002", "522003"],
    Tirupati: ["517501", "517502", "517507"],
  },
  "Arunachal Pradesh": {
    Itanagar: ["791111", "791113"],
    Tawang: ["790104"],
    Pasighat: ["791102"],
  },
  Assam: {
    Guwahati: ["781001", "781003", "781005", "781007"],
    Dibrugarh: ["786001", "786003"],
    Silchar: ["788001", "788005"],
  },
  Bihar: {
    Patna: ["800001", "800002", "800004", "800014"],
    Gaya: ["823001", "823002"],
    Muzaffarpur: ["842001", "842002"],
  },
  Chhattisgarh: {
    Raipur: ["492001", "492002", "492004"],
    Bhilai: ["490001", "490006"],
    Bilaspur: ["495001", "495004"],
  },
  Goa: {
    Panaji: ["403001", "403002"],
    Margao: ["403601", "403602"],
    Vasco: ["403802"],
  },
  Gujarat: {
    Ahmedabad: ["380001", "380006", "380009", "380015"],
    Surat: ["395001", "395003", "395007"],
    Vadodara: ["390001", "390007"],
    Rajkot: ["360001", "360005"],
  },
  Haryana: {
    Gurugram: ["122001", "122002", "122003", "122018"],
    Faridabad: ["121001", "121002", "121006"],
    Panipat: ["132103"],
  },
  "Himachal Pradesh": {
    Shimla: ["171001", "171002", "171003"],
    Dharamshala: ["176215"],
    Manali: ["175131"],
  },
  Jharkhand: {
    Ranchi: ["834001", "834002", "834005"],
    Jamshedpur: ["831001", "831003"],
    Dhanbad: ["826001"],
  },
  Karnataka: {
    Bengaluru: ["560001", "560002", "560008", "560025", "560038", "560076"],
    Mysuru: ["570001", "570004", "570008"],
    Mangaluru: ["575001", "575003"],
    Hubballi: ["580020", "580029"],
  },
  Kerala: {
    Thiruvananthapuram: ["695001", "695003", "695014"],
    Kochi: ["682001", "682011", "682016", "682020"],
    Kozhikode: ["673001", "673004"],
  },
  "Madhya Pradesh": {
    Bhopal: ["462001", "462003", "462016"],
    Indore: ["452001", "452003", "452010"],
    Gwalior: ["474001", "474002"],
    Jabalpur: ["482001", "482002"],
  },
  Maharashtra: {
    Mumbai: ["400001", "400002", "400003", "400004", "400005", "400020", "400050", "400070"],
    Pune: ["411001", "411002", "411004", "411007", "411014", "411038"],
    Nagpur: ["440001", "440002", "440010"],
    Nashik: ["422001", "422002", "422005"],
    Thane: ["400601", "400602", "400604"],
    "Navi Mumbai": ["400614", "400703", "400705"],
  },
  Manipur: { Imphal: ["795001", "795004"] },
  Meghalaya: { Shillong: ["793001", "793002"] },
  Mizoram: { Aizawl: ["796001", "796007"] },
  Nagaland: { Kohima: ["797001"], Dimapur: ["797112"] },
  Odisha: {
    Bhubaneswar: ["751001", "751002", "751003"],
    Cuttack: ["753001", "753003"],
    Puri: ["752001"],
  },
  Punjab: {
    Chandigarh: ["160017", "160022"],
    Ludhiana: ["141001", "141002", "141008"],
    Amritsar: ["143001", "143006"],
    Jalandhar: ["144001"],
  },
  Rajasthan: {
    Jaipur: ["302001", "302002", "302004", "302015"],
    Jodhpur: ["342001", "342003"],
    Udaipur: ["313001", "313002"],
    Kota: ["324001"],
  },
  Sikkim: { Gangtok: ["737101", "737103"] },
  "Tamil Nadu": {
    Chennai: ["600001", "600002", "600004", "600017", "600020", "600040"],
    Coimbatore: ["641001", "641002", "641004"],
    Madurai: ["625001", "625002"],
    Tiruchirappalli: ["620001"],
  },
  Telangana: {
    Hyderabad: ["500001", "500003", "500004", "500016", "500032", "500081"],
    Warangal: ["506001", "506002"],
    Nizamabad: ["503001"],
  },
  Tripura: { Agartala: ["799001", "799006"] },
  "Uttar Pradesh": {
    Lucknow: ["226001", "226002", "226004", "226010"],
    Noida: ["201301", "201303", "201304"],
    Kanpur: ["208001", "208002"],
    Varanasi: ["221001", "221002"],
    Agra: ["282001", "282002"],
    Ghaziabad: ["201001", "201002"],
  },
  Uttarakhand: {
    Dehradun: ["248001", "248002", "248006"],
    Haridwar: ["249401"],
    Nainital: ["263001"],
  },
  "West Bengal": {
    Kolkata: ["700001", "700002", "700016", "700019", "700027", "700091"],
    Howrah: ["711101", "711102"],
    Siliguri: ["734001", "734005"],
    Durgapur: ["713201"],
  },
  Delhi: {
    "New Delhi": ["110001", "110002", "110003", "110011", "110016", "110017"],
    Delhi: ["110006", "110008", "110009", "110085"],
  },
  Chandigarh: { Chandigarh: ["160017", "160022", "160036"] },
  Puducherry: { Puducherry: ["605001", "605003"] },
  "Jammu and Kashmir": { Srinagar: ["190001", "190003"], Jammu: ["180001", "180002"] },
  Ladakh: { Leh: ["194101"] },
  Lakshadweep: { Kavaratti: ["682555"] },
  "Andaman and Nicobar Islands": { "Port Blair": ["744101", "744102"] },
  "Dadra and Nagar Haveli and Daman and Diu": { Daman: ["396210"], Silvassa: ["396230"] },
};

function same(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function indiaStateNames() {
  return Object.keys(INDIA);
}

function indiaStateKey(state: string) {
  return indiaStateNames().find((name) => same(name, state)) ?? null;
}

export function stateOptions(country: string) {
  return same(country, "India") ? indiaStateNames() : [];
}

export function cityOptions(country: string, state: string) {
  if (!same(country, "India")) return [];
  const key = indiaStateKey(state);
  return key ? Object.keys(INDIA[key]) : [];
}

export function postalOptions(country: string, state: string, city: string) {
  if (!same(country, "India")) return [];
  const stateKey = indiaStateKey(state);
  if (!stateKey) return [];
  const cityKey = Object.keys(INDIA[stateKey]).find((name) => same(name, city));
  return cityKey ? INDIA[stateKey][cityKey] : [];
}

export function dialCodeForCountry(country: string) {
  return DIAL_CODES.find((item) => same(item.country, country))?.code ?? null;
}

export function splitStoredPhone(phone: string, country: string) {
  const trimmed = phone.trim();
  const matched = trimmed.match(/^(\+\d{1,4})(?:\s+)(.*)$/);
  if (matched) return { dial: matched[1], number: matched[2] };
  return { dial: dialCodeForCountry(country) ?? "+91", number: trimmed };
}

export function composePhone(dial: string, number: string) {
  const local = number.trim();
  if (!local) return "";
  const code = dial.trim();
  return code ? `${code} ${local}` : local;
}

