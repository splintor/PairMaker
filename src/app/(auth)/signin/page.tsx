import { signIn } from "@/lib/auth";

const googleEnabled = !!process.env.AUTH_GOOGLE_ID;
const emailEnabled = !!process.env.EMAIL_SERVER_HOST;

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-brand-700 text-center">💞 PairMaker</h1>
        <p className="text-center text-sm text-brand-600 mt-1 mb-6">כניסה למערכת</p>

        {googleEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/app" });
            }}
          >
            <button className="w-full rounded-lg bg-white border border-brand-200 py-2.5 font-medium text-brand-700 hover:bg-brand-50">
              התחברות עם Google
            </button>
          </form>
        )}

        {googleEnabled && emailEnabled && (
          <div className="my-4 text-center text-xs text-slate-400">או</div>
        )}

        {emailEnabled && (
          <form
            action={async (fd: FormData) => {
              "use server";
              await signIn("nodemailer", { email: String(fd.get("email")), redirectTo: "/app" });
            }}
            className="space-y-2"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="האימייל שלך"
              className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start"
            />
            <button className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600">
              שליחת קישור כניסה
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
