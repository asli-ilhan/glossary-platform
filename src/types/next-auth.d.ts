import "next-auth";
import { JWT } from "next-auth/jwt";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: 'admin' | 'student' | 'contributor';
      isApproved: boolean;
      isBlocked: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    role: 'admin' | 'student' | 'contributor';
    isApproved: boolean;
    isBlocked: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: 'admin' | 'student' | 'contributor';
    isApproved: boolean;
    isBlocked: boolean;
  }
} 