import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IStudentProject extends Document {
  title: string;
  description: string;
  studentName: string;
  studentEmail: string;
  institution?: string;
  course?: string;
  projectType: 'individual' | 'group' | 'research' | 'capstone';
  technologies: string[];
  repositoryUrl?: string;
  demoUrl?: string;
  documentUrl?: string;
  thumbnailUrl?: string;
  relatedTopics: string[];
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'featured';
  approvedBy?: Types.ObjectId;
  moderationNotes?: string;
  featuredAt?: Date;
  isPublic: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProjectSchema: Schema<IStudentProject> = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  institution: { type: String },
  course: { type: String },
  projectType: { 
    type: String, 
    enum: ['individual', 'group', 'research', 'capstone'], 
    required: true 
  },
  technologies: [{ type: String }],
  repositoryUrl: { type: String },
  demoUrl: { type: String },
  documentUrl: { type: String },
  thumbnailUrl: { type: String },
  relatedTopics: [{ type: String }],
  moderationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'featured'], 
    default: 'pending' 
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderationNotes: { type: String },
  featuredAt: { type: Date },
  isPublic: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// Indexes for searching and filtering
StudentProjectSchema.index({ studentName: 'text', title: 'text', description: 'text' });
StudentProjectSchema.index({ moderationStatus: 1 });
StudentProjectSchema.index({ projectType: 1 });
StudentProjectSchema.index({ technologies: 1 });
StudentProjectSchema.index({ relatedTopics: 1 });
StudentProjectSchema.index({ featuredAt: -1 });
StudentProjectSchema.index({ isPublic: 1, moderationStatus: 1 });

const StudentProject: Model<IStudentProject> = mongoose.models.StudentProject || mongoose.model<IStudentProject>('StudentProject', StudentProjectSchema);

export default StudentProject; 