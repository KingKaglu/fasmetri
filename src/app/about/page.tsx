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
      <div className="max-w-3xl">
        <p className="text-sm font-black text-[#0054d2]">ფასმეტრი</p>
        <h1 className="mt-2 text-4xl font-black">ჩვენ შესახებ</h1>
        <p className="mt-4 text-lg leading-8 text-[#475569]">
          ფასმეტრი გეხმარება ქართულ ონლაინ მაღაზიებში ფასების, აქციებისა და შეთავაზებების შედარებაში.
          ჩვენი მიზანია, პროდუქტის ძებნა უფრო სწრაფი, მარტივი და გამჭვირვალე გავხადოთ.
        </p>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <InfoBlock icon={ScanSearch} title="რას ვაკეთებთ" body="ერთ ხედში გაჩვენებთ სხვადასხვა მაღაზიის შეთავაზებებს, ფასებსა და განახლებებს." />
        <InfoBlock icon={BadgePercent} title="როგორ გეხმარება" body="ფასდაკლებები, მარაგის სტატუსი და ფასების შედარება უფრო სწრაფ გადაწყვეტილებას გაძლევს." />
        <InfoBlock icon={ShieldCheck} title="მნიშვნელოვანი შენიშვნა" body="შეძენამდე საბოლოო ფასი და პირობები ყოველთვის მაღაზიის გვერდზე გადაამოწმე." />
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
    <article className="rounded-lg border bg-white p-5 shadow-sm">
      <span className="grid size-11 place-items-center rounded-lg bg-[#eef5ff] text-[#0054d2]"><Icon className="size-5" /></span>
      <h2 className="mt-4 text-xl font-black">{title}</h2>
      <p className="mt-2 leading-7 text-[#64748b]">{body}</p>
    </article>
  );
}
