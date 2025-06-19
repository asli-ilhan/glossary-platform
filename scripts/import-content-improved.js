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
  // Enhanced fields
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
  relatedContent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContentModule' }]
}, { timestamps: true });

// Manual content entries based on the CSV structure I can see
const MANUAL_CONTENT_ENTRIES = [
  {
    toolkitStructure: "1",
    title: "Welcome to MA IE + The Online Toolkit",
    description: "Introduce the course, team, and what 'Internet Equalities' means. Explain the aims of the toolkit, the kind of knowledge it holds, and how students, collaborators, and the public can engage with and expand it.",
    contentType: "video",
    voiceHook: "What are Internet Equalities and how do we change them?",
    tags: ["Internet Inequality", "Practice-Based Research", "Critical Literacy", "Systemic Power"],
    knowledgeArea: "Practice-Led Research",
    discipline: "Participatory Methods",
    relatedTools: ["Zoom", "Miro", "motion graphics"],
    coreTopics: ["Internet Inequality", "Practice-Based Research", "Critical Literacy", "Systemic Power"],
    formats: ["Video interview-style intro", "graphic overlays of themes", "toolkit walkthrough"],
    guestSpeaker: {
      name: "Course Leads (Ceren, Cindy, Aslı, Joana, Batool, Yasemin) + past MA IE grads + MA IE current students",
      title: "",
      company: ""
    },
    references: "Escobar, Arturo. Designs for the Pluriverse (2018) – decolonial design as relational, collective practice; Costanza-Chock, Sasha. Design Justice: Community-Led Practices to Build the Worlds We Need (2020)"
  },
  {
    toolkitStructure: "2",
    title: "They're Listening to Me: How Platforms Harvest Our Lives",
    description: "From cookies to microphones to trackers: what does 'data extractivism' actually mean, and how is it embedded in everyday interactions?",
    contentType: "video",
    voiceHook: "Why do I get ads for things I only whispered?",
    tags: ["Data Extractivism", "Surveillance Studies", "Signals", "Behavioural Inference"],
    knowledgeArea: "Critical Data Studies",
    discipline: "Internet Studies",
    relatedTools: ["Blacklight"],
    coreTopics: ["Data Extractivism", "Surveillance Studies", "Signals & Behavioural Inference"],
    formats: ["Animated explainer", "phone simulation", "tracker audit walkthrough"],
    guestSpeaker: {
      name: "Lina Dencik, Mimi Onuoha, Liliana Bounegru, Joana Chicau",
      title: "Co-director, Data Justice Lab; Artist & Researcher; Lecturer",
      company: "NYU, Princeton, Public Data Lab"
    }
  },
  {
    toolkitStructure: "3",
    title: "What Is AI (And Why Is It Biased)?",
    description: "A foundational explainer covering what AI and machine learning are, how data is used to train models, and why inequality is embedded into these systems. Anchored in MA IE's critical lens.",
    contentType: "video",
    voiceHook: "How can machines be biased and who decides what they learn?",
    tags: ["Artificial Intelligence", "Machine Learning", "Dataset Construction", "Algorithmic Harm", "Social Bias"],
    knowledgeArea: "AI Ethics",
    discipline: "Critical Data Studies",
    relatedTools: ["Concept visualisations", "model training animations"],
    coreTopics: ["Artificial Intelligence", "Machine Learning", "Dataset Construction", "Algorithmic Harm", "Social Bias"],
    formats: ["Visual explainer with metaphors", "side-by-side examples", "training dataset walkthrough"]
  },
  {
    toolkitStructure: "4",
    title: "What's Behind Your Feed?",
    description: "Explore how recommender systems shape your world: who sees what, why, and who's left out.",
    contentType: "video",
    voiceHook: "Why do I never see what my friends see?",
    tags: ["Algorithmic Infrastructure", "Optimisation Loops", "Moderation Logic"],
    knowledgeArea: "Media & Platform Studies",
    discipline: "Science and Technology Studies (STS)",
    relatedTools: [],
    coreTopics: ["Algorithmic Infrastructure", "Optimisation Loops", "Moderation Logic"],
    formats: ["Story simulation", "whiteboard diagram"]
  },
  {
    toolkitStructure: "5",
    title: "Terms of Service Are a Trap (And They're Meant to Be)",
    description: "How platform governance exploits consent fatigue and obscures risk.",
    contentType: "interactive",
    voiceHook: "I didn't read the terms… and they know it",
    tags: ["Digital Rights", "Consent Numbness", "GDPR", "UX Dark Patterns"],
    knowledgeArea: "Law & Policy",
    discipline: "User Experience (UX)",
    relatedTools: ["Blacklight", "EULAlyzer", "security headers"],
    coreTopics: ["Digital Rights", "Consent Numbness", "GDPR", "UX Dark Patterns"],
    formats: ["Infodrama", "mock trial of a ToS agreement", "diagram of opt-in traps"]
  },
  {
    toolkitStructure: "11",
    title: "Sounds Like Code: Creative Systems for Live Performance",
    description: "Discover how artists and coders build live performances using code, visuals, and sound.",
    contentType: "video",
    voiceHook: "Can code become a jam session?",
    tags: ["Live Coding", "Algorithmic Expression", "Creative Systems", "Temporal Systems"],
    knowledgeArea: "Critical / Creative Coding",
    discipline: "Communication & Narrative Studies",
    relatedTools: ["Hydra", "TidalCycles", "Sonic Pi", "OpenFrameworks", "Cinder"],
    coreTopics: ["Live Coding", "Algorithmic Expression", "Creative Systems", "Temporal Systems"],
    formats: ["Demo-led walkthroughs", "student interviews", "live jam clips"]
  },
  {
    toolkitStructure: "12",
    title: "Feeling the System: Sensors, Movement & Real-Time Interaction",
    description: "How can bodies, touch, and motion become part of a system interface?",
    contentType: "interactive",
    voiceHook: "What if the interface was your skin?",
    tags: ["Computational Embodiment", "Real-Time Interaction", "Embedded Sensors", "TinyML Systems"],
    knowledgeArea: "Embodied Interaction",
    discipline: "Human-Computer Interaction (HCI)",
    relatedTools: ["Capacitive sensors", "Arduino", "TinyML", "TensorFlow Lite"],
    coreTopics: ["Computational Embodiment", "Real-Time Interaction", "Embedded Sensors", "TinyML Systems"],
    formats: ["System build demo", "touch-based interaction project showcase"]
  },
  {
    toolkitStructure: "15",
    title: "Train Your Own Inclusive Classifier",
    description: "Learn to build machine learning classifiers while understanding dataset bias and small-scale training approaches.",
    contentType: "interactive",
    voiceHook: "Build AI that actually works for everyone",
    tags: ["Dataset bias", "small-scale training", "Machine Learning"],
    knowledgeArea: "AI Ethics",
    discipline: "Data Science",
    relatedTools: ["Teachable Machine", "TensorFlow.js"],
    coreTopics: ["Dataset bias", "small-scale training"],
    formats: ["Mini-workshop"]
  },
  {
    toolkitStructure: "17",
    title: "ToS Dissection Lab",
    description: "Critically analyze Terms of Service and privacy policies using UX critique and tracker auditing tools.",
    contentType: "interactive",
    voiceHook: "What are you really agreeing to?",
    tags: ["UX critique", "Blacklight audit", "Privacy"],
    knowledgeArea: "Law & Policy",
    discipline: "User Experience (UX)",
    relatedTools: ["Blacklight", "TOS;DR", "EULAlyzer"],
    coreTopics: ["UX critique", "Blacklight audit"],
    formats: ["Mini-workshop"]
  },
  {
    toolkitStructure: "22",
    title: "Live Code Visuals & Sound Systems",
    description: "Create real-time visual and audio performances using live coding techniques.",
    contentType: "interactive",
    voiceHook: "Make music with code in real time",
    tags: ["Creative systems demo", "Live Coding", "Performance"],
    knowledgeArea: "Critical / Creative Coding",
    discipline: "Communication & Narrative Studies",
    relatedTools: ["Hydra", "Sonic Pi", "TidalCycles"],
    coreTopics: ["Creative systems demo"],
    formats: ["Mini-workshop"]
  }
];

async function findAdvancedSunburstConnections(contentEntry, SunburstMap) {
  const relatedEntries = new Set(); // Use Set to avoid duplicates
  
  try {
    console.log(`\n🔍 Finding connections for: "${contentEntry.title}"`);
    
    // 1. Direct tool matches
    for (const tool of contentEntry.relatedTools) {
      const toolMatches = await SunburstMap.find({
        toolTechnology: { $regex: tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      });
      toolMatches.forEach(match => {
        relatedEntries.add(match._id.toString());
        console.log(`  ✓ Tool match: "${tool}" -> "${match.toolTechnology}"`);
      });
    }
    
    // 2. Knowledge area semantic matching
    const knowledgeKeywords = contentEntry.knowledgeArea.split(/[\s&+,]/).filter(word => word.length > 2);
    for (const keyword of knowledgeKeywords) {
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const knowledgeMatches = await SunburstMap.find({
        $or: [
          { knowledgeArea: { $regex: safeKeyword, $options: 'i' } },
          { discipline: { $regex: safeKeyword, $options: 'i' } }
        ]
      });
      knowledgeMatches.forEach(match => {
        relatedEntries.add(match._id.toString());
        console.log(`  ✓ Knowledge match: "${keyword}" -> "${match.knowledgeArea}" / "${match.discipline}"`);
      });
    }
    
    // 3. Topic/tag semantic matching with theme clusters
    for (const tag of contentEntry.tags) {
      const tagWords = tag.split(/[\s&+,]/).filter(word => word.length > 2);
      for (const word of tagWords) {
        const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tagMatches = await SunburstMap.find({
          $or: [
            { themeCluster: { $regex: safeWord, $options: 'i' } },
            { knowledgeArea: { $regex: safeWord, $options: 'i' } },
            { roleSystemOrientation: { $regex: safeWord, $options: 'i' } }
          ]
        });
        tagMatches.forEach(match => {
          relatedEntries.add(match._id.toString());
          console.log(`  ✓ Topic match: "${word}" -> "${match.themeCluster}"`);
        });
      }
    }
    
    // 4. Discipline exact and partial matches
    const disciplineMatches = await SunburstMap.find({
      discipline: { $regex: contentEntry.discipline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    });
    disciplineMatches.forEach(match => {
      relatedEntries.add(match._id.toString());
      console.log(`  ✓ Discipline match: "${contentEntry.discipline}" -> "${match.discipline}"`);
    });
    
    const finalEntries = Array.from(relatedEntries).map(id => new mongoose.Types.ObjectId(id));
    console.log(`  🎯 Total connections found: ${finalEntries.length}`);
    
    return finalEntries;
    
  } catch (error) {
    console.error(`❌ Error linking sunburst entries for "${contentEntry.title}":`, error.message);
    return [];
  }
}

async function updateSunburstWithContentLinks(contentModules, SunburstMap) {
  console.log('\n🔗 Creating bidirectional links between content and sunburst data...');
  
  let totalLinks = 0;
  for (const content of contentModules) {
    if (content.relatedSunburstEntries && content.relatedSunburstEntries.length > 0) {
      await SunburstMap.updateMany(
        { _id: { $in: content.relatedSunburstEntries } },
        { $addToSet: { relatedContent: content._id } }
      );
      totalLinks += content.relatedSunburstEntries.length;
    }
  }
  
  console.log(`✅ Created ${totalLinks} bidirectional links`);
}

async function importContentAndLink() {
  try {
    console.log('🔄 Starting improved content import and linking process...');
    
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
    
    // Step 2: Get admin user
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
    
    // Step 3: Process manual content entries
    console.log(`📝 Processing ${MANUAL_CONTENT_ENTRIES.length} manually curated content entries...`);
    
    const processedContent = [];
    for (const entry of MANUAL_CONTENT_ENTRIES) {
      const contentEntry = {
        ...entry,
        createdBy: adminUser._id,
        moderationStatus: 'approved',
        relatedSunburstEntries: []
      };
      
      // Find sunburst connections using improved matching
      contentEntry.relatedSunburstEntries = await findAdvancedSunburstConnections(contentEntry, SunburstMap);
      processedContent.push(contentEntry);
    }
    
    // Step 4: Insert content data
    console.log(`\n💾 Inserting ${processedContent.length} content modules...`);
    if (processedContent.length > 0) {
      const insertResult = await ContentModule.insertMany(processedContent);
      console.log(`✅ Successfully inserted ${insertResult.length} content modules`);
      
      // Step 5: Update sunburst entries with back-references
      await updateSunburstWithContentLinks(insertResult, SunburstMap);
    }
    
    // Step 6: Summary statistics
    const totalContent = await ContentModule.countDocuments();
    const totalSunburst = await SunburstMap.countDocuments();
    const contentWithLinks = await ContentModule.countDocuments({ relatedSunburstEntries: { $ne: [] } });
    const sunburstWithContent = await SunburstMap.countDocuments({ relatedContent: { $ne: [] } });
    
    // Get some sample connections for verification
    const sampleConnections = await ContentModule.find({ relatedSunburstEntries: { $ne: [] } })
      .populate('relatedSunburstEntries', 'toolTechnology knowledgeArea themeCluster')
      .limit(3);
    
    console.log('\n📈 Import and Linking Summary:');
    console.log(`• Total content modules: ${totalContent}`);
    console.log(`• Total sunburst entries: ${totalSunburst}`);
    console.log(`• Content modules with sunburst links: ${contentWithLinks}`);
    console.log(`• Sunburst entries with content links: ${sunburstWithContent}`);
    console.log(`• Connection success rate: ${((contentWithLinks / totalContent) * 100).toFixed(1)}%`);
    
    // Content type breakdown
    const contentTypes = await ContentModule.aggregate([
      { $group: { _id: '$contentType', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📺 Content Types:');
    contentTypes.forEach(type => console.log(`  - ${type._id}: ${type.count}`));
    
    // Sample connections
    console.log('\n🔗 Sample Connections:');
    sampleConnections.forEach(content => {
      console.log(`\n"${content.title}"`);
      content.relatedSunburstEntries.forEach(sunburst => {
        console.log(`  ↳ ${sunburst.toolTechnology} (${sunburst.knowledgeArea} - ${sunburst.themeCluster})`);
      });
    });
    
    console.log('\n🚀 Improved content import and linking completed successfully!');
    
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

// Run the script
importContentAndLink(); 