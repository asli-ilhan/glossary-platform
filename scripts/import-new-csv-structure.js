const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

// CSV file paths for new structure
const VISUAL_MAP_CSV_PATH = path.join(__dirname, '..', 'src', 'csv', 'Visual_Map_Entries_Metadata.csv');
const DESCRIPTIONS_CSV_PATH = path.join(__dirname, '..', 'src', 'csv', 'Layers_Entry_Descriptions.csv');
const CONTENT_CSV_PATH = path.join(__dirname, '..', 'src', 'csv', 'Content_Metadata.csv');

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'contributor', 'student'], default: 'student' },
  profile: {
    firstName: String,
    lastName: String,
    affiliation: String,
    bio: String
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SunburstMapSchema = new mongoose.Schema({
  discipline: { type: String, required: true },
  knowledgeArea: { type: String, required: true },
  toolTechnology: { type: String, required: true },
  roleSystemOrientation: { type: String, required: true },
  themeCluster: { type: String, required: true },
  inequality: { type: String, required: true }, // New field for inequality data
  description: { type: String, required: true },
  voiceHook: String,
  position: {
    level: { type: Number, required: true },
    order: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedContent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContentModule' }]
}, { timestamps: true });

const LayerDescriptionSchema = new mongoose.Schema({
  layer: { type: String, required: true }, // Discipline, Knowledge Area, Tool/Technology, Role/System Orientation
  entry: { type: String, required: true },
  description: { type: String, required: true }
}, { timestamps: true });

const ContentModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['video', 'audio', 'document', 'link', 'interactive'], 
    default: 'document' 
  },
  youtubeUrl: String,
  mediaUrl: String,
  fileUrl: String,
  voiceHook: String,
  tags: [String],
  knowledgeArea: String,
  discipline: String,
  linkedKnowledgeAreas: [String], // New field for multiple knowledge areas
  linkedDisciplines: [String], // New field for multiple disciplines
  relatedTools: [String],
  guestSpeaker: {
    name: String,
    title: String,
    company: String
  },
  moderationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

async function parseCSV(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    
    // Use a more robust CSV parser for multi-line quoted fields
    const parseCSVContent = (content) => {
      const rows = [];
      let currentRow = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < content.length) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i += 2;
            continue;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          currentRow.push(currentField.trim());
          currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          // Row separator (only when not in quotes)
          if (char === '\r' && nextChar === '\n') {
            i++; // Skip \r\n
          }
          if (currentField.trim() || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(field => field.length > 0)) {
              rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
          }
        } else {
          // Regular character
          currentField += char;
        }
        
        i++;
      }
      
      // Handle last field/row
      if (currentField.trim() || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
      }
      
      return rows;
    };
    
    const allRows = parseCSVContent(csvContent);
    
    if (allRows.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    const headers = allRows[0];
    const rows = allRows.slice(1);
    
    console.log('Headers found:', headers);
    console.log('Total rows:', rows.length);
    
    return { headers, rows };
  } catch (error) {
    console.error('Error parsing CSV:', error.message);
    throw error;
  }
}

function transformVisualMapData(headers, rows) {
  const sunburstData = [];
  const seenCombinations = new Set();
  
  rows.forEach((row, index) => {
    if (row.length < 6) {
      console.log(`Skipping row ${index + 2}: insufficient data`);
      return;
    }
    
    const discipline = row[0]?.trim();
    const knowledgeArea = row[1]?.trim();
    const toolTechnology = row[2]?.trim();
    const roleSystemOrientation = row[3]?.trim();
    const themeCluster = row[4]?.trim();
    const inequality = row[5]?.trim();
    
    if (!discipline || !knowledgeArea || !toolTechnology || !themeCluster || !inequality) {
      console.log(`Skipping row ${index + 2}: missing critical data`);
      return;
    }
    
    const combinationKey = `${discipline}|${knowledgeArea}|${toolTechnology}|${roleSystemOrientation}|${themeCluster}`;
    
    if (seenCombinations.has(combinationKey)) {
      console.log(`Skipping duplicate entry at row ${index + 2}`);
      return;
    }
    
    seenCombinations.add(combinationKey);
    
    const sunburstEntry = {
      discipline,
      knowledgeArea,
      toolTechnology,
      roleSystemOrientation: roleSystemOrientation || 'General',
      themeCluster,
      inequality,
      description: `${toolTechnology} is a ${knowledgeArea.toLowerCase()} tool used in ${discipline} for ${themeCluster.toLowerCase()}.`,
      position: {
        level: 5,
        order: index + 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    sunburstData.push(sunburstEntry);
  });
  
  console.log(`Processed ${sunburstData.length} unique entries from ${rows.length} CSV rows`);
  return sunburstData;
}

function transformDescriptionsData(headers, rows) {
  const descriptionsData = [];
  
  rows.forEach((row, index) => {
    if (row.length < 3) {
      console.log(`Skipping description row ${index + 2}: insufficient data`);
      return;
    }
    
    const layer = row[0]?.trim();
    const entry = row[1]?.trim();
    const description = row[2]?.trim();
    
    if (!layer || !entry || !description) {
      console.log(`Skipping description row ${index + 2}: missing critical data`);
      return;
    }
    
    descriptionsData.push({
      layer,
      entry,
      description
    });
  });
  
  console.log(`Processed ${descriptionsData.length} description entries from ${rows.length} CSV rows`);
  return descriptionsData;
}

function transformContentData(headers, rows) {
  const contentData = [];
  const seenTitles = new Set();
  
  console.log(`Processing ${rows.length} content rows...`);
  
  rows.forEach((row, index) => {
    // More flexible validation - just check for minimum essential data
    if (!row || row.length < 3) {
      console.log(`Skipping content row ${index + 2}: row has ${row?.length || 0} columns`);
      return;
    }
    
    // Extract fields with safer indexing
    const title = row[2]?.trim(); // TITLE is at index 2
    const narrative = row[3]?.trim(); // NARRATIVE is at index 3
    const hook = row[4]?.trim(); // HOOK is at index 4
    const coreTopics = row[5]?.trim(); // CORE TOPICS is at index 5
    const linkedKnowledgeAreasDisciplines = row[6]?.trim(); // LINKED KNOWLEDGE AREAS + DISCIPLINES is at index 6
    const formats = row[7]?.trim(); // FORMATS is at index 7
    const tools = row[8]?.trim(); // TOOLS is at index 8
    const guestSpeaker = row[9]?.trim(); // GUEST SPEAKER is at index 9
    const guestSpeakerTitle = row[10]?.trim(); // GUEST SPEAKER JOB TITLE is at index 10
    const linkedKnowledgeAreasDisciplinesCleaned = row[14]?.trim(); // Cleaned version at index 14
    
    // Debug logging for first few rows
    if (index < 3) {
      console.log(`Row ${index + 2} debug:`, {
        title,
        narrative: narrative?.substring(0, 50) + '...',
        linkedOriginal: linkedKnowledgeAreasDisciplines,
        linkedCleaned: linkedKnowledgeAreasDisciplinesCleaned
      });
    }
    
    if (!title || !narrative) {
      console.log(`Skipping content row ${index + 2}: missing title (${!!title}) or narrative (${!!narrative})`);
      return;
    }
    
    const cleanTitle = title.trim();
    if (seenTitles.has(cleanTitle)) {
      console.log(`Skipping duplicate content title at row ${index + 2}: ${cleanTitle}`);
      return;
    }
    seenTitles.add(cleanTitle);
    
    // Parse the cleaned linked knowledge areas and disciplines
    const linkedData = linkedKnowledgeAreasDisciplinesCleaned || linkedKnowledgeAreasDisciplines || '';
    const linkedItems = linkedData.split(',').map(item => item.trim()).filter(Boolean);
    
    // Determine content type from the TYPE column or other indicators
    const type = row[1]?.trim().toLowerCase() || '';
    let contentType = 'document';
    if (type.includes('video') || row.some(field => field?.includes('youtube'))) {
      contentType = 'video';
    } else if (type.includes('audio')) {
      contentType = 'audio';
    } else if (type.includes('link')) {
      contentType = 'link';
    } else if (type.includes('interactive')) {
      contentType = 'interactive';
    }
    
    const contentEntry = {
      title: cleanTitle,
      description: narrative.trim(),
      contentType,
      voiceHook: hook || '',
      tags: coreTopics ? coreTopics.split(',').map(t => t.trim()).filter(Boolean) : [],
      knowledgeArea: linkedItems[0] || 'General',
      discipline: linkedItems[1] || linkedItems[0] || 'General',
      relatedTools: tools ? tools.split(',').map(t => t.trim()).filter(Boolean) : [],
      guestSpeaker: guestSpeaker ? {
        name: guestSpeaker,
        title: guestSpeakerTitle || '',
        company: ''
      } : undefined,
      moderationStatus: 'approved',
      _originalLinkedItems: linkedItems
    };
    
    contentData.push(contentEntry);
  });
  
  console.log(`Processed ${contentData.length} unique content entries from ${rows.length} CSV rows`);
  return contentData;
}

async function linkContentToSunburst(contentData, sunburstData) {
  console.log('🔗 Linking content to sunburst data...');
  console.log(`Content entries: ${contentData.length}, Sunburst entries: ${sunburstData.length}`);
  
  const linkedEntries = [];
  
  contentData.forEach((content, contentIndex) => {
    const linkedSunburstIds = [];
    
    console.log(`\nProcessing content ${contentIndex + 1}: "${content.title}"`);
    console.log(`Primary knowledge area: "${content.knowledgeArea}", discipline: "${content.discipline}"`);
    
    // Get all linked items from the original CSV data (stored during processing)
    const linkedItems = content._originalLinkedItems || [content.knowledgeArea, content.discipline];
    console.log(`All linked items: [${linkedItems.join(', ')}]`);
    
    // Match content to sunburst entries based on linked knowledge areas and disciplines
    linkedItems.forEach(linkedItem => {
      const normalizedLinkedItem = linkedItem.toLowerCase().trim();
      console.log(`Looking for matches with: "${linkedItem}"`);
      
      let matchCount = 0;
      sunburstData.forEach(sunburst => {
        const sunburstFields = [
          sunburst.knowledgeArea,
          sunburst.discipline,
          sunburst.toolTechnology,
          sunburst.roleSystemOrientation,
          sunburst.themeCluster
        ];
        
        const hasMatch = sunburstFields.some(field => {
          if (!field) return false;
          const normalizedField = field.toLowerCase().trim();
          const match = normalizedField.includes(normalizedLinkedItem) || 
                       normalizedLinkedItem.includes(normalizedField) ||
                       normalizedField === normalizedLinkedItem;
          
          if (match) {
            console.log(`  ✓ Match found: "${linkedItem}" matches "${field}" in sunburst entry`);
            matchCount++;
          }
          
          return match;
        });
        
        if (hasMatch) {
          linkedSunburstIds.push(sunburst._id);
        }
      });
      
      if (matchCount === 0) {
        console.log(`  ✗ No matches found for: "${linkedItem}"`);
      }
    });
    
    const uniqueLinkedIds = [...new Set(linkedSunburstIds)];
    if (uniqueLinkedIds.length > 0) {
      console.log(`✅ Content "${content.title}" linked to ${uniqueLinkedIds.length} sunburst entries`);
      linkedEntries.push({
        content,
        sunburstIds: uniqueLinkedIds
      });
    } else {
      console.log(`❌ Content "${content.title}" has no sunburst links`);
    }
  });
  
  console.log(`\n📊 Final linking results:`);
  console.log(`Found ${linkedEntries.length} content entries with sunburst links`);
  return linkedEntries;
}

async function importNewCsvStructure() {
  try {
    console.log('🔄 Starting new CSV structure import...');
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    console.log('✅ Connected to MongoDB');
    
    // Define models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const SunburstMap = mongoose.models.SunburstMap || mongoose.model('SunburstMap', SunburstMapSchema);
    const LayerDescription = mongoose.models.LayerDescription || mongoose.model('LayerDescription', LayerDescriptionSchema);
    const ContentModule = mongoose.models.ContentModule || mongoose.model('ContentModule', ContentModuleSchema);
    
    // Get or create admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating default admin user...');
      adminUser = new User({
        email: 'admin@example.com',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        },
        isActive: true
      });
      await adminUser.save();
    }
    
    // Step 1: Clean existing data
    console.log('🧹 Cleaning existing data...');
    await SunburstMap.deleteMany({});
    await LayerDescription.deleteMany({});
    await ContentModule.deleteMany({});
    console.log('✅ Cleaned existing data');
    
    // Step 2: Parse and import Visual Map Entries
    console.log('📊 Processing Visual Map Entries...');
    const { headers: visualHeaders, rows: visualRows } = await parseCSV(VISUAL_MAP_CSV_PATH);
    const sunburstData = transformVisualMapData(visualHeaders, visualRows);
    
    const finalSunburstData = sunburstData.map(entry => ({
      ...entry,
      createdBy: adminUser._id
    }));
    
    if (finalSunburstData.length > 0) {
      const sunburstInsertResult = await SunburstMap.insertMany(finalSunburstData);
      console.log(`✅ Inserted ${sunburstInsertResult.length} sunburst entries`);
    }
    
    // Step 3: Parse and import Layer Descriptions
    console.log('📝 Processing Layer Descriptions...');
    const { headers: descHeaders, rows: descRows } = await parseCSV(DESCRIPTIONS_CSV_PATH);
    const descriptionsData = transformDescriptionsData(descHeaders, descRows);
    
    if (descriptionsData.length > 0) {
      const descInsertResult = await LayerDescription.insertMany(descriptionsData);
      console.log(`✅ Inserted ${descInsertResult.length} layer descriptions`);
    }
    
    // Step 4: Parse and import Content Metadata
    console.log('📚 Processing Content Metadata...');
    const { headers: contentHeaders, rows: contentRows } = await parseCSV(CONTENT_CSV_PATH);
    const contentData = transformContentData(contentHeaders, contentRows);
    
    const finalContentData = contentData.map(entry => {
      const { _originalLinkedItems, ...cleanEntry } = entry;
      return {
        ...cleanEntry,
        createdBy: adminUser._id
      };
    });
    
    if (finalContentData.length > 0) {
      console.log('\n🔍 Debug: Sample content entry structure:');
      console.log(JSON.stringify(finalContentData[0], null, 2));
      
      const contentInsertResult = await ContentModule.insertMany(finalContentData);
      console.log(`✅ Inserted ${contentInsertResult.length} content entries`);
      
      // Step 5: Link content to sunburst data
      const sunburstEntries = await SunburstMap.find({});
      const linkedEntries = await linkContentToSunburst(contentData, sunburstEntries); // Use original contentData with _originalLinkedItems
      
      // Update sunburst entries with related content
      for (const linkedEntry of linkedEntries) {
        const contentDoc = await ContentModule.findOne({ title: linkedEntry.content.title });
        if (contentDoc) {
          await SunburstMap.updateMany(
            { _id: { $in: linkedEntry.sunburstIds } },
            { $addToSet: { relatedContent: contentDoc._id } }
          );
        }
      }
      
      console.log(`✅ Linked ${linkedEntries.length} content entries to sunburst data`);
    }
    
    // Step 6: Drop existing indexes and create new ones
    console.log('🔍 Dropping existing indexes and creating new ones...');
    
    try {
      // Drop existing indexes
      await SunburstMap.collection.dropIndexes();
      await LayerDescription.collection.dropIndexes();
      await ContentModule.collection.dropIndexes();
      console.log('✅ Dropped existing indexes');
    } catch (error) {
      console.log('⚠️  Some indexes may not have existed:', error.message);
    }
    
    // Create new indexes
    await SunburstMap.collection.createIndex({ themeCluster: 1, knowledgeArea: 1, discipline: 1 });
    await SunburstMap.collection.createIndex({ inequality: 1 });
    await LayerDescription.collection.createIndex({ layer: 1, entry: 1 });
    await ContentModule.collection.createIndex({ title: 1 });
    await ContentModule.collection.createIndex({ moderationStatus: 1 });
    console.log('✅ Database indexes created');
    
    // Step 7: Summary statistics
    const totalSunburstEntries = await SunburstMap.countDocuments();
    const totalDescriptions = await LayerDescription.countDocuments();
    const totalContentEntries = await ContentModule.countDocuments();
    const uniqueInequalities = await SunburstMap.distinct('inequality');
    
    console.log('\n📈 Import Summary:');
    console.log(`• Sunburst entries: ${totalSunburstEntries}`);
    console.log(`• Layer descriptions: ${totalDescriptions}`);
    console.log(`• Content entries: ${totalContentEntries}`);
    console.log(`• Unique inequalities: ${uniqueInequalities.length}`);
    
    console.log('\n🎯 Inequalities found:');
    uniqueInequalities.forEach(inequality => console.log(`  - ${inequality}`));
    
    console.log('\n🚀 New CSV structure import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Run the import
importNewCsvStructure(); 