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
          <p className="eyebrow text-[#65a30d]">კავშირი</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">კონტაქტი</h1>
          <p className="mt-3 text-base leading-7 text-[#475569]">
            მოგვწერე მაღაზიის დამატების, ფასის შესწორების ან თანამშრომლობის საკითხზე.
            შეტყობინებას მიუთითე პროდუქტის ან მაღაზიის ბმულიც, თუ გაქვს.
          </p>
          <a
            href="mailto:hello@sazoge.ge"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#0f172a] hover:border-[#0f172a]"
          >
            <Mail className="size-4 text-[#65a30d]" />
            hello@sazoge.ge
          </a>
          <p className="mt-3 text-xs leading-5 text-[#64748b]">ფორმის გაგზავნა მალე დაემატება. მანამდე — ელფოსტაზე.</p>
        </div>

        <form className="surface-flat p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-[#e2e8f0] pb-3">
            <span className="grid size-9 place-items-center rounded-md bg-[#0f172a] text-[#84cc16]">
              <MessageSquareText className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-[#0f172a]">მოგვწერე</h2>
              <p className="text-xs text-[#64748b]">შეავსე მოკლე შეტყობინება.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <textarea disabled className="contact-control min-h-32 resize-y py-2" placeholder="დაწერე დეტალები..." />
          </Field>
          <button type="button" disabled className="mt-1 h-11 w-full rounded-md bg-[#0f172a] px-4 text-sm font-bold text-white opacity-60 sm:w-auto">
            გაგზავნა
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-[11px] font-black uppercase tracking-wider text-[#64748b]">
      {label}
      <span className="mt-1 block text-sm font-medium text-[#0f172a] normal-case tracking-normal">{children}</span>
    </label>
  );
}
