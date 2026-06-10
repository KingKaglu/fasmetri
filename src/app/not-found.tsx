import { EmptyState } from "@/components/public-ui";

export default function NotFound() {
  return (
    <section className="shell py-12 sm:py-16">
      <h1 className="sr-only">გვერდი ვერ მოიძებნა</h1>
      <EmptyState
        title="გვერდი ვერ მოიძებნა"
        description="ეს გვერდი არ არსებობს ან გადატანილია. სცადე ძებნა ან დაბრუნდი მთავარ გვერდზე."
        href="/"
        action="მთავარ გვერდზე დაბრუნება"
      />
    </section>
  );
}
