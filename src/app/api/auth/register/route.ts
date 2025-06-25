import { NextResponse } from "next/server";
import dbConnect from "@/app/utils/mongodb";
import User from "@/app/utils/User";
import AdminSettings from "@/app/utils/AdminSettings";
import bcrypt from "bcrypt";

// Allowed admin email addresses
const ALLOWED_ADMIN_EMAILS = [
  'a.ilhan@arts.ac.uk',
  'c.yuksel@arts.ac.uk'
];

export async function POST(req: Request) {
  await dbConnect();
  const { email, password, role } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
  }

  // Check admin settings first
  const adminSettings = await AdminSettings.findOne();
  
  // Check if registration is globally disabled
  if (adminSettings && !adminSettings.registrationEnabled) {
    return NextResponse.json({ 
      error: "New registrations are currently disabled. Please try again later or contact an administrator." 
    }, { status: 403 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailDomain = normalizedEmail.split('@')[1];

  // Check if email is blocked
  if (adminSettings?.blockedEmails.includes(normalizedEmail)) {
    return NextResponse.json({ 
      error: "This email address is not permitted to register." 
    }, { status: 403 });
  }

  // Check if domain is blocked
  if (adminSettings?.blockedDomains.includes(emailDomain)) {
    return NextResponse.json({ 
      error: "Email addresses from this domain are not permitted to register." 
    }, { status: 403 });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  // Validate role
  const validRoles = ['admin', 'student', 'contributor'];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  // Restrict admin registration to specific emails
  if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)) {
    return NextResponse.json({ 
      error: "Admin registration is restricted to authorised email addresses only" 
    }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  // Determine approval status based on role
  let isApproved = false;
  let userRole = role || 'student';
  
  // Admins are auto-approved if they have authorized email
  if (userRole === 'admin' && ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)) {
    isApproved = true;
  }
  
  // Students and contributors need admin approval
  if (userRole === 'student' || userRole === 'contributor') {
    isApproved = false;
  }

  const user = new User({ 
    email: normalizedEmail, 
    passwordHash, 
    role: userRole,
    isApproved,
    isBlocked: false // Ensure new users aren't blocked by default
  });
  
  await user.save();

  // Different response messages based on approval status
  if (isApproved) {
    return NextResponse.json({ 
      message: "Registration successful! You can now sign in." 
    }, { status: 201 });
  } else {
    return NextResponse.json({ 
      message: "Registration successful! Your account is pending admin approval. You will be notified once approved." 
    }, { status: 201 });
  }
} 