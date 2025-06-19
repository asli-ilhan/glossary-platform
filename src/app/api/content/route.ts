import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, ContentModule, User, Notification } from '@/app/utils/models';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const contentType = url.searchParams.get('contentType');
    const knowledgeArea = url.searchParams.get('knowledgeArea');
    const discipline = url.searchParams.get('discipline');
    const tags = url.searchParams.get('tags');
    const showAll = url.searchParams.get('all') === 'true';
    
    // Check if user is admin to show all content
    const session = await getServerSession(authOptions);
    let isAdmin = false;
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      isAdmin = user?.role === 'admin';
    }
    
    let query: any = {};
    
    // Non-admin users only see approved content
    if (!showAll || !isAdmin) {
      query.moderationStatus = 'approved';
    }
    
    if (status) {
      query.moderationStatus = status;
    }
    
    if (contentType) {
      query.contentType = contentType;
    }
    
    if (knowledgeArea) {
      query.knowledgeArea = knowledgeArea;
    }
    
    if (discipline) {
      query.discipline = discipline;
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    const content = await ContentModule.find(query)
      .populate('createdBy', 'email profile.firstName profile.lastName')
      .populate('approvedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(content);
  } catch (error) {
    console.error('GET content error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const {
      title,
      description,
      contentType,
      mediaUrl,
      youtubeUrl,
      fileUrl,
      voiceHook,
      tags,
      knowledgeArea,
      discipline,
      relatedTools,
    } = await req.json();
    
    if (!title || !description || !contentType || !knowledgeArea || !discipline) {
      return NextResponse.json({ 
        error: 'Title, description, contentType, knowledgeArea, and discipline are required' 
      }, { status: 400 });
    }
    
    const contentModule = new ContentModule({
      title,
      description,
      contentType,
      mediaUrl,
      youtubeUrl,
      fileUrl,
      voiceHook,
      tags: tags || [],
      knowledgeArea,
      discipline,
      relatedTools: relatedTools || [],
      createdBy: (user as any)._id,
      moderationStatus: 'pending',
    });
    
    await contentModule.save();
    
    // Notify admins about new content submission
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: (admin as any)._id,
      type: 'new_content',
      title: 'New Content Submitted',
      message: `"${contentModule.title}" has been submitted for review by ${user.email}`,
      actionUrl: `/admin/dashboard?tab=content&contentId=${contentModule._id}`,
      relatedItemType: 'content',
      relatedItemId: contentModule._id,
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    return NextResponse.json(contentModule, { status: 201 });
  } catch (error) {
    console.error('POST content error:', error);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing content ID' }, { status: 400 });
    }
    
    const payload = await req.json();
    const content = await ContentModule.findById(id).populate('createdBy', 'email');
    
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    // Only admin or owner can edit
    if (user.role !== 'admin' && content.createdBy._id.toString() !== (user as any)._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update content fields
    if (payload.title) content.title = payload.title;
    if (payload.description) content.description = payload.description;
    if (payload.tags) content.tags = payload.tags;
    if (payload.relatedTools) content.relatedTools = payload.relatedTools;
    
    // Handle moderation (admin only)
    if (typeof payload.moderationStatus === 'string' && user.role === 'admin') {
      const oldStatus = content.moderationStatus;
      content.moderationStatus = payload.moderationStatus;
      
      if (payload.moderationStatus === 'approved') {
        content.approvedBy = (user as any)._id;
      }
      
      if (payload.moderationNotes) {
        content.moderationNotes = payload.moderationNotes;
      }
      
      // Create notification for content author
      if (oldStatus !== payload.moderationStatus) {
        const notificationType = payload.moderationStatus === 'approved' ? 'content_approved' : 'content_rejected';
        const notificationTitle = payload.moderationStatus === 'approved' ? 'Content Approved' : 'Content Rejected';
        const notificationMessage = payload.moderationStatus === 'approved' 
          ? `Your content "${content.title}" has been approved and is now live!`
          : `Your content "${content.title}" has been rejected. ${payload.moderationNotes || ''}`;
        
        await new Notification({
          userId: content.createdBy._id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          actionUrl: payload.moderationStatus === 'approved' ? `/content/${content._id}` : '/content',
          relatedItemType: 'content',
          relatedItemId: content._id,
        }).save();
      }
    }
    
    await content.save();
    
    return NextResponse.json({ message: 'Content updated successfully', content });
  } catch (error) {
    console.error('PATCH content error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing content ID' }, { status: 400 });
    }
    
    const content = await ContentModule.findById(id);
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    // Only admin or owner can delete
    if (user.role !== 'admin' && content.createdBy.toString() !== (user as any)._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await content.deleteOne();
    
    return NextResponse.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('DELETE content error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
} 