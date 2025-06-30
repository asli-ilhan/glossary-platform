import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISunburstMap extends Document {
  themeCluster: string;
  knowledgeArea: string;
  discipline: string;
  roleSystemOrientation: string;
  toolTechnology: string;
  inequality: string;
  description: string;
  voiceHook?: string;
  audioUrl?: string;
  relatedContent: Types.ObjectId[];
  guestSpeaker?: {
    name: string;
    title: string;
    organization: string;
    bio?: string;
    photoUrl?: string;
  };
  position: {
    level: number;
    parentId?: Types.ObjectId;
    order: number;
  };
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SunburstMapSchema: Schema<ISunburstMap> = new Schema({
  themeCluster: { type: String, required: true },
  knowledgeArea: { type: String, required: true },
  discipline: { type: String, required: true },
  roleSystemOrientation: { type: String, required: true },
  toolTechnology: { type: String, required: true },
  inequality: { type: String, required: true },
  description: { type: String, required: true },
  voiceHook: { type: String },
  audioUrl: { type: String },
  relatedContent: [{ type: Schema.Types.ObjectId, ref: 'ContentModule' }],
  guestSpeaker: {
    name: { type: String },
    title: { type: String },
    organization: { type: String },
    bio: { type: String },
    photoUrl: { type: String }
  },
  position: {
    level: { type: Number, required: true, min: 1, max: 5 },
    parentId: { type: Schema.Types.ObjectId, ref: 'SunburstMap' },
    order: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// Indexes for hierarchical queries and performance
SunburstMapSchema.index({ themeCluster: 1, knowledgeArea: 1, discipline: 1 });
SunburstMapSchema.index({ 'position.level': 1, 'position.order': 1 });
SunburstMapSchema.index({ 'position.parentId': 1 });
SunburstMapSchema.index({ isActive: 1 });
SunburstMapSchema.index({ toolTechnology: 1 });
SunburstMapSchema.index({ inequality: 1 });

const SunburstMap: Model<ISunburstMap> = mongoose.models.SunburstMap || mongoose.model<ISunburstMap>('SunburstMap', SunburstMapSchema);

export default SunburstMap; 