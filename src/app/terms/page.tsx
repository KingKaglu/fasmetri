import { Metadata } from "next";

export const metadata: Metadata = {
  title: "გამოყენების პირობები",
  description: "ფასმეტრის გამოყენების წესები და პირობები.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="shell py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">პირობები</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">გამოყენების პირობები</h1>

        <div className="mt-6 grid gap-6 text-sm leading-7 text-gray-600">
          <div>
            <h2 className="text-base font-semibold text-gray-900">სერვისის აღწერა</h2>
            <p className="mt-2">
              ფასმეტრი არის ინფორმაციული, ფასების შედარების სერვისი, რომელიც აგროვებს საჯაროდ
              ხელმისაწვდომ პროდუქტის მონაცემებს ქართული ონლაინ მაღაზიებიდან და ერთ სივრცეში აჩვენებს.
              ფასმეტრი არ ყიდის პროდუქტს.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">ინფორმაციის სიზუსტე</h2>
            <p className="mt-2">
              ვცდილობთ მონაცემები იყოს ზუსტი და განახლებული, თუმცა ფასი და მარაგი იცვლება. ფასმეტრი არ
              იძლევა გარანტიას ინფორმაციის სისრულესა და სიზუსტეზე. საბოლოო ფასი გადაამოწმე მაღაზიის
              ოფიციალურ გვერდზე.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">პასუხისმგებლობის შეზღუდვა</h2>
            <p className="mt-2">
              ფასმეტრი არ აგებს პასუხს მაღაზიასთან განხორციელებულ ყიდვაზე, მიწოდებაზე, გარანტიასა თუ
              დავაზე. ნებისმიერი ტრანზაქცია ხდება მაღაზიასა და მომხმარებელს შორის, მაღაზიის პირობებით.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">დამოუკიდებლობა და გარე ბმულები</h2>
            <p className="mt-2">
              ფასმეტრი დამოუკიდებელი პლატფორმაა და არ არის აფილირებული ჩამოთვლილ მაღაზიებთან. მაღაზიის
              ბმულზე გადასვლისას ტოვებ ფასმეტრს და ყიდვა ხორციელდება მაღაზიის ვებსაიტზე, მაღაზიის
              პირობებით. გარე ბმულზე გადასვლები შესაძლოა აღირიცხოს ანონიმური სტატისტიკისთვის (იხ.{" "}
              <a className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-black" href="/privacy">კონფიდენციალურობის პოლიტიკა</a>).
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">ინტელექტუალური საკუთრება</h2>
            <p className="mt-2">
              მაღაზიების სახელები, ლოგოები და პროდუქტის მონაცემები ეკუთვნით შესაბამის მფლობელებს და
              გამოყენებულია მხოლოდ წყაროს იდენტიფიკაციისა და ფასების შედარების მიზნით.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">ცვლილებები</h2>
            <p className="mt-2">
              შესაძლოა პერიოდულად განვაახლოთ ეს პირობები. განახლებული ვერსია ქვეყნდება ამ გვერდზე.
            </p>
          </div>

          <p className="text-xs text-gray-500">ბოლო განახლება: 2026 წელი.</p>
        </div>
      </div>
    </section>
  );
}
