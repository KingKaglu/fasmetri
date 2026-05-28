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
