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
  { code: "+91", country: "India", digits: 10 },
  { code: "+1", country: "United States / Canada", digits: 10 },
  { code: "+44", country: "United Kingdom", digits: 10 },
  { code: "+971", country: "United Arab Emirates", digits: 9 },
  { code: "+65", country: "Singapore", digits: 8 },
  { code: "+61", country: "Australia", digits: 9 },
  { code: "+81", country: "Japan", digits: 10 },
  { code: "+86", country: "China", digits: 11 },
  { code: "+49", country: "Germany", digits: [10, 11] },
  { code: "+33", country: "France", digits: 9 },
  { code: "+39", country: "Italy", digits: [9, 10] },
  { code: "+34", country: "Spain", digits: 9 },
  { code: "+31", country: "Netherlands", digits: 9 },
  { code: "+41", country: "Switzerland", digits: 9 },
  { code: "+46", country: "Sweden", digits: 9 },
  { code: "+47", country: "Norway", digits: 8 },
  { code: "+45", country: "Denmark", digits: 8 },
  { code: "+353", country: "Ireland", digits: 9 },
  { code: "+64", country: "New Zealand", digits: [8, 10] },
  { code: "+27", country: "South Africa", digits: 9 },
  { code: "+966", country: "Saudi Arabia", digits: 9 },
  { code: "+974", country: "Qatar", digits: 8 },
  { code: "+965", country: "Kuwait", digits: 8 },
  { code: "+968", country: "Oman", digits: 8 },
  { code: "+973", country: "Bahrain", digits: 8 },
  { code: "+60", country: "Malaysia", digits: [9, 10] },
  { code: "+62", country: "Indonesia", digits: [9, 12] },
  { code: "+63", country: "Philippines", digits: 10 },
  { code: "+66", country: "Thailand", digits: 9 },
  { code: "+84", country: "Vietnam", digits: 9 },
  { code: "+82", country: "South Korea", digits: [9, 10] },
  { code: "+852", country: "Hong Kong", digits: 8 },
  { code: "+94", country: "Sri Lanka", digits: 9 },
  { code: "+977", country: "Nepal", digits: 10 },
  { code: "+880", country: "Bangladesh", digits: 10 },
  { code: "+92", country: "Pakistan", digits: 10 },
  { code: "+975", country: "Bhutan", digits: 8 },
  { code: "+960", country: "Maldives", digits: 7 },
  { code: "+230", country: "Mauritius", digits: 8 },
  { code: "+254", country: "Kenya", digits: 9 },
  { code: "+234", country: "Nigeria", digits: 10 },
] as const;

function cities(names: readonly string[], pins: Record<string, string[]> = {}) {
  return Object.fromEntries(names.map((name) => [name, pins[name] ?? []])) as Record<string, string[]>;
}

const INDIA: Record<string, Record<string, string[]>> = {
  "Andhra Pradesh": cities(
    [
      "Amalapuram", "Anantapur", "Bapatla", "Bhimavaram", "Chittoor", "Eluru", "Guntur", "Kadapa",
      "Kakinada", "Kurnool", "Machilipatnam", "Nandyal", "Narasaraopet", "Nellore", "Ongole", "Paderu",
      "Parvathipuram", "Puttaparthi", "Rajamahendravaram", "Rayachoti", "Srikakulam", "Tirupati",
      "Vijayawada", "Visakhapatnam", "Vizianagaram",
    ],
    {
      Visakhapatnam: ["530001", "530002", "530003", "530016"],
      Vijayawada: ["520001", "520002", "520003", "520010"],
      Guntur: ["522001", "522002", "522003"],
      Tirupati: ["517501", "517502", "517507"],
    },
  ),
  "Arunachal Pradesh": cities(
    ["Aalo", "Anini", "Bomdila", "Changlang", "Daporijo", "Hawai", "Itanagar", "Khonsa", "Koloriang", "Longding", "Namsai", "Pasighat", "Roing", "Seppa", "Tawang", "Tezu", "Yingkiong", "Ziro"],
    { Itanagar: ["791111", "791113"], Tawang: ["790104"], Pasighat: ["791102"] },
  ),
  Assam: cities(
    ["Barpeta", "Biswanath Chariali", "Bongaigaon", "Dhemaji", "Dhubri", "Dibrugarh", "Diphu", "Goalpara", "Golaghat", "Guwahati", "Haflong", "Hailakandi", "Hojai", "Jorhat", "Karimganj", "Kokrajhar", "Majuli", "Mangaldoi", "Nagaon", "Nalbari", "North Lakhimpur", "Silchar", "Sivasagar", "Tezpur", "Tinsukia"],
    { Guwahati: ["781001", "781003", "781005", "781007"], Dibrugarh: ["786001", "786003"], Silchar: ["788001", "788005"] },
  ),
  Bihar: cities(
    ["Araria", "Arrah", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bettiah", "Bhagalpur", "Bhabua", "Bihar Sharif", "Buxar", "Chhapra", "Darbhanga", "Gaya", "Gopalganj", "Hajipur", "Jamui", "Jehanabad", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Motihari", "Munger", "Muzaffarpur", "Nawada", "Patna", "Purnia", "Saharsa", "Samastipur", "Sasaram", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul"],
    { Patna: ["800001", "800002", "800004", "800014"], Gaya: ["823001", "823002"], Muzaffarpur: ["842001", "842002"] },
  ),
  Chhattisgarh: cities(
    ["Ambikapur", "Balod", "Baloda Bazar", "Balrampur", "Bemetara", "Bhilai", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurella", "Jagdalpur", "Janjgir", "Jashpur", "Kanker", "Kawardha", "Kondagaon", "Korba", "Mahasamund", "Mungeli", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur"],
    { Raipur: ["492001", "492002", "492004"], Bhilai: ["490001", "490006"], Bilaspur: ["495001", "495004"] },
  ),
  Goa: cities(
    ["Bicholim", "Canacona", "Cuncolim", "Mapusa", "Margao", "Panaji", "Ponda", "Sanguem", "Valpoi", "Vasco"],
    { Panaji: ["403001", "403002"], Margao: ["403601", "403602"], Vasco: ["403802"] },
  ),
  Gujarat: cities(
    ["Ahmedabad", "Ahwa", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Botad", "Chhota Udepur", "Dahod", "Gandhinagar", "Godhra", "Himatnagar", "Jamnagar", "Junagadh", "Lunawada", "Mehsana", "Modasa", "Morbi", "Nadiad", "Navsari", "Palanpur", "Patan", "Porbandar", "Rajkot", "Rajpipla", "Surat", "Surendranagar", "Vadodara", "Valsad", "Vyara"],
    { Ahmedabad: ["380001", "380006", "380009", "380015"], Surat: ["395001", "395003", "395007"], Vadodara: ["390001", "390007"], Rajkot: ["360001", "360005"] },
  ),
  Haryana: cities(
    ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Narnaul", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    { Gurugram: ["122001", "122002", "122003", "122018"], Faridabad: ["121001", "121002", "121006"], Panipat: ["132103"] },
  ),
  "Himachal Pradesh": cities(
    ["Bilaspur", "Chamba", "Dharamshala", "Hamirpur", "Kaza", "Keylong", "Kullu", "Manali", "Mandi", "Nahan", "Reckong Peo", "Shimla", "Solan", "Una"],
    { Shimla: ["171001", "171002", "171003"], Dharamshala: ["176215"], Manali: ["175131"] },
  ),
  Jharkhand: cities(
    ["Bokaro", "Chaibasa", "Chatra", "Deoghar", "Dhanbad", "Dumka", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamshedpur", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Medininagar", "Pakur", "Ramgarh", "Ranchi", "Sahibganj", "Saraikela", "Simdega"],
    { Ranchi: ["834001", "834002", "834005"], Jamshedpur: ["831001", "831003"], Dhanbad: ["826001"] },
  ),
  Karnataka: cities(
    ["Bagalkot", "Ballari", "Belagavi", "Bengaluru", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Davangere", "Gadag", "Hassan", "Haveri", "Hubballi", "Kalaburagi", "Karwar", "Kolar", "Koppal", "Madikeri", "Mandya", "Mangaluru", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura", "Yadgir"],
    { Bengaluru: ["560001", "560002", "560008", "560025", "560038", "560076"], Mysuru: ["570001", "570004", "570008"], Mangaluru: ["575001", "575003"], Hubballi: ["580020", "580029"] },
  ),
  Kerala: cities(
    ["Alappuzha", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    { Thiruvananthapuram: ["695001", "695003", "695014"], Kochi: ["682001", "682011", "682016", "682020"], Kozhikode: ["673001", "673004"] },
  ),
  "Madhya Pradesh": cities(
    ["Agar", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Betul", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    { Bhopal: ["462001", "462003", "462016"], Indore: ["452001", "452003", "452010"], Gwalior: ["474001", "474002"], Jabalpur: ["482001", "482002"] },
  ),
  Maharashtra: cities(
    ["Ahmednagar", "Akola", "Alibag", "Amravati", "Aurangabad", "Beed", "Bhandara", "Bhiwandi", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Navi Mumbai", "Osmanabad", "Palghar", "Parbhani", "Pune", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    {
      Mumbai: ["400001", "400002", "400003", "400004", "400005", "400020", "400050", "400070"],
      Pune: ["411001", "411002", "411004", "411007", "411014", "411038"],
      Nagpur: ["440001", "440002", "440010"],
      Nashik: ["422001", "422002", "422005"],
      Thane: ["400601", "400602", "400604"],
      "Navi Mumbai": ["400614", "400703", "400705"],
    },
  ),
  Manipur: cities(
    ["Bishnupur", "Churachandpur", "Imphal", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    { Imphal: ["795001", "795004"] },
  ),
  Meghalaya: cities(
    ["Ampati", "Baghmara", "Jowai", "Khliehriat", "Mawkyrwat", "Nongpoh", "Nongstoin", "Resubelpara", "Shillong", "Tura", "Williamnagar"],
    { Shillong: ["793001", "793002"] },
  ),
  Mizoram: cities(
    ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saitual", "Serchhip", "Siaha"],
    { Aizawl: ["796001", "796007"] },
  ),
  Nagaland: cities(
    ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Noklak", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
    { Kohima: ["797001"], Dimapur: ["797112"] },
  ),
  Odisha: cities(
    ["Angul", "Balasore", "Bargarh", "Baripada", "Berhampur", "Bhadrak", "Bhubaneswar", "Bolangir", "Cuttack", "Dhenkanal", "Jajpur", "Jeypore", "Jharsuguda", "Kendrapara", "Keonjhar", "Khordha", "Koraput", "Nayagarh", "Paralakhemundi", "Phulbani", "Puri", "Rayagada", "Rourkela", "Sambalpur", "Sundargarh"],
    { Bhubaneswar: ["751001", "751002", "751003"], Cuttack: ["753001", "753003"], Puri: ["752001"] },
  ),
  Punjab: cities(
    ["Amritsar", "Barnala", "Bathinda", "Chandigarh", "Faridkot", "Fatehgarh Sahib", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Moga", "Mohali", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"],
    { Chandigarh: ["160017", "160022"], Ludhiana: ["141001", "141002", "141008"], Amritsar: ["143001", "143006"], Jalandhar: ["144001"] },
  ),
  Rajasthan: cities(
    ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    { Jaipur: ["302001", "302002", "302004", "302015"], Jodhpur: ["342001", "342003"], Udaipur: ["313001", "313002"], Kota: ["324001"] },
  ),
  Sikkim: cities(
    ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
    { Gangtok: ["737101", "737103"] },
  ),
  "Tamil Nadu": cities(
    ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dindigul", "Erode", "Hosur", "Kallakurichi", "Kanchipuram", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagercoil", "Nagapattinam", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvannamalai", "Vellore", "Villupuram", "Virudhunagar"],
    { Chennai: ["600001", "600002", "600004", "600017", "600020", "600040"], Coimbatore: ["641001", "641002", "641004"], Madurai: ["625001", "625002"], Tiruchirappalli: ["620001"] },
  ),
  Telangana: cities(
    ["Adilabad", "Bhupalpally", "Hyderabad", "Jagtial", "Jangaon", "Kamareddy", "Karimnagar", "Khammam", "Kothagudem", "Mahbubnagar", "Mancherial", "Medak", "Medchal", "Miryalaguda", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Ramagundam", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri"],
    { Hyderabad: ["500001", "500003", "500004", "500016", "500032", "500081"], Warangal: ["506001", "506002"], Nizamabad: ["503001"] },
  ),
  Tripura: cities(
    ["Agartala", "Ambassa", "Belonia", "Bishramganj", "Dharmanagar", "Kailashahar", "Khowai", "Santirbazar", "Udaipur"],
    { Agartala: ["799001", "799006"] },
  ),
  "Uttar Pradesh": cities(
    ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Greater Noida", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur", "Kanpur Dehat", "Kasganj", "Kaushambi", "Lakhimpur", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Noida", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    { Lucknow: ["226001", "226002", "226004", "226010"], Noida: ["201301", "201303", "201304"], Kanpur: ["208001", "208002"], Varanasi: ["221001", "221002"], Agra: ["282001", "282002"], Ghaziabad: ["201001", "201002"] },
  ),
  Uttarakhand: cities(
    ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haldwani", "Haridwar", "Kashipur", "Nainital", "New Tehri", "Pauri", "Pithoragarh", "Rishikesh", "Roorkee", "Rudraprayag", "Rudrapur", "Srinagar", "Tehri", "Uttarkashi"],
    { Dehradun: ["248001", "248002", "248006"], Haridwar: ["249401"], Nainital: ["263001"] },
  ),
  "West Bengal": cities(
    ["Alipurduar", "Asansol", "Baharampur", "Balurghat", "Bankura", "Barasat", "Bardhaman", "Barrackpore", "Basirhat", "Bishnupur", "Chinsurah", "Cooch Behar", "Darjeeling", "Diamond Harbour", "Durgapur", "English Bazar", "Haldia", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kharagpur", "Kolkata", "Krishnanagar", "Malda", "Medinipur", "Purulia", "Raiganj", "Siliguri", "Suri", "Tamluk"],
    { Kolkata: ["700001", "700002", "700016", "700019", "700027", "700091"], Howrah: ["711101", "711102"], Siliguri: ["734001", "734005"], Durgapur: ["713201"] },
  ),
  Delhi: cities(
    ["Civil Lines", "Delhi", "Dwarka", "Karol Bagh", "New Delhi", "Rohini", "Saket", "Shahdara"],
    { "New Delhi": ["110001", "110002", "110003", "110011", "110016", "110017"], Delhi: ["110006", "110008", "110009", "110085"] },
  ),
  Chandigarh: cities(["Chandigarh"], { Chandigarh: ["160017", "160022", "160036"] }),
  Puducherry: cities(["Karaikal", "Mahe", "Puducherry", "Yanam"], { Puducherry: ["605001", "605003"] }),
  "Jammu and Kashmir": cities(
    ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
    { Srinagar: ["190001", "190003"], Jammu: ["180001", "180002"] },
  ),
  Ladakh: cities(["Kargil", "Leh"], { Leh: ["194101"] }),
  Lakshadweep: cities(["Agatti", "Amini", "Andrott", "Kavaratti", "Minicoy"], { Kavaratti: ["682555"] }),
  "Andaman and Nicobar Islands": cities(
    ["Car Nicobar", "Diglipur", "Mayabunder", "Port Blair", "Rangat"],
    { "Port Blair": ["744101", "744102"] },
  ),
  "Dadra and Nagar Haveli and Daman and Diu": cities(
    ["Daman", "Diu", "Silvassa"],
    { Daman: ["396210"], Silvassa: ["396230"] },
  ),
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
  if (!key) return [];
  return Object.keys(INDIA[key]).sort((left, right) => left.localeCompare(right, "en"));
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
  const local = nationalPhoneDigits(number);
  if (!local) return "";
  const code = dial.trim();
  return code ? `${code} ${local}` : local;
}

export function phoneDigitBounds(dial: string) {
  const digits = DIAL_CODES.find((item) => item.code === dial)?.digits ?? 10;
  if (typeof digits === "number") return { min: digits, max: digits };
  return { min: digits[0], max: digits[1] };
}

export function nationalPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function limitNationalPhone(dial: string, value: string) {
  return nationalPhoneDigits(value).slice(0, phoneDigitBounds(dial).max);
}

export function phoneDigitHint(dial: string) {
  const { min, max } = phoneDigitBounds(dial);
  return min === max ? `${min} digits` : `${min} to ${max} digits`;
}

export function nationalPhoneError(dial: string, value: string) {
  const digits = nationalPhoneDigits(value);
  if (!digits) return null;
  const { min, max } = phoneDigitBounds(dial);
  if (digits.length >= min && digits.length <= max) return null;
  if (min === max) return `Enter a ${min}-digit mobile number.`;
  return `Enter a mobile number with ${min} to ${max} digits.`;
}

