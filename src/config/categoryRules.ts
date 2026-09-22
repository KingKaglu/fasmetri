// PC cooling products that share vocabulary with refrigeration but are computer components.
// Used as negativeKeywords on the refrigerators rule.
export const PC_COOLING_NEGATIVE_KEYWORDS = [
  "arctic freezer",
  "liquid freezer",
  "cpu cooler",
  "cpu cooling",
  "cpu fan",
  "liquid cooler",
  "liquid cooling",
  "water cooling",
  "aio cooler",
  "heatsink",
  "heat sink",
  "case fan",
  "fan controller",
  "thermal paste",
  "thermal compound",
  "pc cooling",
  "computer cooling",
  "zalman",
  "noctua",
  "be quiet",
  "cooler master",
  "id-cooling",
  "deep cool",
  "deepcool",
] as const;

// Products that contain "freezer" in a cooking / sports context (ice maker, cooler box).
export const COOKING_FREEZER_NEGATIVE_KEYWORDS = [
  "ice cream maker",
  "cooler bag",
  "cooler box",
  "wine cooler",
] as const;

// Accessory FORM tokens. A title that names one of these is describing a thing
// you put a device into or onto — it is never the device, no matter how loudly
// it names one. iSpace exposed the gap: "TUCANO Bag Star Black for MacBook Pro
// 16" and "SATECHI Shell Case Eco Hardshell Transparent for MacBook Pro 16"
// both scored as `laptops` off the word "macbook" and went live at 109-159 GEL
// next to 8,000 GEL machines; "Apple Smart Folio ... for iPad Pro 11" did the
// same to `tablets`.
//
// Spread into the negativeKeywords of the DEVICE rules only. Deliberately
// absent: the bare word "case" (an Apple Watch title reads "42mm Jet Black
// Aluminium Case" and would veto itself) and watch straps/bands, which the
// wearables rule claims on purpose because there is no wearable-accessories
// slug to send them to.
export const ACCESSORY_FORM_NEGATIVE_KEYWORDS = [
  "bag",
  "sleeve",
  "pouch",
  "folio",
  "smart folio",
  "shell case",
  "hardshell",
  "hard shell",
  "carrying case",
  "carry case",
  "case for",
  "cover for",
  "stand for",
  "holder for",
  "mount for",
  "grip for",
  "protective film",
  "safety glass",
  "screen film",
] as const;
