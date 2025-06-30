import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, SunburstMap, ContentModule } from '@/app/utils/models';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Fetch sunburst data with populated related content
    const sunburstData = await SunburstMap.find({ isActive: true })
      .populate({
        path: 'relatedContent',
        model: ContentModule,
        match: { moderationStatus: 'approved' },
        select: 'title description contentType youtubeUrl mediaUrl fileUrl voiceHook tags moderationStatus'
      })
      .sort({ 'position.level': 1, 'position.order': 1 })
      .lean();

    // Transform the data to include inequality information
    const transformedData = sunburstData.map(item => ({
      _id: item._id,
      themeCluster: item.themeCluster,
      knowledgeArea: item.knowledgeArea,
      discipline: item.discipline,
      roleSystemOrientation: item.roleSystemOrientation,
      toolTechnology: item.toolTechnology,
      inequality: item.inequality, // Include inequality data
      description: item.description,
      voiceHook: item.voiceHook,
      position: item.position,
      isActive: item.isActive,
      relatedContent: item.relatedContent || [],
      guestSpeaker: item.guestSpeaker
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching sunburst data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sunburst data' }, 
      { status: 500 }
    );
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