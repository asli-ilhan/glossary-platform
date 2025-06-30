import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/utils/models';
import mongoose from 'mongoose';

// Define the LayerDescription schema inline since it's new
const LayerDescriptionSchema = new mongoose.Schema({
  layer: { type: String, required: true },
  entry: { type: String, required: true },
  description: { type: String, required: true }
}, { timestamps: true });

export async function GET() {
  try {
    await dbConnect();
    
    // Get or create the LayerDescription model
    const LayerDescription = mongoose.models.LayerDescription || 
                            mongoose.model('LayerDescription', LayerDescriptionSchema);
    
    // Fetch all layer descriptions
    const descriptions = await LayerDescription.find({})
      .sort({ layer: 1, entry: 1 })
      .lean();

    return NextResponse.json(descriptions);
  } catch (error) {
    console.error('Error fetching layer descriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch layer descriptions' }, 
      { status: 500 }
    );
  }
} 