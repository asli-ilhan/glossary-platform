import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Types } from 'mongoose';
import { dbConnect, GlossaryTerm, User, Notification, type IUser } from '@/app/utils/models';

// GET — Return terms with enhanced filtering
export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const showAll = url.searchParams.get('all') === 'true';
    const category = url.searchParams.get('category');
    const difficulty = url.searchParams.get('difficulty');
    const tags = url.searchParams.get('tags');
    const search = url.searchParams.get('search');
    
    // Check if user is admin to show unapproved terms
    const session = await getServerSession(authOptions);
    let isAdmin = false;
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      isAdmin = user?.role === 'admin';
    }
    
    // Build query
    let query: any = {};
    
    if (!showAll || !isAdmin) {
      query.approved = true;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const terms = await GlossaryTerm.find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .populate('approvedBy', 'email profile.firstName profile.lastName')
      .sort(search ? { score: { $meta: 'textScore' } } : { title: 1 });

    return NextResponse.json(terms);
  } catch (error) {
    console.error('GET glossary error:', error);
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
  }
}

// POST — Add a new term with enhanced fields (authenticated users only)
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

    const user = await User.findOne({ email: session.user.email }) as IUser | null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const { title, description, tags, category, difficulty, relatedTerms } = await req.json();
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    
    const lowerTitle = title.toLowerCase().trim();
    const existing = await GlossaryTerm.findOne({ title: lowerTitle });
    if (existing) {
    return NextResponse.json({ error: 'This term already exists!' }, { status: 400 });
  }

    const term = new GlossaryTerm({
      title: lowerTitle,
      description: description.trim(),
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : [],
      category: category?.trim() || undefined,
      difficulty: difficulty || undefined,
      relatedTerms: relatedTerms || [],
      approved: false,
      userId: (user as any)._id,
      viewCount: 0,
    });
    
    await term.save();
    
    // Create notification for admins about new term submission
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: (admin as any)._id,
      type: 'new_content',
      title: 'New Glossary Term Submitted',
      message: `"${term.title}" has been submitted for review by ${user.email}`,
      actionUrl: `/admin/dashboard?tab=glossary&termId=${term._id}`,
      relatedItemType: 'glossary',
      relatedItemId: term._id,
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    return NextResponse.json(term, { status: 201 });
  } catch (error) {
    console.error('POST glossary error:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
}
}

// PATCH — Update/approve a term with enhanced fields (admin or owner only)
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

  const url = new URL(req.url);
    const id = url.searchParams.get('id');
  if (!id) {
      return NextResponse.json({ error: 'Missing term ID' }, { status: 400 });
  }

  const payload = await req.json();
    const term = await GlossaryTerm.findById(id).populate('userId', 'email');
    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }
    
    // Only admin or owner can edit
    if (user.role !== 'admin' && term.userId._id.toString() !== (user as any)._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update basic fields
    if (payload.title) term.title = payload.title.toLowerCase().trim();
    if (payload.description) term.description = payload.description.trim();
    if (payload.tags) term.tags = payload.tags.map((tag: string) => tag.trim()).filter(Boolean);
    if (payload.category !== undefined) term.category = payload.category?.trim() || undefined;
    if (payload.difficulty) term.difficulty = payload.difficulty;
    if (payload.relatedTerms) term.relatedTerms = payload.relatedTerms;
    
    // Handle approval/moderation (admin only)
    if (typeof payload.approved === 'boolean') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin can approve terms' }, { status: 403 });
      }
      
      const wasApproved = term.approved;
      term.approved = payload.approved;

      if (payload.approved) {
        term.approvedBy = (user as any)._id;
      }
      
      if (payload.moderationNotes !== undefined) {
        term.moderationNotes = payload.moderationNotes;
      }
      
      // Create notification for term author about approval status
      if (!wasApproved && payload.approved) {
        await new Notification({
          userId: term.userId._id,
          type: 'content_approved',
          title: 'Glossary Term Approved',
          message: `Your term "${term.title}" has been approved and is now live!`,
          actionUrl: `/glossary?search=${encodeURIComponent(term.title)}`,
          relatedItemType: 'glossary',
          relatedItemId: term._id,
        }).save();
      } else if (wasApproved && !payload.approved) {
        await new Notification({
          userId: term.userId._id,
          type: 'content_rejected',
          title: 'Glossary Term Rejected',
          message: `Your term "${term.title}" has been rejected. ${payload.moderationNotes || ''}`,
          actionUrl: `/glossary`,
          relatedItemType: 'glossary',
          relatedItemId: term._id,
        }).save();
      }
    }
    
    // Increment view count if requested
    if (payload.incrementView === true) {
      term.viewCount = (term.viewCount || 0) + 1;
    }
    
    await term.save();
    
    return NextResponse.json({ message: 'Updated successfully', term }, { status: 200 });
  } catch (error) {
    console.error('PATCH glossary error:', error);
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
}
}

// DELETE — Only admin or owner can delete
export async function DELETE(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; email: string; role: string } | undefined;
  if (!user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing term ID' }, { status: 400 });
  }
  const term = await GlossaryTerm.findById(id);
  if (!term) {
    return NextResponse.json({ error: 'Term not found' }, { status: 404 });
  }
  // Only admin or owner can delete
  if (
    user.role !== 'admin' &&
    term.userId.toString() !== user.id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await term.deleteOne();
  return NextResponse.json({ message: 'Term deleted successfully' }, { status: 200 });
}

