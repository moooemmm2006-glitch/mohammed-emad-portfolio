import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/studio") && !next.startsWith("//") ? next : "/studio";
  return (
    <main className="min-h-dvh grid place-items-center px-4 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(600px 300px at 50% 20%, rgba(46,91,255,.22), transparent 70%)" }} />
      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Mark />
          <span className="font-semibold tracking-tight" dir="ltr">Demo Studio</span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-semibold mb-1">أهلاً يا محمد 👋</h1>
          <p className="text-fg2 text-sm mb-5">ادخل الباسورد عشان تفتح الاستوديو.</p>
          <LoginForm next={safeNext} />
        </div>
      </div>
    </main>
  );
}

function Mark() {
  return (
    <svg width="34" height="28" viewBox="0 0 40 32" aria-hidden>
      <path fill="#F4F1EA" d="M4 28V4h4l8 11 8-11h4v24h-4V11l-8 11-8-11v17zM24 4h12v4H24zM24 24h12v4H24z" />
      <path fill="#2E5BFF" d="M30 14h5v4h-5z" />
    </svg>
  );
}
