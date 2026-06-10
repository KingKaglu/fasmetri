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
        <p className="eyebrow">ფასის შეტყობინება</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">შეტყობინების გაუქმება</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          უსაფრთხოებისთვის შეიყვანე იგივე ელფოსტა, რომლითაც ფასის შეტყობინება დააყენე.
        </p>
        <p className="mt-2 text-xs leading-5 text-gray-400">
          ელფოსტა გამოიყენება მხოლოდ შესაბამისი ფასის შეტყობინების პოვნისა და გაუქმებისთვის.
        </p>
      </div>
      <AlertUnsubscribeForm alertId={alertId} />
    </section>
  );
}
