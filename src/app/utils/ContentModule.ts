import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IContentModule extends Document {
  title: string;
  description: string;
  contentType: 'video' | 'audio' | 'document' | 'link' | 'interactive';
  mediaUrl?: string;
  youtubeUrl?: string;
  fileUrl?: string;
  voiceHook?: string;
  tags: string[];
  knowledgeArea: string;
  discipline: string;
  relatedTools: string[];
  createdBy: Types.ObjectId;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: Types.ObjectId;
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentModuleSchema: Schema<IContentModule> = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['video', 'audio', 'document', 'link', 'interactive'], 
    required: true 
  },
  mediaUrl: { type: String },
  youtubeUrl: { type: String },
  fileUrl: { type: String },
  voiceHook: { type: String },
  tags: [{ type: String }],
  knowledgeArea: { type: String, required: true },
  discipline: { type: String, required: true },
  relatedTools: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moderationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderationNotes: { type: String },
}, {
  timestamps: true
});

// Indexes for better performance
ContentModuleSchema.index({ knowledgeArea: 1, discipline: 1 });
ContentModuleSchema.index({ moderationStatus: 1 });
ContentModuleSchema.index({ tags: 1 });
ContentModuleSchema.index({ createdBy: 1 });

const ContentModule: Model<IContentModule> = mongoose.models.ContentModule || mongoose.model<IContentModule>('ContentModule', ContentModuleSchema);

export default ContentModule; 