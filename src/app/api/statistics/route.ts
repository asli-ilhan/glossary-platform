import { NextResponse } from 'next/server';
import { dbConnect, User, GlossaryTerm, ContentModule } from '@/app/utils/models';

// GET - Fetch real statistics from the database
export async function GET() {
  try {
    await dbConnect();

    // Get total glossary entries submitted by contributors
    const totalGlossaryEntries = await GlossaryTerm.countDocuments();
    
    // Get count of active contributors (users who have submitted at least one glossary term or content)
    const glossaryContributors = await GlossaryTerm.distinct('userId').countDocuments();
    const contentContributors = await ContentModule.distinct('createdBy').countDocuments();
    
    // Combine and get unique contributors
    const allGlossaryContributorIds = await GlossaryTerm.distinct('userId');
    const allContentContributorIds = await ContentModule.distinct('createdBy');
    
    // Create a Set to get unique contributor IDs
    const uniqueContributorIds = new Set([
      ...allGlossaryContributorIds.map(id => id.toString()),
      ...allContentContributorIds.map(id => id.toString())
    ]);
    
    const activeContributors = uniqueContributorIds.size;
    
    // Get total approved users for additional context
    const totalUsers = await User.countDocuments();
    const approvedUsers = await User.countDocuments({ isApproved: true });
    
    // Get glossary entries by approval status
    const approvedGlossaryEntries = await GlossaryTerm.countDocuments({ approved: true });
    const pendingGlossaryEntries = await GlossaryTerm.countDocuments({ approved: false });
    
    // Get content entries count
    const totalContentEntries = await ContentModule.countDocuments();
    const approvedContentEntries = await ContentModule.countDocuments({ moderationStatus: 'approved' });
    
    return NextResponse.json({
      totalGlossaryEntries,
      approvedGlossaryEntries,
      pendingGlossaryEntries,
      totalContentEntries,
      approvedContentEntries,
      activeContributors,
      totalUsers,
      approvedUsers,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GET statistics error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
} 