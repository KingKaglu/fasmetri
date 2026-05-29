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
      <div className="max-w-3xl border-b border-[#e2e8f0] pb-6">
        <p className="eyebrow text-[#65a30d]">ფასმეტრი</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">ჩვენ შესახებ</h1>
        <p className="mt-3 text-base leading-7 text-[#475569]">
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
    <article className="surface-flat p-5">
      <span className="grid size-9 place-items-center rounded-md bg-[#0f172a] text-[#84cc16]">
        <Icon className="size-4" />
      </span>
      <h2 className="mt-3 text-base font-black text-[#0f172a]">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{body}</p>
    </article>
  );
}
