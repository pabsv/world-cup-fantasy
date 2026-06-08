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
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl shadow-[0_8px_30px_rgba(52,211,153,0.3)]">
          ⚽
        </div>
        <h1 className="text-2xl font-bold tracking-tight">World Cup 2026 Fantasy</h1>
        <p className="mt-1 text-sm text-muted">Predict the tournament. Beat your friends.</p>
      </div>
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
