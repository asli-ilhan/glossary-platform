import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, Notification, User } from '@/app/utils/models';

export async function GET(req: NextRequest) {
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
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    let query: any = { userId: user._id };
    
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId: user._id, 
      isRead: false 
    });
    
    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
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
    const markAllRead = url.searchParams.get('markAllRead') === 'true';
    
    if (markAllRead) {
      // Mark all notifications as read for the user
      await Notification.updateMany(
        { userId: user._id, isRead: false },
        { isRead: true }
      );
      
      return NextResponse.json({ message: 'All notifications marked as read' });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('PATCH notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
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
    const deleteAll = url.searchParams.get('deleteAll') === 'true';
    
    if (deleteAll) {
      // Delete all read notifications for the user
      await Notification.deleteMany({ userId: user._id, isRead: true });
      return NextResponse.json({ message: 'All read notifications deleted' });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }
    
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('DELETE notifications error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
} 