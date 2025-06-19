import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/app/utils/mongodb";
import User from "@/app/utils/User";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();
        const user = await User.findOne({ email: credentials?.email });
        if (user && await bcrypt.compare(credentials!.password, user.passwordHash)) {
          return { id: (user as any)._id.toString(), email: user.email, role: user.role };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.sub || '',
          email: token.email || '',
          role: token.role || 'user',
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 