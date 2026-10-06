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
          <p className="eyebrow">კავშირი</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-ink sm:text-3xl">კონტაქტი</h1>
          <p className="mt-3 text-base leading-7 text-ink-soft">
            მოგვწერე მაღაზიის დამატების, ფასის შესწორების ან თანამშრომლობის საკითხზე.
            შეტყობინებას მიუთითე პროდუქტის ან მაღაზიის ბმულიც, თუ გაქვს.
          </p>
          <p className="mt-3 rounded-md border border-line bg-surface-soft p-3 text-sm leading-6 text-ink-soft">
            <strong className="text-ink">მაღაზიის წარმომადგენელი ხარ?</strong> თუ გსურს შენი
            მაღაზიის მონაცემების შესწორება ან საჯარო კატალოგიდან ამოღება (takedown), მოგვწერე — დროულად
            დავამუშავებთ მოთხოვნას.
          </p>
          <a
            href="mailto:Fasmetri@gmail.com"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:border-line-strong hover:bg-surface-soft"
          >
            <Mail className="size-4 text-muted" />
            Fasmetri@gmail.com
          </a>
          <p className="mt-3 text-xs leading-5 text-muted">
            ფორმა წერილს შენს ელფოსტის აპში ამზადებს. გაგზავნამდე ტექსტის გადახედვა შეგიძლია.
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            საკონტაქტო ელფოსტაზე მიღებული ინფორმაცია გამოიყენება მხოლოდ პასუხისთვის და მოთხოვნის დასამუშავებლად.
          </p>
        </div>

        <ContactMailForm />
      </div>
    </section>
  );
}
