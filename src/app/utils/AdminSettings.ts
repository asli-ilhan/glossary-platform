import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAdminSettings extends Document {
  registrationEnabled: boolean;
  blockedEmails: string[];
  blockedDomains: string[];
  lastUpdatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSettingsSchema: Schema<IAdminSettings> = new Schema({
  registrationEnabled: { type: Boolean, default: true },
  blockedEmails: [{ type: String, lowercase: true, trim: true }],
  blockedDomains: [{ type: String, lowercase: true, trim: true }],
  lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// Indexes for efficient querying
AdminSettingsSchema.index({ registrationEnabled: 1 });
AdminSettingsSchema.index({ blockedEmails: 1 });
AdminSettingsSchema.index({ blockedDomains: 1 });

// Ensure only one settings document exists
AdminSettingsSchema.index({}, { unique: true });

const AdminSettings: Model<IAdminSettings> = mongoose.models.AdminSettings || mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);

export default AdminSettings; 