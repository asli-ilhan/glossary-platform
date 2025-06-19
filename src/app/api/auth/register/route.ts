import { NextResponse } from "next/server";
import dbConnect from "@/app/utils/mongodb";
import User from "@/app/utils/User";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  await dbConnect();
  const { email, password, role } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ email, passwordHash, role: role || "user" });
  await user.save();

  return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
} 