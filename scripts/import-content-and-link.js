const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Database connection configuration
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// CSV file path
const CONTENT_CSV_PATH = path.join(__dirname, '..', 'src', 'csv', '25-26 MA IE Course Planning Draft - Updated(MA IE - Online Toolkit).csv');

// Define Mongoose schemas
const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  profile: {
    firstName: String,
    lastName: String
  },
  isActive: Boolean
}, { timestamps: true });

const ContentModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['video', 'audio', 'document', 'link', 'interactive'], 
    required: true 
  },
  mediaUrl: String,
  youtubeUrl: String,
  fileUrl: String,
  voiceHook: String,
  tags: [String],
  knowledgeArea: { type: String, required: true },
  discipline: { type: String, required: true },
  relatedTools: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moderationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderationNotes: String,
  // New fields for enhanced content structure
  toolkitStructure: String,
  coreTopics: [String],
  formats: [String],
  guestSpeaker: {
    name: String,
    title: String,
    company: String
  },
  contentOutlineLink: String,
  references: String,
  // Connection to sunburst data
  relatedSunburstEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SunburstMap' }]
}, { timestamps: true });

const SunburstMapSchema = new mongoose.Schema({
  discipline: { type: String, required: true },
  knowledgeArea: { type: String, required: true },
  toolTechnology: { type: String, required: true },
  roleSystemOrientation: { type: String, required: true },
  themeCluster: { type: String, required: true },
  description: { type: String, required: true },
  voiceHook: String,
  position: {
    level: { type: Number, required: true },
    order: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Connection to content modules
  relatedContent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContentModule' }]
}, { timestamps: true });

async function parseCSV(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    // Parse CSV line by line (handle quoted fields with commas)
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    
    console.log('Headers found:', headers);
    console.log('Total rows:', rows.length);
    
    return { headers, rows };
  } catch (error) {
    console.error('Error parsing CSV:', error.message);
    throw error;
  }
}

function extractKnowledgeAreasAndTools(linkedText, toolsText) {
  const knowledgeAreas = [];
  const tools = [];
  
  if (linkedText) {
    // Split by common delimiters and clean
    const areas = linkedText.split(/[,\+&\n]/).map(area => area.trim()).filter(Boolean);
    knowledgeAreas.push(...areas);
  }
  
  if (toolsText) {
    // Split by common delimiters and clean
    const toolsList = toolsText.split(/[,\n]/).map(tool => tool.trim()).filter(Boolean);
    tools.push(...toolsList);
  }
  
  return { knowledgeAreas, tools };
}

function determineContentType(type, formats) {
  if (!type && !formats) return 'document';
  
  const combined = `${type || ''} ${formats || ''}`.toLowerCase();
  
  if (combined.includes('video') || combined.includes('interview') || combined.includes('demo')) {
    return 'video';
  } else if (combined.includes('audio') || combined.includes('sound')) {
    return 'audio';
  } else if (combined.includes('interactive') || combined.includes('game') || combined.includes('workshop')) {
    return 'interactive';
  } else if (combined.includes('link') || combined.includes('url')) {
    return 'link';
  }
  
  return 'document';
}

function transformContentCSVData(headers, rows) {
  const contentData = [];
  const seenTitles = new Set();
  
  rows.forEach((row, index) => {
    if (row.length < 4) {
      console.log(`Skipping row ${index + 2}: insufficient data`);
      return;
    }
    
    const [
      toolkitStructure, type, title, narrative, hook, coreTopics,
      linkedKnowledgeAreas, formats, tools, guestSpeaker, 
      guestSpeakerTitle, contentOutlineLink, references
    ] = row;
    
    // Skip rows with missing critical data
    if (!title?.trim() || !narrative?.trim()) {
      console.log(`Skipping row ${index + 2}: missing title or narrative`);
      return;
    }
    
    // Avoid duplicates
    const cleanTitle = title.trim();
    if (seenTitles.has(cleanTitle)) {
      console.log(`Skipping duplicate title at row ${index + 2}: ${cleanTitle}`);
      return;
    }
    seenTitles.add(cleanTitle);
    
    const { knowledgeAreas, tools: extractedTools } = extractKnowledgeAreasAndTools(linkedKnowledgeAreas, tools);
    
    // Use the first knowledge area as primary, or default
    const primaryKnowledgeArea = knowledgeAreas[0] || 'General';
    const primaryDiscipline = knowledgeAreas[1] || knowledgeAreas[0] || 'General';
    
    const contentEntry = {
      toolkitStructure: toolkitStructure?.trim() || '',
      title: cleanTitle,
      description: narrative.trim(),
      contentType: determineContentType(type, formats),
      voiceHook: hook?.trim() || '',
      tags: coreTopics ? coreTopics.split(',').map(t => t.trim()).filter(Boolean) : [],
      knowledgeArea: primaryKnowledgeArea,
      discipline: primaryDiscipline,
      relatedTools: extractedTools,
      coreTopics: coreTopics ? coreTopics.split(',').map(t => t.trim()).filter(Boolean) : [],
      formats: formats ? formats.split(',').map(f => f.trim()).filter(Boolean) : [],
      guestSpeaker: guestSpeaker?.trim() ? {
        name: guestSpeaker.trim(),
        title: guestSpeakerTitle?.trim() || '',
        company: ''
      } : undefined,
      contentOutlineLink: contentOutlineLink?.trim() || '',
      references: references?.trim() || '',
      moderationStatus: 'approved', // Auto-approve course content
      relatedSunburstEntries: [] // Will be populated during linking
    };
    
    contentData.push(contentEntry);
  });
  
  console.log(`Processed ${contentData.length} unique content entries from ${rows.length} CSV rows`);
  return contentData;
}

async function findAndLinkSunburstEntries(contentEntry, SunburstMap) {
  const relatedEntries = [];
  
  try {
    // Find sunburst entries that match:
    // 1. Knowledge area (exact or partial match)
    // 2. Related tools (any tool mentioned in the content)
    // 3. Discipline (partial match)
    
    const searchCriteria = [];
    
    // Search by knowledge area
    if (contentEntry.knowledgeArea && contentEntry.knowledgeArea !== 'General') {
      searchCriteria.push({
        knowledgeArea: { $regex: contentEntry.knowledgeArea, $options: 'i' }
      });
    }
    
    // Search by discipline
    if (contentEntry.discipline && contentEntry.discipline !== 'General') {
      searchCriteria.push({
        discipline: { $regex: contentEntry.discipline, $options: 'i' }
      });
    }
    
    // Search by tools
    if (contentEntry.relatedTools && contentEntry.relatedTools.length > 0) {
      const toolRegexes = contentEntry.relatedTools.map(tool => ({
        toolTechnology: { $regex: tool, $options: 'i' }
      }));
      searchCriteria.push({ $or: toolRegexes });
    }
    
    // Search by tags/topics in theme clusters
    if (contentEntry.tags && contentEntry.tags.length > 0) {
      const tagRegexes = contentEntry.tags.map(tag => ({
        $or: [
          { themeCluster: { $regex: tag, $options: 'i' } },
          { knowledgeArea: { $regex: tag, $options: 'i' } }
        ]
      }));
      searchCriteria.push({ $or: tagRegexes });
    }
    
    if (searchCriteria.length > 0) {
      const matches = await SunburstMap.find({
        $or: searchCriteria
      }).limit(10); // Limit to avoid too many connections
      
      relatedEntries.push(...matches.map(match => match._id));
    }
    
    console.log(`Found ${relatedEntries.length} sunburst connections for "${contentEntry.title}"`);
    
  } catch (error) {
    console.error(`Error linking sunburst entries for "${contentEntry.title}":`, error.message);
  }
  
  return relatedEntries;
}

async function updateSunburstWithContentLinks(contentModules, SunburstMap) {
  console.log('🔗 Creating bidirectional links between content and sunburst data...');
  
  for (const content of contentModules) {
    if (content.relatedSunburstEntries && content.relatedSunburstEntries.length > 0) {
      // Update each related sunburst entry to include this content
      await SunburstMap.updateMany(
        { _id: { $in: content.relatedSunburstEntries } },
        { $addToSet: { relatedContent: content._id } }
      );
    }
  }
  
  console.log('✅ Bidirectional links established');
}

async function importContentAndLink() {
  try {
    console.log('🔄 Starting content import and linking process...');
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Connect to MongoDB using Mongoose
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    console.log('✅ Connected to MongoDB');
    
    // Define models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const ContentModule = mongoose.models.ContentModule || mongoose.model('ContentModule', ContentModuleSchema);
    const SunburstMap = mongoose.models.SunburstMap || mongoose.model('SunburstMap', SunburstMapSchema);
    
    // Step 1: Clean existing content data
    console.log('🧹 Cleaning existing content data...');
    const deleteResult = await ContentModule.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing content entries`);
    
    // Step 2: Parse content CSV file
    console.log('📊 Parsing content CSV file...');
    const { headers, rows } = await parseCSV(CONTENT_CSV_PATH);
    
    // Step 3: Transform CSV data to content format
    console.log('🔄 Transforming content data...');
    const contentData = transformContentCSVData(headers, rows);
    
    // Step 4: Get admin user
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
    
    // Step 5: Add createdBy field and find sunburst connections
    console.log('🔗 Finding connections to sunburst data...');
    for (const entry of contentData) {
      entry.createdBy = adminUser._id;
      entry.relatedSunburstEntries = await findAndLinkSunburstEntries(entry, SunburstMap);
    }
    
    // Step 6: Insert content data
    console.log(`💾 Inserting ${contentData.length} content modules...`);
    if (contentData.length > 0) {
      const insertResult = await ContentModule.insertMany(contentData);
      console.log(`✅ Successfully inserted ${insertResult.length} content modules`);
      
      // Step 7: Update sunburst entries with back-references
      await updateSunburstWithContentLinks(insertResult, SunburstMap);
    }
    
    // Step 8: Summary statistics
    const totalContent = await ContentModule.countDocuments();
    const totalSunburst = await SunburstMap.countDocuments();
    const contentWithLinks = await ContentModule.countDocuments({ relatedSunburstEntries: { $ne: [] } });
    const sunburstWithContent = await SunburstMap.countDocuments({ relatedContent: { $ne: [] } });
    
    console.log('\n📈 Import and Linking Summary:');
    console.log(`• Total content modules: ${totalContent}`);
    console.log(`• Total sunburst entries: ${totalSunburst}`);
    console.log(`• Content modules with sunburst links: ${contentWithLinks}`);
    console.log(`• Sunburst entries with content links: ${sunburstWithContent}`);
    console.log(`• Connection success rate: ${((contentWithLinks / totalContent) * 100).toFixed(1)}%`);
    
    // Step 9: Content type breakdown
    const contentTypes = await ContentModule.aggregate([
      { $group: { _id: '$contentType', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📺 Content Types:');
    contentTypes.forEach(type => console.log(`  - ${type._id}: ${type.count}`));
    
    console.log('\n🚀 Content import and linking completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during import and linking:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Check if CSV file exists
if (!fs.existsSync(CONTENT_CSV_PATH)) {
  console.error(`❌ Content CSV file not found at: ${CONTENT_CSV_PATH}`);
  process.exit(1);
}

// Run the script
importContentAndLink(); 