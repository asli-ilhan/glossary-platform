const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Database connection configuration
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// CSV file path
const CSV_PATH = path.join(__dirname, '..', 'src', 'csv', 'Visual mapping of MA IE.csv');

async function parseCSV(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }
    
    // Parse CSV line by line
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

function transformCSVToSunburstData(headers, rows) {
  const sunburstData = [];
  const seenCombinations = new Set();
  
  // Map headers to expected field names
  const headerMap = {
    'Discipline': 'discipline',
    'Knowledge Area': 'knowledgeArea', 
    'Tool / Technology': 'toolTechnology',
    'Role / System Orientation': 'roleSystemOrientation',
    'Theme Cluster': 'themeCluster'
  };
  
  rows.forEach((row, index) => {
    if (row.length < 5) {
      console.log(`Skipping row ${index + 2}: insufficient data`);
      return;
    }
    
    const discipline = row[0]?.trim();
    const knowledgeArea = row[1]?.trim();
    const toolTechnology = row[2]?.trim();
    const roleSystemOrientation = row[3]?.trim();
    const themeCluster = row[4]?.trim();
    
    // Skip rows with missing critical data
    if (!discipline || !knowledgeArea || !toolTechnology || !themeCluster) {
      console.log(`Skipping row ${index + 2}: missing critical data`);
      return;
    }
    
    // Create unique combination key to avoid duplicates
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
      description: `${toolTechnology} is a ${knowledgeArea.toLowerCase()} tool used in ${discipline} for ${themeCluster.toLowerCase()}.`,
      voiceHook: `Explore ${toolTechnology} in the context of ${knowledgeArea}`,
      position: {
        level: 5, // Tool/Technology is the leaf level
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

async function cleanAndImportData() {
  try {
    console.log('🔄 Starting clean and import process...');
    
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
    const SunburstMap = mongoose.models.SunburstMap || mongoose.model('SunburstMap', SunburstMapSchema);
    
    // Step 1: Clean existing sunburst data
    console.log('🧹 Cleaning existing sunburst data...');
    const deleteResult = await SunburstMap.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing sunburst entries`);
    
    // Step 2: Parse CSV file
    console.log('📊 Parsing CSV file...');
    const { headers, rows } = await parseCSV(CSV_PATH);
    
    // Step 3: Transform CSV data to sunburst format
    console.log('🔄 Transforming data...');
    const sunburstData = transformCSVToSunburstData(headers, rows);
    
    // Step 4: Create a default admin user reference (you'll need to replace this with actual admin user ID)
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
    
    // Step 5: Add createdBy field to all entries
    const finalData = sunburstData.map(entry => ({
      ...entry,
      createdBy: adminUser._id
    }));
    
    // Step 6: Insert new data
    console.log(`💾 Inserting ${finalData.length} new sunburst entries...`);
    if (finalData.length > 0) {
      const insertResult = await SunburstMap.insertMany(finalData);
      console.log(`✅ Successfully inserted ${insertResult.length} sunburst entries`);
    }
    
    // Step 7: Create indexes for better performance
    console.log('🔍 Creating database indexes...');
    await SunburstMap.collection.createIndex({ themeCluster: 1, knowledgeArea: 1, discipline: 1 });
    await SunburstMap.collection.createIndex({ 'position.level': 1, 'position.order': 1 });
    await SunburstMap.collection.createIndex({ isActive: 1 });
    await SunburstMap.collection.createIndex({ toolTechnology: 1 });
    console.log('✅ Database indexes created');
    
    // Step 8: Summary statistics
    const totalEntries = await SunburstMap.countDocuments();
    const uniqueThemeClusters = await SunburstMap.distinct('themeCluster');
    const uniqueKnowledgeAreas = await SunburstMap.distinct('knowledgeArea');
    const uniqueDisciplines = await SunburstMap.distinct('discipline');
    const uniqueTools = await SunburstMap.distinct('toolTechnology');
    
    console.log('\n📈 Import Summary:');
    console.log(`• Total entries: ${totalEntries}`);
    console.log(`• Theme clusters: ${uniqueThemeClusters.length}`);
    console.log(`• Knowledge areas: ${uniqueKnowledgeAreas.length}`);
    console.log(`• Disciplines: ${uniqueDisciplines.length}`);
    console.log(`• Tools/Technologies: ${uniqueTools.length}`);
    
    console.log('\n🎯 Theme Clusters:');
    uniqueThemeClusters.forEach(cluster => console.log(`  - ${cluster}`));
    
    console.log('\n🚀 Clean and import process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during clean and import:', error.message);
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
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV file not found at: ${CSV_PATH}`);
  process.exit(1);
}

// Run the script
cleanAndImportData(); 