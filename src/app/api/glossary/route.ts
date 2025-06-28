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
    let currentUserId = null;
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      isAdmin = user?.role === 'admin';
      currentUserId = user?._id;
    }
    
    // Build query
    let query: any = {};
    
    if (!showAll || !isAdmin) {
      // Show approved terms OR user's own unapproved terms
      if (currentUserId) {
        query.$or = [
          { approved: true },
          { userId: currentUserId, approved: false }
        ];
      } else {
        query.approved = true;
      }
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

    // Check if user is approved (students and contributors need approval)
    if ((user.role === 'student' || user.role === 'contributor') && !user.isApproved) {
      return NextResponse.json({ 
        error: 'Your account is pending admin approval. Please wait for approval before submitting content.' 
      }, { status: 403 });
    }
    
    const { title, description, tags, category, difficulty, relatedTerms, tag, isExpansion } = await req.json();
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }
    
    const lowerTitle = title.toLowerCase().trim();
    const existingTerms = await GlossaryTerm.find({ title: lowerTitle });
    const hasExisting = existingTerms.length > 0;
    
    // Allow multiple definitions from the same user (removed restriction)

    const term = new GlossaryTerm({
      title: lowerTitle,
      description: description.trim(),
      tags: tags ? tags.map((tag: string) => tag.trim()).filter(Boolean) : (tag ? [tag] : []),
      category: category?.trim() || tag?.replace('-', ' ') || undefined,
      difficulty: difficulty || undefined,
      relatedTerms: relatedTerms || [],
      approved: false,
      userId: (user as any)._id,
      viewCount: 0,
    });
    
    await term.save();
    
    // Create notification for admins about new term submission
    const admins = await User.find({ role: 'admin' });
    const notificationMessage = hasExisting 
      ? `"${term.title}" has been submitted for review by ${user.email} (additional definition for existing term)`
      : `"${term.title}" has been submitted for review by ${user.email}`;
      
    const notifications = admins.map(admin => ({
      userId: (admin as any)._id,
      type: 'new_content',
      title: 'New Glossary Term Submitted',
      message: notificationMessage,
      actionUrl: `/admin/dashboard?tab=glossary&termId=${term._id}`,
      relatedItemType: 'glossary',
      relatedItemId: term._id,
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    // Return success with warning if term already exists
    const response = {
      term,
      warning: hasExisting ? `This entry is awaiting moderation.` : null
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST glossary error:', error);
    return NextResponse.json({ error: 'There was a problem submitting your entry. Please try again or contact an administrator.' }, { status: 500 });
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

// PUT — Update a term (same as PATCH for consistency)
export async function PUT(req: Request) {
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
    
    await term.save();
    
    return NextResponse.json({ message: 'Updated successfully', term }, { status: 200 });
  } catch (error) {
    console.error('PUT glossary error:', error);
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

