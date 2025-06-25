import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB and fetch real CSV data
    const { dbConnect, SunburstMap } = await import('@/app/utils/models');
    await dbConnect();
    
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    
    let query: any = {};
    
    if (!includeInactive) {
      query.isActive = true;
    }
    
    if (level) {
      query['position.level'] = parseInt(level);
    }
    
    // Fetch data from MongoDB with populated related content
    const sunburstData = await SunburstMap.find(query)
      .populate('relatedContent', 'title contentType moderationStatus description youtubeUrl mediaUrl fileUrl tags')
      .populate('createdBy', 'email profile.firstName profile.lastName')
      .sort({ 'position.level': 1, 'position.order': 1 });
    
    console.log('Fetched sunburst data from database:', sunburstData.length, 'items');
    console.log('Sample item with content:', sunburstData.find(item => item.relatedContent?.length > 0));
    
    return NextResponse.json(sunburstData);
  } catch (error) {
    console.error('Database connection failed:', error);
    return NextResponse.json({ error: 'Failed to fetch sunburst data from database' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Connect to MongoDB
    const { dbConnect, SunburstMap, User } = await import('@/app/utils/models');
    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const {
      themeCluster,
      knowledgeArea,
      discipline,
      roleSystemOrientation,
      toolTechnology,
      description,
      voiceHook,
      position,
    } = await req.json();
    
    const sunburstEntry = new SunburstMap({
      themeCluster,
      knowledgeArea,
      discipline,
      roleSystemOrientation,
      toolTechnology,
      description,
      voiceHook,
      position,
      relatedContent: [],
      isActive: true,
      createdBy: (user as any)._id,
    });
    
    await sunburstEntry.save();
    
    return NextResponse.json(sunburstEntry, { status: 201 });
  } catch (error) {
    console.error('POST sunburst error:', error);
    return NextResponse.json({ error: 'Failed to create sunburst entry' }, { status: 500 });
  }
} 