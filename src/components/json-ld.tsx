import { Fragment } from "react";

type JsonLdGraph = Record<string, unknown>;

/**
 * Server-rendered JSON-LD structured data. Pass a single schema.org object or an
 * array of them; each is emitted as its own <script type="application/ld+json">.
 * Strictly additive — renders no visible markup.
 */
export function JsonLd({ data }: { data: JsonLdGraph | JsonLdGraph[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <Fragment>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          // Escape `<` to < so scraped product names containing "</script>"
          // or "<!--" can't break out of the script element (JSON-LD injection).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </Fragment>
  );
}
