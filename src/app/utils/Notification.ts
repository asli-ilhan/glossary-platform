import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: 'content_approved' | 'content_rejected' | 'new_content' | 'system' | 'welcome';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  relatedItemType?: 'glossary' | 'content' | 'sunburst';
  relatedItemId?: Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['content_approved', 'content_rejected', 'new_content', 'system', 'welcome'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  actionUrl: { type: String },
  relatedItemType: { 
    type: String, 
    enum: ['glossary', 'content', 'sunburst'] 
  },
  relatedItemId: { type: Schema.Types.ObjectId },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for efficient querying
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 