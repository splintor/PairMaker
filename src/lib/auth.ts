import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { recordLogin } from "@/lib/audit-login";
import { magicLinkEmail } from "@/lib/auth-email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT sessions avoid a DB round-trip on every request (faster navigation).
  // The Prisma adapter still persists users/accounts/verification tokens.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", verifyRequest: "/signin/verify" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google verifies email ownership, so it's safe to link a Google login to
      // an existing user with the same email (e.g. one created via magic-link).
      allowDangerousEmailAccountLinking: true,
    }),
    // Provider-agnostic SMTP magic-link sender. Point the EMAIL_SERVER_* vars at
    // any SMTP service — Gmail (smtp.gmail.com) today, or Resend/SES/etc. later —
    // without code changes. See .env.example for ready-to-use settings.
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // Send our Hebrew (RTL) sign-in email instead of the English default.
      async sendVerificationRequest({ identifier, url, provider }) {
        const { subject, text, html } = magicLinkEmail(url);
        const transport = nodemailer.createTransport(provider.server);
        await transport.sendMail({ to: identifier, from: provider.from, subject, text, html });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await recordLogin({ id: user.id, name: user.name, email: user.email });
      }
    },
  },
});
