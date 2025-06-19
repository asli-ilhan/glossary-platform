import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, UserBookmark, User } from '@/app/utils/models';

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
    const itemType = url.searchParams.get('itemType');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    let query: any = { userId: user._id };
    
    if (itemType) {
      query.itemType = itemType;
    }
    
    const bookmarks = await UserBookmark.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    const totalCount = await UserBookmark.countDocuments(query);
    
    return NextResponse.json({
      bookmarks,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('GET bookmarks error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
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
    
    const { itemType, itemId, title, description, tags } = await req.json();
    
    if (!itemType || !itemId || !title) {
      return NextResponse.json({ 
        error: 'itemType, itemId, and title are required' 
      }, { status: 400 });
    }
    
    // Check if bookmark already exists
    const existingBookmark = await UserBookmark.findOne({
      userId: user._id,
      itemType,
      itemId,
    });
    
    if (existingBookmark) {
      return NextResponse.json({ 
        error: 'This item is already bookmarked' 
      }, { status: 400 });
    }
    
    const bookmark = new UserBookmark({
      userId: user._id,
      itemType,
      itemId,
      title,
      description,
      tags: tags || [],
    });
    
    await bookmark.save();
    
    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    console.error('POST bookmarks error:', error);
    return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
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
    const itemType = url.searchParams.get('itemType');
    const itemId = url.searchParams.get('itemId');
    
    let query: any = { userId: user._id };
    
    if (id) {
      query._id = id;
    } else if (itemType && itemId) {
      query.itemType = itemType;
      query.itemId = itemId;
    } else {
      return NextResponse.json({ 
        error: 'Either bookmark ID or itemType+itemId required' 
      }, { status: 400 });
    }
    
    const bookmark = await UserBookmark.findOneAndDelete(query);
    
    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('DELETE bookmarks error:', error);
    return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 });
  }
} 