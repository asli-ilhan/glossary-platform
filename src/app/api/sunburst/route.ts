import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// Fallback demo data for when MongoDB is not available
const demoSunburstData = [
  {
    _id: 'demo-1',
    themeCluster: 'AI & Machine Learning',
    knowledgeArea: 'Computer Vision',
    discipline: 'Computer Science',
    roleSystemOrientation: 'AI Developer',
    toolTechnology: 'TensorFlow.js',
    description: 'Machine learning library for JavaScript',
    voiceHook: 'Bring AI to the browser with TensorFlow.js',
    relatedContent: [
      {
        _id: 'content-1',
        title: 'Getting Started with TensorFlow.js',
        contentType: 'video',
        moderationStatus: 'approved',
        description: 'Learn the basics of machine learning in the browser',
        youtubeUrl: 'https://youtube.com/watch?v=example',
        tags: ['javascript', 'ai', 'tutorial']
      },
      {
        _id: 'content-2',
        title: 'Image Classification Tutorial',
        contentType: 'interactive',
        moderationStatus: 'approved',
        description: 'Build your first image classifier',
        tags: ['computer-vision', 'classification']
      }
    ],
    position: { level: 5, order: 1 },
    isActive: true
  },
  {
    _id: 'demo-2',
    themeCluster: 'Creative Technology',
    knowledgeArea: 'Generative Art',
    discipline: 'Digital Arts',
    roleSystemOrientation: 'Creative Coder',
    toolTechnology: 'p5.js',
    description: 'JavaScript library for creative coding',
    voiceHook: 'Make art with code using p5.js',
    relatedContent: [
      {
        _id: 'content-3',
        title: 'Introduction to p5.js',
        contentType: 'video',
        moderationStatus: 'approved',
        description: 'Learn creative coding fundamentals',
        youtubeUrl: 'https://youtube.com/watch?v=example2',
        tags: ['creative-coding', 'javascript', 'art']
      },
      {
        _id: 'content-4',
        title: 'Generative Art Patterns',
        contentType: 'document',
        moderationStatus: 'approved',
        description: 'Explore algorithmic art creation',
        tags: ['generative-art', 'patterns']
      },
      {
        _id: 'content-5',
        title: 'Interactive Animations',
        contentType: 'interactive',
        moderationStatus: 'approved',
        description: 'Create responsive visual experiences',
        tags: ['animation', 'interaction']
      }
    ],
    position: { level: 5, order: 2 },
    isActive: true
  },
  {
    _id: 'demo-3',
    themeCluster: 'Data Visualization',
    knowledgeArea: 'Information Design',
    discipline: 'Data Science',
    roleSystemOrientation: 'Data Analyst',
    toolTechnology: 'D3.js',
    description: 'Data-driven documents library',
    voiceHook: 'Transform data into compelling visuals',
    relatedContent: [
      {
        _id: 'content-6',
        title: 'D3.js Fundamentals',
        contentType: 'video',
        moderationStatus: 'approved',
        description: 'Master data visualization basics',
        tags: ['data-viz', 'javascript', 'd3']
      }
    ],
    position: { level: 5, order: 3 },
    isActive: true
  },
  {
    _id: 'demo-4',
    themeCluster: 'Audio Technology',
    knowledgeArea: 'Sound Design',
    discipline: 'Music Technology',
    roleSystemOrientation: 'Audio Developer',
    toolTechnology: 'Sonic Pi',
    description: 'Live coding music synthesizer',
    voiceHook: 'Code music in real-time with Sonic Pi',
    relatedContent: [
      {
        _id: 'content-7',
        title: 'Live Coding Music',
        contentType: 'audio',
        moderationStatus: 'approved',
        description: 'Create beats and melodies with code',
        tags: ['live-coding', 'music', 'audio']
      },
      {
        _id: 'content-8',
        title: 'Algorithmic Composition',
        contentType: 'document',
        moderationStatus: 'approved',
        description: 'Explore computational music creation',
        tags: ['composition', 'algorithms']
      }
    ],
    position: { level: 5, order: 4 },
    isActive: true
  },
  {
    _id: 'demo-5',
    themeCluster: 'Web Development',
    knowledgeArea: 'Frontend Frameworks',
    discipline: 'Software Engineering',
    roleSystemOrientation: 'Frontend Developer',
    toolTechnology: 'React',
    description: 'JavaScript library for building user interfaces',
    voiceHook: 'Build interactive UIs with React',
    relatedContent: [],
    position: { level: 5, order: 5 },
    isActive: true
  },
  // Add more levels for hierarchy
  {
    _id: 'demo-6',
    themeCluster: 'AI & Machine Learning',
    knowledgeArea: 'Computer Vision',
    discipline: 'Computer Science',
    roleSystemOrientation: 'AI Developer',
    toolTechnology: '',
    description: 'Role focused on AI development',
    position: { level: 4, order: 1 },
    isActive: true
  },
  {
    _id: 'demo-7',
    themeCluster: 'Creative Technology',
    knowledgeArea: 'Generative Art',
    discipline: 'Digital Arts',
    roleSystemOrientation: '',
    toolTechnology: '',
    description: 'Academic field of digital arts',
    position: { level: 3, order: 1 },
    isActive: true
  },
  {
    _id: 'demo-8',
    themeCluster: 'AI & Machine Learning',
    knowledgeArea: 'Computer Vision',
    discipline: '',
    roleSystemOrientation: '',
    toolTechnology: '',
    description: 'Computer vision and image processing',
    position: { level: 2, order: 1 },
    isActive: true
  },
  {
    _id: 'demo-9',
    themeCluster: 'AI & Machine Learning',
    knowledgeArea: '',
    discipline: '',
    roleSystemOrientation: '',
    toolTechnology: '',
    description: 'Artificial intelligence and machine learning technologies',
    position: { level: 1, order: 1 },
    isActive: true
  }
];

export async function GET(req: NextRequest) {
  try {
    // Try to connect to MongoDB first
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
    
    const sunburstData = await SunburstMap.find(query)
      .populate('relatedContent', 'title contentType moderationStatus')
      .populate('createdBy', 'email profile.firstName profile.lastName')
      .sort({ 'position.level': 1, 'position.order': 1 });
    
    return NextResponse.json(sunburstData);
  } catch (error) {
    console.error('MongoDB connection failed, using demo data:', error);
    
    // If MongoDB fails, return demo data
    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    
    let filteredData = demoSunburstData;
    
    if (!includeInactive) {
      filteredData = filteredData.filter(item => item.isActive);
    }
    
    if (level) {
      filteredData = filteredData.filter(item => item.position.level === parseInt(level));
    }
    
    return NextResponse.json(filteredData);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Try MongoDB connection
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
    return NextResponse.json({ error: 'Demo mode: Cannot create entries without database' }, { status: 503 });
  }
} 