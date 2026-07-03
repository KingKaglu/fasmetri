import { Metadata } from "next";
import { BadgePercent, ScanSearch, ShieldCheck } from "lucide-react";
import { TrustNote } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "ჩვენ შესახებ",
  description: "გაიგე როგორ გეხმარება ფასმეტრი ქართულ ონლაინ მაღაზიებში ფასებისა და აქციების შედარებაში.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="shell py-8 sm:py-12">
      <div className="max-w-3xl border-b border-gray-100 pb-6">
        <p className="eyebrow">ფასმეტრი</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">ჩვენ შესახებ</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          ფასმეტრი გეხმარება ქართულ ონლაინ მაღაზიებში ფასების, აქციებისა და შეთავაზებების შედარებაში.
          მიზანი — პროდუქტის ძებნა უფრო სწრაფი, მარტივი და გამჭვირვალე.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <InfoBlock icon={ScanSearch} title="რას ვაკეთებთ" body="ერთ ხედში ვაჩვენებთ სხვადასხვა მაღაზიის შეთავაზებებს, ფასებსა და განახლებებს." />
        <InfoBlock icon={BadgePercent} title="როგორ გეხმარება" body="ფასდაკლებები, მარაგის სტატუსი და ფასების შედარება — სწრაფი გადაწყვეტილებისთვის." />
        <InfoBlock icon={ShieldCheck} title="მნიშვნელოვანი" body="შეძენამდე საბოლოო ფასი და პირობები ყოველთვის მაღაზიის გვერდზე გადაამოწმე." />
      </div>

      <div className="mt-6 max-w-3xl">
        <TrustNote />
      </div>
    </section>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ScanSearch;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5">
      <span className="grid size-9 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-500">
        <Icon className="size-4" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">{body}</p>
    </article>
  );
}
