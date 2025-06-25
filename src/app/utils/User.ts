import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'admin' | 'student' | 'contributor';
  isApproved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  isBlocked: boolean;
  blockedBy?: Types.ObjectId;
  blockedAt?: Date;
  blockReason?: string;
  bookmarks: Types.ObjectId[];
  notificationPreferences?: {
    emailNotifications: boolean;
    inAppNotifications: boolean;
    contentUpdates: boolean;
    moderationUpdates: boolean;
  };
  profile?: {
    firstName?: string;
    lastName?: string;
    institution?: string;
    bio?: string;
    avatarUrl?: string;
  };
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student', 'contributor'], default: 'student', required: true },
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  isBlocked: { type: Boolean, default: false },
  blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  blockedAt: { type: Date },
  blockReason: { type: String },
  bookmarks: [{ type: Schema.Types.ObjectId, ref: 'UserBookmark' }],
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true },
    contentUpdates: { type: Boolean, default: true },
    moderationUpdates: { type: Boolean, default: false }
  },
  profile: {
    firstName: { type: String },
    lastName: { type: String },
    institution: { type: String },
    bio: { type: String },
    avatarUrl: { type: String }
  },
  onboardingCompleted: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Clear the model cache if it exists to ensure we use the updated schema
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User; 