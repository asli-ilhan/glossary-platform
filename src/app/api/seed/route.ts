import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import {
  dbConnect,
  User,
  GlossaryTerm,
  ContentModule,
  SunburstMap,
  UserBookmark,
  Notification,
  GuestCredit,
} from '@/app/utils/models';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await GlossaryTerm.deleteMany({});
    await ContentModule.deleteMany({});
    await SunburstMap.deleteMany({});
    await UserBookmark.deleteMany({});
    await Notification.deleteMany({});
    await GuestCredit.deleteMany({});
    
    // Create users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    const users = await User.insertMany([
      {
        email: 'admin@glossary.com',
        passwordHash: adminPassword,
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          institution: 'MAI University',
          bio: 'Platform administrator'
        },
        onboardingCompleted: true,
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          contentUpdates: true,
          moderationUpdates: true
        }
      },
      {
        email: 'john.doe@student.edu',
        passwordHash: userPassword,
        role: 'user',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          institution: 'Tech University',
          bio: 'Computer Science student interested in AI and machine learning'
        },
        onboardingCompleted: false,
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          contentUpdates: true,
          moderationUpdates: false
        }
      },
      {
        email: 'sarah.wilson@researcher.org',
        passwordHash: userPassword,
        role: 'user',
        profile: {
          firstName: 'Sarah',
          lastName: 'Wilson',
          institution: 'Research Institute',
          bio: 'Data science researcher focusing on neural networks'
        },
        onboardingCompleted: true
      }
    ]);

    const adminUser = users.find(u => u.role === 'admin')!;
    const regularUser = users.find(u => u.role === 'user')!;

    // Create guest credits
    const guests = await GuestCredit.insertMany([
      {
        guestName: 'Dr. Emily Chen',
        title: 'Senior AI Researcher',
        organization: 'Stanford AI Lab',
        bio: 'Leading researcher in computer vision and deep learning with over 10 years of experience.',
        expertise: ['Computer Vision', 'Deep Learning', 'Neural Networks'],
        contactInfo: {
          email: 'emily.chen@stanford.edu',
          linkedin: 'https://linkedin.com/in/emilychen',
          website: 'https://emilychen.ai'
        },
        contributions: [],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        guestName: 'Prof. Michael Rodriguez',
        title: 'Head of Data Science',
        organization: 'Google Research',
        bio: 'Expert in machine learning algorithms and large-scale data processing systems.',
        expertise: ['Machine Learning', 'Data Engineering', 'Cloud Computing'],
        contactInfo: {
          email: 'mrodriguez@google.com',
          linkedin: 'https://linkedin.com/in/michaelrodriguez'
        },
        contributions: [],
        isActive: true,
        createdBy: adminUser._id
      }
    ]);

    // Create glossary terms
    const glossaryTerms = await GlossaryTerm.insertMany([
      {
        title: 'artificial intelligence',
        description: 'The simulation of human intelligence in machines that are programmed to think and learn like humans.',
        approved: true,
        userId: adminUser._id,
        approvedBy: adminUser._id,
        tags: ['AI', 'machine learning', 'technology'],
        category: 'Core Concepts',
        difficulty: 'intermediate',
        viewCount: 42
      },
      {
        title: 'neural network',
        description: 'A computing system inspired by biological neural networks that processes information using a connectionist approach.',
        approved: true,
        userId: regularUser._id,
        approvedBy: adminUser._id,
        tags: ['neural networks', 'deep learning', 'AI'],
        category: 'Technical',
        difficulty: 'advanced',
        viewCount: 28
      },
      {
        title: 'machine learning',
        description: 'A method of data analysis that automates analytical model building using algorithms that iteratively learn from data.',
        approved: true,
        userId: adminUser._id,
        approvedBy: adminUser._id,
        tags: ['ML', 'algorithms', 'data science'],
        category: 'Core Concepts',
        difficulty: 'beginner',
        viewCount: 67
      },
      {
        title: 'natural language processing',
        description: 'A branch of AI that helps computers understand, interpret and manipulate human language.',
        approved: false,
        userId: regularUser._id,
        tags: ['NLP', 'linguistics', 'AI'],
        category: 'Technical',
        difficulty: 'intermediate',
        viewCount: 15
      },
      {
        title: 'reinforcement learning',
        description: 'A type of machine learning where an agent learns to make decisions by performing actions and receiving rewards or penalties.',
        approved: true,
        userId: regularUser._id,
        approvedBy: adminUser._id,
        tags: ['RL', 'agent', 'rewards'],
        category: 'Advanced Topics',
        difficulty: 'advanced',
        viewCount: 33
      }
    ]);

    // Create sunburst data
    const sunburstData = await SunburstMap.insertMany([
      {
        themeCluster: 'Artificial Intelligence',
        knowledgeArea: 'Machine Learning',
        discipline: 'Computer Science',
        roleSystemOrientation: 'Data Scientist',
        toolTechnology: 'Python',
        description: 'Python programming language - the most popular tool for machine learning and data science applications.',
        voiceHook: 'Discover Python, the powerhouse language driving modern AI development.',
        guestSpeaker: {
          name: guests[0].guestName,
          title: guests[0].title,
          organization: guests[0].organization
        },
        position: {
          level: 5,
          order: 1
        },
        relatedContent: [],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        themeCluster: 'Artificial Intelligence',
        knowledgeArea: 'Machine Learning',
        discipline: 'Computer Science',
        roleSystemOrientation: 'ML Engineer',
        toolTechnology: 'TensorFlow',
        description: 'Open-source machine learning framework developed by Google for building and training neural networks.',
        voiceHook: 'TensorFlow transforms ideas into intelligent applications.',
        position: {
          level: 5,
          order: 2
        },
        relatedContent: [],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        themeCluster: 'Data Science',
        knowledgeArea: 'Data Analysis',
        discipline: 'Statistics',
        roleSystemOrientation: 'Data Analyst',
        toolTechnology: 'R',
        description: 'Statistical computing language and environment for data analysis and visualization.',
        voiceHook: 'R programming unlocks the secrets hidden in your data.',
        position: {
          level: 5,
          order: 3
        },
        relatedContent: [],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        themeCluster: 'Web Development',
        knowledgeArea: 'Frontend Development',
        discipline: 'Computer Science',
        roleSystemOrientation: 'Frontend Developer',
        toolTechnology: 'React',
        description: 'JavaScript library for building user interfaces, maintained by Facebook.',
        voiceHook: 'React makes building interactive UIs a breeze.',
        guestSpeaker: {
          name: guests[1].guestName,
          title: guests[1].title,
          organization: guests[1].organization
        },
        position: {
          level: 5,
          order: 4
        },
        relatedContent: [],
        isActive: true,
        createdBy: adminUser._id
      },
      {
        themeCluster: 'Cloud Computing',
        knowledgeArea: 'Infrastructure',
        discipline: 'Computer Science',
        roleSystemOrientation: 'DevOps Engineer',
        toolTechnology: 'AWS',
        description: 'Amazon Web Services - comprehensive cloud computing platform offering various services.',
        voiceHook: 'AWS powers the cloud infrastructure of tomorrow.',
        position: {
          level: 5,
          order: 5
        },
        relatedContent: [],
        isActive: true,
        createdBy: adminUser._id
      }
    ]);

    // Create content modules
    const contentModules = await ContentModule.insertMany([
      {
        title: 'Introduction to Machine Learning',
        description: 'A comprehensive introduction to machine learning concepts, algorithms, and practical applications.',
        contentType: 'video',
        youtubeUrl: 'https://youtube.com/watch?v=example1',
        voiceHook: 'Start your machine learning journey with this essential introduction.',
        tags: ['machine learning', 'introduction', 'algorithms'],
        knowledgeArea: 'Machine Learning',
        discipline: 'Computer Science',
        relatedTools: ['Python', 'Scikit-learn'],
        createdBy: adminUser._id,
        moderationStatus: 'approved',
        approvedBy: adminUser._id
      },
      {
        title: 'Neural Networks Deep Dive',
        description: 'Advanced exploration of neural network architectures and training techniques.',
        contentType: 'video',
        youtubeUrl: 'https://youtube.com/watch?v=example2',
        voiceHook: 'Dive deep into the fascinating world of neural networks.',
        tags: ['neural networks', 'deep learning', 'advanced'],
        knowledgeArea: 'Deep Learning',
        discipline: 'Computer Science',
        relatedTools: ['TensorFlow', 'PyTorch'],
        createdBy: regularUser._id,
        moderationStatus: 'approved',
        approvedBy: adminUser._id
      },
      {
        title: 'Data Visualization Best Practices',
        description: 'Learn how to create compelling and informative data visualizations.',
        contentType: 'document',
        fileUrl: 'https://example.com/files/data-viz-guide.pdf',
        voiceHook: 'Transform raw data into compelling visual stories.',
        tags: ['data visualization', 'charts', 'design'],
        knowledgeArea: 'Data Analysis',
        discipline: 'Statistics',
        relatedTools: ['R', 'D3.js', 'Tableau'],
        createdBy: regularUser._id,
        moderationStatus: 'pending'
      },
      {
        title: 'React Component Architecture',
        description: 'Building scalable and maintainable React applications with proper component design.',
        contentType: 'interactive',
        mediaUrl: 'https://example.com/interactive/react-components',
        voiceHook: 'Master React components for modern web development.',
        tags: ['react', 'components', 'frontend'],
        knowledgeArea: 'Frontend Development',
        discipline: 'Computer Science',
        relatedTools: ['React', 'JavaScript', 'TypeScript'],
        createdBy: adminUser._id,
        moderationStatus: 'approved',
        approvedBy: adminUser._id
      }
    ]);

    // Create bookmarks
    const johnUser = users.find(u => u.email === 'john.doe@student.edu')!;
    const bookmarks = await UserBookmark.insertMany([
      {
        userId: johnUser._id,
        itemType: 'glossary',
        itemId: glossaryTerms[0]._id,
        title: glossaryTerms[0].title,
        description: glossaryTerms[0].description,
        tags: glossaryTerms[0].tags
      },
      {
        userId: johnUser._id,
        itemType: 'glossary',
        itemId: glossaryTerms[1]._id,
        title: glossaryTerms[1].title,
        description: glossaryTerms[1].description,
        tags: glossaryTerms[1].tags
      },
      {
        userId: johnUser._id,
        itemType: 'content',
        itemId: contentModules[0]._id,
        title: contentModules[0].title,
        description: contentModules[0].description,
        tags: contentModules[0].tags
      }
    ]);

    // Create notifications
    const notifications = await Notification.insertMany([
      {
        userId: johnUser._id,
        type: 'welcome',
        title: 'Welcome to MAI Glossary!',
        message: 'Welcome to the platform! Start exploring by browsing the glossary or checking out our content modules.',
        isRead: false,
        actionUrl: '/glossary'
      },
      {
        userId: johnUser._id,
        type: 'content_approved',
        title: 'Your content has been approved!',
        message: `Your glossary term "${glossaryTerms[1].title}" has been approved and is now live!`,
        isRead: false,
        actionUrl: `/glossary?search=${encodeURIComponent(glossaryTerms[1].title)}`,
        relatedItemType: 'glossary',
        relatedItemId: glossaryTerms[1]._id
      },
      {
        userId: adminUser._id,
        type: 'new_content',
        title: 'New content awaiting review',
        message: `A new content module "${contentModules[2].title}" has been submitted for review.`,
        isRead: true,
        actionUrl: `/admin/dashboard?tab=content&contentId=${contentModules[2]._id}`,
        relatedItemType: 'content',
        relatedItemId: contentModules[2]._id
      },
      {
        userId: johnUser._id,
        type: 'system',
        title: 'Platform Update',
        message: 'New features have been added to the platform! Check out the enhanced search and filtering options.',
        isRead: false,
        actionUrl: '/glossary'
      }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        users: users.length,
        glossaryTerms: glossaryTerms.length,
        sunburstEntries: sunburstData.length,
        contentModules: contentModules.length,
        guestCredits: guests.length,
        bookmarks: bookmarks.length,
        notifications: notifications.length
      },
      credentials: {
        admin: 'admin@glossary.com / admin123',
        user: 'john.doe@student.edu / user123',
        user2: 'sarah.wilson@researcher.org / user123'
      }
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 