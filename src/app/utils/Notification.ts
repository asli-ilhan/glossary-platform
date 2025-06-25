import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: 'content_approved' | 'content_rejected' | 'new_content' | 'account_approved' | 'account_rejected' | 'account_blocked' | 'account_unblocked' | 'system_announcement';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: {
    contentId?: string;
    contentType?: string;
    userId?: string;
    [key: string]: any;
  };
  createdBy?: Types.ObjectId;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema: Schema<INotification> = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['content_approved', 'content_rejected', 'new_content', 'account_approved', 'account_rejected', 'account_blocked', 'account_unblocked', 'system_announcement'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  actionUrl: { type: String },
  metadata: {
    contentId: { type: String },
    contentType: { type: String },
    userId: { type: String },
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for efficient querying
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });

// Clear the model cache if it exists to ensure we use the updated schema
if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 