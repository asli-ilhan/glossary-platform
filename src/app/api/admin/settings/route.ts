import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, User, AdminSettings } from '@/app/utils/models';

// GET - Fetch admin settings
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get or create admin settings
    let settings = await AdminSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = new AdminSettings({
        registrationEnabled: true,
        blockedEmails: [],
        blockedDomains: [],
        lastUpdatedBy: (user as any)._id,
      });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET admin settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT - Update admin settings
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { registrationEnabled, blockedEmails, blockedDomains } = await req.json();

    // Validate input
    if (typeof registrationEnabled !== 'boolean') {
      return NextResponse.json({ error: 'registrationEnabled must be a boolean' }, { status: 400 });
    }

    if (!Array.isArray(blockedEmails) || !Array.isArray(blockedDomains)) {
      return NextResponse.json({ error: 'blockedEmails and blockedDomains must be arrays' }, { status: 400 });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of blockedEmails) {
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json({ error: `Invalid email format: ${email}` }, { status: 400 });
      }
    }

    // Validate domain formats (basic check)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    for (const domain of blockedDomains) {
      if (typeof domain !== 'string' || !domainRegex.test(domain)) {
        return NextResponse.json({ error: `Invalid domain format: ${domain}` }, { status: 400 });
      }
    }

    // Get or create settings
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = new AdminSettings({
        registrationEnabled,
        blockedEmails: blockedEmails.map(email => email.toLowerCase()),
        blockedDomains: blockedDomains.map(domain => domain.toLowerCase()),
        lastUpdatedBy: (adminUser as any)._id,
      });
    } else {
      settings.registrationEnabled = registrationEnabled;
      settings.blockedEmails = blockedEmails.map(email => email.toLowerCase());
      settings.blockedDomains = blockedDomains.map(domain => domain.toLowerCase());
      settings.lastUpdatedBy = (adminUser as any)._id;
    }

    await settings.save();

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        registrationEnabled: settings.registrationEnabled,
        blockedEmails: settings.blockedEmails,
        blockedDomains: settings.blockedDomains,
        lastUpdatedBy: settings.lastUpdatedBy,
        updatedAt: settings.updatedAt,
      }
    });
  } catch (error) {
    console.error('PUT admin settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// POST - Add email or domain to blocklist
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { type, value } = await req.json();

    if (!['email', 'domain'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "email" or "domain"' }, { status: 400 });
    }

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'Value is required and must be a string' }, { status: 400 });
    }

    const normalizedValue = value.toLowerCase().trim();

    // Validate format
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedValue)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    } else {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
      if (!domainRegex.test(normalizedValue)) {
        return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
      }
    }

    // Get or create settings
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = new AdminSettings({
        registrationEnabled: true,
        blockedEmails: type === 'email' ? [normalizedValue] : [],
        blockedDomains: type === 'domain' ? [normalizedValue] : [],
        lastUpdatedBy: (adminUser as any)._id,
      });
    } else {
      if (type === 'email') {
        if (!settings.blockedEmails.includes(normalizedValue)) {
          settings.blockedEmails.push(normalizedValue);
        }
      } else {
        if (!settings.blockedDomains.includes(normalizedValue)) {
          settings.blockedDomains.push(normalizedValue);
        }
      }
      settings.lastUpdatedBy = (adminUser as any)._id;
    }

    await settings.save();

    return NextResponse.json({
      message: `${type} added to blocklist successfully`,
      settings: {
        registrationEnabled: settings.registrationEnabled,
        blockedEmails: settings.blockedEmails,
        blockedDomains: settings.blockedDomains,
      }
    });
  } catch (error) {
    console.error('POST admin settings error:', error);
    return NextResponse.json({ error: 'Failed to add to blocklist' }, { status: 500 });
  }
} 