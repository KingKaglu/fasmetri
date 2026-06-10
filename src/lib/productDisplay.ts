const SPECIAL_WORDS: Record<string, string> = {
  // Apple
  iphone: "iPhone",
  ipad: "iPad",
  ipod: "iPod",
  imac: "iMac",
  macbook: "MacBook",
  airpods: "AirPods",
  ios: "iOS",
  // connectivity / sim
  esim: "eSIM",
  sim: "SIM",
  nano: "Nano",
  // memory / storage
  ram: "RAM",
  rom: "ROM",
  ssd: "SSD",
  hdd: "HDD",
  nvme: "NVMe",
  emmc: "eMMC",
  ufs: "UFS",
  // displays
  fhd: "FHD",
  uhd: "UHD",
  qhd: "QHD",
  wuxga: "WUXGA",
  wqxga: "WQXGA",
  oled: "OLED",
  amoled: "AMOLED",
  ips: "IPS",
  lcd: "LCD",
  hdr: "HDR",
  // silicon
  amd: "AMD",
  cpu: "CPU",
  gpu: "GPU",
  rtx: "RTX",
  gtx: "GTX",
  geforce: "GeForce",
  xe: "Xe",
  // brands / lines with non-standard casing
  hp: "HP",
  msi: "MSI",
  asus: "ASUS",
  lg: "LG",
  tcl: "TCL",
  zte: "ZTE",
  oneplus: "OnePlus",
  oppo: "OPPO",
  poco: "POCO",
  vivobook: "VivoBook",
  zenbook: "ZenBook",
  magicbook: "MagicBook",
  omnibook: "OmniBook",
  proart: "ProArt",
  ideapad: "IdeaPad",
  thinkpad: "ThinkPad",
  thinkbook: "ThinkBook",
  loq: "LOQ",
  tuf: "TUF",
  rog: "ROG",
  omen: "OMEN",
  fe: "FE",
  se: "SE",
};

function formatWord(word: string): string {
  if (!word) return word;
  // Already human-formatted (contains uppercase) — leave untouched.
  if (/[A-Z]/.test(word)) return word;

  const special = SPECIAL_WORDS[word];
  if (special) return special;

  // Screen size: 15.6in -> 15.6", refresh rate: 165hz -> 165Hz
  const inch = word.match(/^(\d+(?:\.\d+)?)in$/);
  if (inch) return `${inch[1]}"`;
  const hz = word.match(/^(\d+)hz$/);
  if (hz) return `${hz[1]}Hz`;

  // Capacities: 256gb -> 256GB, 1024gb -> 1TB
  const capacity = word.match(/^(\d+)(gb|tb|mb)$/);
  if (capacity) {
    const amount = Number(capacity[1]);
    if (capacity[2] === "gb" && amount >= 1024 && amount % 1024 === 0) return `${amount / 1024}TB`;
    return `${capacity[1]}${capacity[2].toUpperCase()}`;
  }

  // Ordinals (13th gen), Apple "e" models (16e) and Intel core tiers (i3/i5)
  // stay lowercase; GPU core counts read as 19-Core.
  if (/^\d+(st|nd|rd|th|e)$/.test(word)) return word;
  if (/^i[3579]$/.test(word)) return word;
  const cores = word.match(/^(\d+)core$/);
  if (cores) return `${cores[1]}-Core`;

  // Model / part codes mixing digits and letters: anv15 -> ANV15, 7735hs -> 7735HS, 5g -> 5G
  if (/\d/.test(word) && /[a-z]/.test(word)) return word.toUpperCase();

  // Default: capitalize first letter (apple -> Apple, black -> Black).
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Formats machine-generated canonical product names ("apple apple_iphone_air
 * 256gb esim_only black") into display names ("Apple iPhone Air 256GB eSIM
 * Only Black"). Idempotent: words that already contain uppercase letters pass
 * through untouched, so human-written names are not altered.
 */
export function prettifyProductName(name: string): string {
  const words = name
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(formatWord);

  // Drop immediate repeats ("apple apple_iphone_air" -> "Apple iPhone Air").
  const deduped = words.filter(
    (word, index) => index === 0 || word.toLowerCase() !== words[index - 1].toLowerCase(),
  );

  return deduped.join(" ");
}
