import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGuestCredit extends Document {
  guestName: string;
  title: string;
  organization: string;
  bio?: string;
  photoUrl?: string;
  expertise: string[];
  contactInfo?: {
    email?: string;
    linkedin?: string;
    website?: string;
  };
  contributions: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GuestCreditSchema: Schema<IGuestCredit> = new Schema({
  guestName: { type: String, required: true },
  title: { type: String, required: true },
  organization: { type: String, required: true },
  bio: { type: String },
  photoUrl: { type: String },
  expertise: [{ type: String }],
  contactInfo: {
    email: { type: String },
    linkedin: { type: String },
    website: { type: String }
  },
  contributions: [{ type: Schema.Types.ObjectId, ref: 'ContentModule' }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// Indexes for searching and filtering
GuestCreditSchema.index({ guestName: 'text', title: 'text', organization: 'text' });
GuestCreditSchema.index({ expertise: 1 });
GuestCreditSchema.index({ isActive: 1 });
GuestCreditSchema.index({ organization: 1 });

const GuestCredit: Model<IGuestCredit> = mongoose.models.GuestCredit || mongoose.model<IGuestCredit>('GuestCredit', GuestCreditSchema);

export default GuestCredit; 