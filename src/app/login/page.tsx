import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-forest text-2xl text-cream shadow-[0_8px_30px_rgba(26,61,46,0.25)]">
          ⚽
        </div>
        <p className="eyebrow mb-2">Members Only</p>
        <h1 className="display text-3xl text-forest">World Cup 2026 Fantasy</h1>
        <p className="mt-2 text-sm text-charcoal/70">Predict the tournament. Beat your friends.</p>
      </div>
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
