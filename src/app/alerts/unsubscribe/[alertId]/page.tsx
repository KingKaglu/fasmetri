import { Metadata } from "next";
import { AlertUnsubscribeForm } from "@/components/alert-unsubscribe-form";

export const metadata: Metadata = {
  title: "ფასის შეტყობინების გაუქმება",
  robots: { index: false, follow: false },
};

export default async function AlertUnsubscribePage({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  return (
    <section className="shell py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-[var(--accent-strong)]">ფასის შეტყობინება</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--brand)] sm:text-4xl">შეტყობინების გაუქმება</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted)]">
          უსაფრთხოებისთვის შეიყვანე იგივე ელფოსტა, რომლითაც ფასის შეტყობინება დააყენე.
        </p>
        <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
          ელფოსტა გამოიყენება მხოლოდ შესაბამისი ფასის შეტყობინების პოვნისა და გაუქმებისთვის.
        </p>
      </div>
      <AlertUnsubscribeForm alertId={alertId} />
    </section>
  );
}
