/**
 * Model extraction for the gaming category, shared by the Zoommer, EE and
 * PCShop console syncs.
 *
 * This used to be a copy-pasted if/else chain in each sync that tested the
 * console family FIRST. Because every accessory names the platform it plugs
 * into, that ordering filed the whole accessory shelf as the console itself:
 *
 *   "Sony PlayStation 5 DualSense Wireless Purple"        -> "PlayStation 5"
 *   "Razer Quick Charging Black Stand for PlayStation 5"  -> "PlayStation 5"
 *   "Sony Playstation 5 Dualsense Charging Station"       -> "PlayStation 5"
 *
 * The matcher then saw dozens of unrelated products all claiming to be the
 * same console, refused to auto-merge any of them (correctly — merging a
 * Razer stand with a console is worse than not merging), and the entire
 * gaming category ended up with zero cross-shop comparisons.
 *
 * The rule that fixes it: a title that merely MENTIONS a platform is not that
 * platform. Naming a thing and being compatible with it are different claims,
 * and only the head noun of the title says which one is being made.
 */

/** Accessory product lines — things with a name of their own. */
const ACCESSORY_MODELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bdualsense\s+edge\b/i, "DualSense Edge"],
  [/\bdualsense\b/i, "DualSense"],
  [/\bdualshock\b/i, "DualShock 4"],
  [/\bplaystation\s+portal\b|\bps\s*portal\b/i, "PlayStation Portal"],
  [/\bps\s*vr\s*2\b|\bpsvr\s*2\b|\bplaystation\s+vr\s*2\b/i, "PlayStation VR2"],
  [/\bpulse\s+elite\b/i, "Pulse Elite"],
  [/\bpulse\s+explore\b/i, "Pulse Explore"],
  [/\bpulse\s+3d\b/i, "Pulse 3D"],
  [/\baccess\s+controller\b/i, "Access Controller"],
  [/\belite\s+series\s*2\b/i, "Xbox Elite Series 2"],
  [/\bjoy-?con\b/i, "Joy-Con"],
  [/\bpro\s+controller\b/i, "Pro Controller"],
];

/**
 * Console families, kept separate from the variant words below because real
 * titles interleave them — "Playstation 5 Console Slim CD Version" never puts
 * "slim" next to the "5", so matching a fixed "playstation 5 slim" phrase
 * missed the Slim entirely and filed it as a plain PlayStation 5.
 */
const CONSOLE_FAMILIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bps5\b|\bplaystation\s*5\b/i, "PlayStation 5"],
  [/\bps4\b|\bplaystation\s*4\b/i, "PlayStation 4"],
  [/\bxbox\s+series\s*x\b/i, "Xbox Series X"],
  [/\bxbox\s+series\s*s\b/i, "Xbox Series S"],
  [/\bxbox\s+one\b/i, "Xbox One"],
  [/\bnintendo\s+switch\s*2\b|\bswitch\s*2\b/i, "Nintendo Switch 2"],
  [/\bnintendo\s+switch\b|\bswitch\b/i, "Nintendo Switch"],
];

/**
 * Variant words, matched anywhere in the title. `pro` excludes Nintendo's Pro
 * Controller, which would otherwise turn a gamepad into a console variant.
 */
const CONSOLE_VARIANTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bslim\b/i, "Slim"],
  [/\bpro\b(?!\s+controller)/i, "Pro"],
  [/\boled\b/i, "OLED"],
  [/\blite\b/i, "Lite"],
];

/**
 * Nouns for a thing that exists to serve another product: a stand for a
 * console, a charger for a controller. When one of these is in the title the
 * model named is what the item is FOR, never what it IS — so no model is
 * claimed at all rather than a wrong one.
 */
const COMPANION_NOUNS =
  /\b(stand|station|dock|docking|charger|charging|cover|case|skin|sticker|faceplate|mount|holder|bag|cable|adapter|protector|grip|storage\s+expansion|memory\s+card|cooling|fan)\b/i;

/**
 * Nouns that make a title an accessory rather than a console unit, without
 * saying it serves some other product (a controller is its own product).
 */
const ACCESSORY_NOUNS =
  /\b(controller|gamepad|headset|headphone|earbuds|camera|remote|steering\s+wheel|racing\s+wheel|keyboard|mouse|vr|battery)\b/i;

/**
 * Markers that a title describes a console unit. A console bundle happily
 * lists the controllers in the box ("PS5 Slim CD Version Two DualSense"), so
 * these have to outrank the accessory names that appear alongside them.
 *
 * Deliberately no bare "pro" here: "Pro Controller" would match it and a
 * Nintendo gamepad would be promoted back into a console.
 */
const CONSOLE_MARKERS =
  /\b(console|კონსოლი|slim|digital\s+edition|disc\s+edition|disc\s+version|cd\s+version|blu-?ray|bundle)\b/i;

/**
 * "X for PlayStation 5" states compatibility, not identity — the item is for
 * the platform, so it is not the platform. This is the rule that keeps the
 * shelf of games and third-party hardware out of the consoles:
 *
 *   Cyberpunk 2077 for PS4
 *   Thrustmaster T300 RS GT Edition for PS4/PS5 Black
 *
 * Without it every game claimed to be the console it runs on, and 38 of them
 * collapsed into a single bucket that no grouping could tell apart.
 */
const FOR_PLATFORM = /\bfor\s+(?:the\s+)?(?:ps\s?\d|playstation|xbox|nintendo|switch)/iu;

/**
 * Software rather than hardware. `\bgame\b` deliberately does not match
 * "gaming", which is part of many hardware product lines.
 */
const IS_SOFTWARE = /\b(?:game|games|game\s+disc|edition\s+disc)\b/iu;

function firstMatch(text: string, table: ReadonlyArray<readonly [RegExp, string]>) {
  return table.find(([pattern]) => pattern.test(text))?.[1];
}

function consoleModel(text: string): string | undefined {
  const family = firstMatch(text, CONSOLE_FAMILIES);
  if (!family) return undefined;
  const variant = firstMatch(text, CONSOLE_VARIANTS);
  return variant ? `${family} ${variant}` : family;
}

/**
 * Returns the model this title actually names, or `undefined` when the title
 * only names something it is compatible with. `undefined` is a real answer
 * here: it keeps an unrecognised accessory out of a console's offer group,
 * which is the failure that matters.
 */
export function extractConsoleModel(title: string): string | undefined {
  const text = title.toLowerCase();
  const accessory = firstMatch(text, ACCESSORY_MODELS);
  const isConsoleUnit = CONSOLE_MARKERS.test(text);

  // Serves another product: whatever model is named is the host, not this item.
  if (COMPANION_NOUNS.test(text) && !isConsoleUnit) return undefined;

  // Compatible with a platform, or software for it — either way not the
  // hardware. A console bundle that ships a game still reads as a console
  // unit, so the marker check keeps it out of this branch.
  if ((FOR_PLATFORM.test(text) || IS_SOFTWARE.test(text)) && !isConsoleUnit) return undefined;

  // An accessory line wins over the platform it plugs into, unless the title
  // is plainly a console unit that ships the accessory in the box.
  if (accessory && !isConsoleUnit) return accessory;

  const family = consoleModel(text);
  if (family) return family;
  if (accessory) return accessory;

  // Names no model of its own but reads as an accessory — better to leave the
  // model blank than to inherit the platform's.
  if (ACCESSORY_NOUNS.test(text)) return undefined;
  return undefined;
}
