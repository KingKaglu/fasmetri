// Android App Links: proves that ge.fasmetri.app is allowed to handle
// https://fasmetri.ge links, so Android opens the app without the
// "open with" chooser. Served at /.well-known/assetlinks.json by a rewrite in
// next.config.ts.
//
// ANDROID_CERT_SHA256 holds the signing certificate fingerprint(s) — comma
// separated, because Play App Signing means the upload key and the Play key
// are different certificates and both have to be listed. Read them from
// `eas credentials` or the Play Console. Unset → 404 rather than a file that
// verifies nothing.

const PACKAGE_NAME = "ge.fasmetri.app";

export async function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (!fingerprints.length) return new Response("Not found", { status: 404 });

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}
