import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
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
  role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
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

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 