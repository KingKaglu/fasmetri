import { Metadata } from "next";
import { Mail } from "lucide-react";
import { ContactMailForm } from "@/components/contact-mail-form";

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
          <p className="mt-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm leading-6 text-[#475569]">
            <strong className="text-[#0f172a]">მაღაზიის წარმომადგენელი ხარ?</strong> თუ გსურს შენი
            მაღაზიის მონაცემების შესწორება ან საჯარო კატალოგიდან ამოღება (takedown), მოგვწერე — დროულად
            დავამუშავებთ მოთხოვნას.
          </p>
          {/* TODO: point this at a real, monitored Fasmetri inbox once the
              fasmetri.ge (or chosen domain) mailbox is provisioned. */}
          <a
            href="mailto:hello@fasmetri.ge"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-bold text-[#0f172a] hover:border-[#0f172a]"
          >
            <Mail className="size-4 text-[#65a30d]" />
            hello@fasmetri.ge
          </a>
          <p className="mt-3 text-xs leading-5 text-[#64748b]">
            ფორმა წერილს შენს ელფოსტის აპში ამზადებს. გაგზავნამდე ტექსტის გადახედვა შეგიძლია.
          </p>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">
            საკონტაქტო ელფოსტაზე მიღებული ინფორმაცია გამოიყენება მხოლოდ პასუხისთვის და მოთხოვნის დასამუშავებლად.
          </p>
        </div>

        <ContactMailForm />
      </div>
    </section>
  );
}
