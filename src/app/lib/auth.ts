import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { dbConnect } from "@/app/utils/models";
import User from "@/app/utils/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('MISSING_CREDENTIALS');
        }

        await dbConnect();
        
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user) {
          throw new Error('INVALID_CREDENTIALS');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // Check if user is blocked
        if (user.isBlocked) {
          throw new Error('ACCOUNT_BLOCKED');
        }

        // Check if user is approved
        if (!user.isApproved) {
          throw new Error('ACCOUNT_NOT_APPROVED');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          isBlocked: user.isBlocked,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isApproved = user.isApproved;
        token.isBlocked = user.isBlocked;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.isApproved = token.isApproved as boolean;
        session.user.isBlocked = token.isBlocked as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect to signin page on auth error
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 