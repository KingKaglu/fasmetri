/**
 * Cases for extractConsoleModel, all drawn from titles that are actually in
 * the RawOffer table. The accessory rows are the regression: before the fix
 * every one of them extracted as the console it plugs into.
 *
 *   npm run test:consoles
 */
import { extractConsoleModel } from "../src/lib/consoleModel";

const CASES: ReadonlyArray<readonly [string, string | undefined]> = [
  // Console units — must survive the accessory rules.
  ["PLAYSTATION Playstation 5 Slim CD Version E /White", "PlayStation 5 Slim"],
  ["Sony Playstation 5 Console Slim CD Version", "PlayStation 5 Slim"],
  ["PlayStation 5 Slim Disc Version White", "PlayStation 5 Slim"],
  // A console bundle lists its controllers; it is still the console.
  ["Playstation 5 Slim CD Version E Two DualSense/White", "PlayStation 5 Slim"],
  ["Sony PlayStation 5 Digital Edition", "PlayStation 5"],
  ["Microsoft Xbox Series X Console 1TB", "Xbox Series X"],
  ["Nintendo Switch OLED Console White", "Nintendo Switch OLED"],

  // Accessories that name their platform — the whole point of the fix.
  ["Sony PlayStation 5 DualSense Wireless White", "DualSense"],
  ["Sony PlayStation 5 DualSense Wireless Starlight Blue", "DualSense"],
  ["Sony PlayStation 5 DualSense Edge Wireless Black", "DualSense Edge"],
  ["Sony PlayStation 5 Pulse 3D Wireless Headset", "Pulse 3D"],
  ["Xbox Elite Series 2 Wireless Controller", "Xbox Elite Series 2"],
  ["Nintendo Switch Pro Controller", "Pro Controller"],

  // Companion items: the model named is the host, so no model is claimed.
  ["Razer Quick Charging Black Stand for PlayStation 5", undefined],
  ["Sony Playstation 5 Dualsense Controller Charging Station", undefined],
  ["Silicone Cover for PlayStation 5 DualSense Controller", undefined],
  ["Seagate Storage Expansion Card 1TB for Xbox Series X", undefined],

  // No console vocabulary at all.
  ["EA Sports FC 26 PS5 Game Disc", "PlayStation 5"],
  ["Logitech G920 Racing Wheel", undefined],
];

let failed = 0;
for (const [title, expected] of CASES) {
  const actual = extractConsoleModel(title);
  if (actual !== expected) {
    failed += 1;
    console.log(`FAIL  ${title}\n      expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log(`${CASES.length - failed}/${CASES.length} console-model cases pass`);
if (failed) process.exitCode = 1;
