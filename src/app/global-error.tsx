"use client";

// error.tsx only catches failures below the root layout. When the layout
// itself throws there is no shell to render into, and the visitor gets a blank
// page. This boundary supplies its own <html>/<body>, so the worst case is a
// plain Georgian apology with a retry rather than nothing at all. Deliberately
// styleless — it must not depend on the stylesheet that may be what failed.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ka">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f5f7",
          color: "#0a0a0a",
          fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>ფასმეტრი</p>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>რაღაც შეფერხდა</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "#475569", margin: "0 0 24px" }}>
            გვერდის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა — ფასები ადგილზეა.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#0a0a0a",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ხელახლა ცდა
          </button>
        </div>
      </body>
    </html>
  );
}
