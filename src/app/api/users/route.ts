import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, User, Notification } from '@/app/utils/models';

// GET - Fetch users (admin only)
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'blocked', 'all'

    let query: any = {};
    
    if (status === 'pending') {
      query = { isApproved: false, isBlocked: false };
    } else if (status === 'approved') {
      query = { isApproved: true, isBlocked: false };
    } else if (status === 'blocked') {
      query = { isBlocked: true };
    }
    // 'all' or no status returns all users

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('approvedBy', 'email')
      .populate('blockedBy', 'email')
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH - Approve/reject users (admin only)
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId, action, reason } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const validActions = ['approve', 'reject', 'block', 'unblock'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from blocking themselves
    if (action === 'block' && targetUser._id.toString() === adminUser._id.toString()) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Prevent blocking other admins
    if (action === 'block' && targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot block admin users' }, { status: 400 });
    }

    let updateData: any = {};
    let notificationType: string = '';
    let notificationTitle: string = '';
    let notificationMessage: string = '';

    switch (action) {
      case 'approve':
        updateData = {
          isApproved: true,
          approvedBy: adminUser._id,
          approvedAt: new Date(),
          rejectedAt: undefined,
          rejectionReason: undefined,
        };
        notificationType = 'account_approved';
        notificationTitle = 'Account Approved';
        notificationMessage = `Your account has been approved! You can now submit glossary terms and contribute content.`;
        break;
        
      case 'reject':
        updateData = {
          isApproved: false,
          approvedBy: undefined,
          approvedAt: undefined,
          rejectedAt: new Date(),
          rejectionReason: reason || 'No reason provided',
        };
        notificationType = 'account_rejected';
        notificationTitle = 'Account Registration Rejected';
        notificationMessage = reason || 'Your account registration has been rejected. Please contact an administrator for more information.';
        break;
        
      case 'block':
        updateData = {
          isBlocked: true,
          blockedBy: adminUser._id,
          blockedAt: new Date(),
          blockReason: reason || 'No reason provided',
        };
        notificationType = 'account_blocked';
        notificationTitle = 'Account Blocked';
        notificationMessage = reason || 'Your account has been blocked. Please contact an administrator for more information.';
        break;
        
      case 'unblock':
        updateData = {
          isBlocked: false,
          blockedBy: undefined,
          blockedAt: undefined,
          blockReason: undefined,
        };
        notificationType = 'account_unblocked';
        notificationTitle = 'Account Unblocked';
        notificationMessage = 'Your account has been unblocked. You can now access the platform again.';
        break;
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Create notification for the user
    if (notificationType) {
      const notification = new Notification({
        userId: targetUser._id,
        type: notificationType as any,
        title: notificationTitle,
        message: notificationMessage,
        createdBy: adminUser._id,
      });
      await notification.save();
    }

    const actionMessages = {
      approve: 'User approved successfully',
      reject: 'User rejected successfully',
      block: 'User blocked successfully',
      unblock: 'User unblocked successfully',
    };

    return NextResponse.json({ 
      message: actionMessages[action as keyof typeof actionMessages],
      user: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        isApproved: updateData.isApproved !== undefined ? updateData.isApproved : targetUser.isApproved,
        isBlocked: updateData.isBlocked !== undefined ? updateData.isBlocked : targetUser.isBlocked,
      }
    });
  } catch (error) {
    console.error('PATCH users error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (targetUser._id.toString() === adminUser._id.toString()) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Prevent deleting other admins
    if (targetUser.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);
    
    // Delete related notifications
    await Notification.deleteMany({ userId: targetUser._id });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 