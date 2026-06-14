import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { recordLogin } from "@/lib/audit-login";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT sessions avoid a DB round-trip on every request (faster navigation).
  // The Prisma adapter still persists users/accounts/verification tokens.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google verifies email ownership, so it's safe to link a Google login to
      // an existing user with the same email (e.g. one created via magic-link).
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
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
