import { Metadata } from "next";
import { Mail, MessageSquareText } from "lucide-react";

export const metadata: Metadata = {
  title: "კონტაქტი",
  description: "დაუკავშირდი ფასმეტრს მაღაზიის დამატების, ფასის შესწორების ან თანამშრომლობის საკითხზე.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="shell py-8 sm:py-12">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,.82fr)_minmax(24rem,1fr)]">
        <div className="max-w-xl">
          <p className="text-sm font-black text-[#0054d2]">კავშირი</p>
          <h1 className="mt-2 text-4xl font-black">კონტაქტი</h1>
          <p className="mt-4 leading-8 text-[#475569]">
            მოგვწერე მაღაზიის დამატების, ფასის შესწორების ან თანამშრომლობის საკითხზე. შეტყობინებას
            გასაგებად მიუთითე პროდუქტის ან მაღაზიის ბმულიც, თუ გაქვს.
          </p>
          <a href="mailto:hello@sazoge.ge" className="mt-6 inline-flex items-center gap-2 rounded-md border bg-white px-4 py-3 font-black text-[#003f9f] shadow-sm hover:border-[#0054d2] hover:bg-[#eef5ff]">
            <Mail className="size-4" />
            hello@sazoge.ge
          </a>
          <p className="mt-4 text-sm leading-6 text-[#64748b]">ფორმის გაგზავნა მალე დაემატება. მანამდე მოგვწერე ელფოსტაზე.</p>
        </div>

        <form className="surface-shadow rounded-lg border bg-white p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-[#eef5ff] text-[#0054d2]"><MessageSquareText className="size-5" /></span>
            <div>
              <h2 className="text-xl font-black">მოგვწერე</h2>
              <p className="text-sm text-[#64748b]">შეავსე მოკლე შეტყობინება.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="სახელი"><input disabled className="contact-control" placeholder="შენი სახელი" /></Field>
            <Field label="ელფოსტა"><input disabled type="email" className="contact-control" placeholder="name@email.ge" /></Field>
          </div>
          <Field label="მიზეზი">
            <select disabled className="contact-control">
              <option>მაღაზიის დამატება</option>
              <option>ფასის შესწორება</option>
              <option>თანამშრომლობა</option>
              <option>სხვა</option>
            </select>
          </Field>
          <Field label="შეტყობინება">
            <textarea disabled className="contact-control min-h-36 resize-y py-3" placeholder="დაწერე დეტალები..." />
          </Field>
          <button type="button" disabled className="mt-2 h-11 w-full rounded-md bg-[#12203a] px-4 font-black text-white opacity-70 sm:w-auto">გაგზავნა</button>
        </form>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-4 block text-sm font-black">{label}<span className="mt-1 block font-semibold text-[#12203a]">{children}</span></label>;
}
