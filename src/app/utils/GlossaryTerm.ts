import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGlossaryTerm extends Document {
  title: string;
  description: string;
  approved: boolean;
  userId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  moderationNotes?: string;
  tags?: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  relatedTerms?: Types.ObjectId[];
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const GlossaryTermSchema: Schema<IGlossaryTerm> = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  approved: { type: Boolean, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderationNotes: { type: String },
  tags: [{ type: String }],
  category: { type: String },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  relatedTerms: [{ type: Schema.Types.ObjectId, ref: 'GlossaryTerm' }],
  viewCount: { type: Number, default: 0 },
}, {
  timestamps: true
});

// Indexes for better performance
GlossaryTermSchema.index({ title: 'text', description: 'text' });
GlossaryTermSchema.index({ approved: 1, createdAt: -1 });
GlossaryTermSchema.index({ tags: 1 });
GlossaryTermSchema.index({ category: 1 });
GlossaryTermSchema.index({ difficulty: 1 });
GlossaryTermSchema.index({ userId: 1 });

const GlossaryTerm: Model<IGlossaryTerm> = mongoose.models.GlossaryTerm || mongoose.model<IGlossaryTerm>('GlossaryTerm', GlossaryTermSchema);

export default GlossaryTerm; 