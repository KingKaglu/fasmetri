import assert from "node:assert/strict";
import { isSafePushEndpoint } from "../src/lib/request-ip";

// The alert job POSTs to whatever endpoint a browser registered, so anything
// that is not a public HTTPS push service must be refused.
const cases: Array<[string, boolean]> = [
  ["https://fcm.googleapis.com/fcm/send/abc:APA91b", true],
  ["https://updates.push.services.mozilla.com/wpush/v2/gAAAA", true],
  ["https://web.push.apple.com/QGuQyavXutnMH", true],
  ["https://wns2-db5p.notify.windows.com/w/?token=BQYAAA", true],
  ["http://fcm.googleapis.com/fcm/send/abc", false],
  ["https://localhost/push", false],
  ["https://127.0.0.1/push", false],
  ["https://2130706433/push", false],
  ["https://169.254.169.254/latest/meta-data/", false],
  ["https://10.0.0.5/push", false],
  ["https://192.168.1.10:8443/push", false],
  ["https://[::1]/push", false],
  ["https://[::ffff:127.0.0.1]/push", false],
  ["https://intranet/push", false],
  ["https://user:pass@fcm.googleapis.com/fcm/send/abc", false],
  ["file:///etc/passwd", false],
  ["not a url", false],
];

for (const [endpoint, expected] of cases) {
  assert.equal(isSafePushEndpoint(endpoint), expected, `${endpoint} should be ${expected ? "accepted" : "refused"}`);
}

console.log(`push endpoint: ${cases.length}/${cases.length} checks passed`);
