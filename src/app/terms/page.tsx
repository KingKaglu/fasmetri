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
        <p className="eyebrow text-[#65a30d]">პირობები</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">გამოყენების პირობები</h1>

        <div className="mt-6 grid gap-6 text-sm leading-7 text-[#475569]">
          <div>
            <h2 className="text-base font-black text-[#0f172a]">სერვისის აღწერა</h2>
            <p className="mt-2">
              ფასმეტრი არის ინფორმაციული, ფასების შედარების სერვისი, რომელიც აგროვებს საჯაროდ
              ხელმისაწვდომ პროდუქტის მონაცემებს ქართული ონლაინ მაღაზიებიდან და ერთ სივრცეში აჩვენებს.
              ფასმეტრი არ ყიდის პროდუქტს.
            </p>
          </div>

          <div>
            <h2 className="text-base font-black text-[#0f172a]">ინფორმაციის სიზუსტე</h2>
            <p className="mt-2">
              ვცდილობთ მონაცემები იყოს ზუსტი და განახლებული, თუმცა ფასი და მარაგი იცვლება. ფასმეტრი არ
              იძლევა გარანტიას ინფორმაციის სისრულესა და სიზუსტეზე. საბოლოო ფასი გადაამოწმე მაღაზიის
              ოფიციალურ გვერდზე.
            </p>
          </div>

          <div>
            <h2 className="text-base font-black text-[#0f172a]">პასუხისმგებლობის შეზღუდვა</h2>
            <p className="mt-2">
              ფასმეტრი არ აგებს პასუხს მაღაზიასთან განხორციელებულ ყიდვაზე, მიწოდებაზე, გარანტიასა თუ
              დავაზე. ნებისმიერი ტრანზაქცია ხდება მაღაზიასა და მომხმარებელს შორის, მაღაზიის პირობებით.
            </p>
          </div>

          <div>
            <h2 className="text-base font-black text-[#0f172a]">ინტელექტუალური საკუთრება</h2>
            <p className="mt-2">
              მაღაზიების სახელები, ლოგოები და პროდუქტის მონაცემები ეკუთვნით შესაბამის მფლობელებს და
              გამოყენებულია მხოლოდ წყაროს იდენტიფიკაციისა და ფასების შედარების მიზნით.
            </p>
          </div>

          <div>
            <h2 className="text-base font-black text-[#0f172a]">ცვლილებები</h2>
            <p className="mt-2">
              შესაძლოა პერიოდულად განვაახლოთ ეს პირობები. განახლებული ვერსია ქვეყნდება ამ გვერდზე.
            </p>
          </div>

          <p className="text-xs text-[#64748b]">ბოლო განახლება: 2026 წელი.</p>
        </div>
      </div>
    </section>
  );
}
