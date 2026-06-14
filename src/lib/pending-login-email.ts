import { cookies } from "next/headers";

const PENDING_LOGIN_EMAIL = "pending_login_email";

/**
 * Set in the sign-in server action right before signIn(), so the custom
 * verify-request page can show which address the magic link was sent to.
 * Short-lived and httpOnly — the email never travels in the URL.
 */
export async function setPendingLoginEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_LOGIN_EMAIL, email, {
    maxAge: 600,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function readPendingLoginEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_LOGIN_EMAIL)?.value ?? null;
}
