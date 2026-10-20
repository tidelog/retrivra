import { createHash } from "node:crypto";
import { allow } from "@/server/rate-limit";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getDatabase } from "@/server/database/client";
import { verifyPassword, hashPassword } from "@/server/password";
const input = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(12).max(128) });
const dummy = hashPassword("synthetic-timing-equalization");
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, async authorize(raw) {
    const parsed = input.safeParse(raw);
    if (!parsed.success) return null;
    if (!await allow("login:" + createHash("sha256").update(parsed.data.email).digest("hex"), 20)) return null;
    const user = await getDatabase().user.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? await dummy);
    return user && valid ? { id: user.id, email: user.email } : null;
  } })],
  callbacks: {
    jwt({ token, user }) { if (user) token.sub = user.id; return token; },
    session({ session, token }) { if (token.sub) session.user.id = token.sub; return session; },
  },
};
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
 const secret = process.env.AUTH_SECRET;
 if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
 return { ...authConfig, secret };
});
