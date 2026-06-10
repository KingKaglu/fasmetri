import { Metadata } from "next";

export const metadata: Metadata = {
  title: "კონფიდენციალურობის პოლიტიკა",
  description: "როგორ ამუშავებს ფასმეტრი მონაცემებს: ანალიტიკა, ქუქიები და გარე ლინკებზე გადასვლები.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="shell py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">კონფიდენციალურობა</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">კონფიდენციალურობის პოლიტიკა</h1>

        <div className="mt-6 grid gap-6 text-sm leading-7 text-gray-600">
          <div>
            <h2 className="text-base font-semibold text-gray-900">რა მონაცემებს ვაგროვებთ</h2>
            <p className="mt-2">
              ფასმეტრი არ ითხოვს რეგისტრაციას და არ აგროვებს სახელს, მისამართს ან გადახდის მონაცემებს.
              ვაგროვებთ მხოლოდ გამოყენების ანონიმურ მონაცემებს, რომ პლატფორმა გავაუმჯობესოთ:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>გვერდის ნახვები და მოწყობილობის ზოგადი ინფორმაცია (ანალიტიკის სერვისებით);</li>
              <li>მაღაზიის ლინკზე გადასვლები (რომელი პროდუქტი, რომელი მაღაზია, ფასი, დრო);</li>
              <li>საძიებო და ფილტრის გამოყენების ანონიმური სტატისტიკა.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">ანალიტიკა და ქუქიები</h2>
            <p className="mt-2">
              შესაძლოა გამოვიყენოთ Google Analytics, Meta Pixel და TikTok Pixel ვიზიტებისა და რეკლამის
              ეფექტიანობის გასაზომად. ეს სერვისები იყენებენ ქუქიებს. ქუქიების მართვა შეგიძლია ბრაუზერის
              პარამეტრებიდან. თუ ეს სერვისები არ არის ჩართული, საიტი მაინც სრულად მუშაობს.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">გარე ლინკები</h2>
            <p className="mt-2">
              მაღაზიის ღილაკზე დაჭერისას გადახვალ მესამე მხარის (მაღაზიის) ვებსაიტზე, რომელსაც აქვს
              საკუთარი კონფიდენციალურობის პოლიტიკა. ფასმეტრი არ აკონტროლებს და არ აგებს პასუხს მათ
              მონაცემთა დამუშავებაზე.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">მონაცემთა გამოყენება</h2>
            <p className="mt-2">
              აგრეგირებულ (არაიდენტიფიცირებად) სტატისტიკას შესაძლოა გავუზიაროთ მაღაზიებს, მაგ.
              „ფასმეტრმა ამ თვეში თქვენს პროდუქტებზე X გადასვლა გამოგიგზავნათ“. პერსონალურ მონაცემებს
              არ ვყიდით.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">კონტაქტი</h2>
            <p className="mt-2">
              შეკითხვებისთვის ან მონაცემების შესახებ მოთხოვნისთვის მოგვწერე{" "}
              <a className="font-semibold text-blue-600 hover:underline" href="/contact">კონტაქტის გვერდზე</a>.
            </p>
          </div>

          <p className="text-xs text-gray-500">ბოლო განახლება: 2026 წელი.</p>
        </div>
      </div>
    </section>
  );
}
