import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUserBookmark extends Document {
  userId: Types.ObjectId;
  itemType: 'glossary' | 'content' | 'sunburst';
  itemId: Types.ObjectId;
  title: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}

const UserBookmarkSchema: Schema<IUserBookmark> = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { 
    type: String, 
    enum: ['glossary', 'content', 'sunburst'], 
    required: true 
  },
  itemId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  description: { type: String },
  tags: [{ type: String }],
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Composite index to prevent duplicate bookmarks
UserBookmarkSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
UserBookmarkSchema.index({ userId: 1, createdAt: -1 });
UserBookmarkSchema.index({ userId: 1, itemType: 1 });

const UserBookmark: Model<IUserBookmark> = mongoose.models.UserBookmark || mongoose.model<IUserBookmark>('UserBookmark', UserBookmarkSchema);

export default UserBookmark; 