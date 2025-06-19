import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { dbConnect, ContentModule, User, Notification } from '@/app/utils/models';
import SunburstMap from '@/app/utils/SunburstMap';

// Interface for Sunburst CSV data
interface SunburstCSVRow {
  themeCluster: string;
  knowledgeArea: string;
  discipline: string;
  roleSystemOrientation: string;
  toolTechnology: string;
  description?: string;
  voiceHook?: string;
  level?: number;
  order?: number;
  guestSpeakerName?: string;
  guestSpeakerTitle?: string;
  guestSpeakerOrg?: string;
}

// Interface for Content CSV data
interface ContentCSVRow {
  toolkitContentStructure?: string;
  type: string;
  title: string;
  narrative: string;
  hook?: string;
  coreTopics?: string;
  linkedKnowledgeArea: string;
  linkedDisciplines: string;
  formats?: string;
  tools?: string;
  guestSpeaker?: string;
  guestSpeakerJobTitle?: string;
  guestSpeakerCompany?: string;
  videoLink?: string;
  references?: string;
}

// Enum for CSV types
enum CSVType {
  SUNBURST = 'sunburst',
  CONTENT = 'content',
  UNKNOWN = 'unknown'
}

function detectCSVType(headers: string[]): CSVType {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_\-\/]/g, ''));
  
  // Check for sunburst-specific headers (including typo variations)
  const sunburstHeaders = ['discipline', 'knowledgearea', 'tooltechnology', 'toolstechnology', 'tooltehcnology', 'rolesystemorientation', 'rolesyatemorientation', 'themecluster'];
  const contentHeaders = ['toolkitcontentstructure', 'type', 'title', 'narrative', 'linkedknowledgearea', 'linkeddisciplines'];
  
  const sunburstMatches = sunburstHeaders.filter(h => normalizedHeaders.includes(h)).length;
  const contentMatches = contentHeaders.filter(h => normalizedHeaders.includes(h)).length;
  
  if (sunburstMatches >= 3) return CSVType.SUNBURST;
  if (contentMatches >= 4) return CSVType.CONTENT;
  
  return CSVType.UNKNOWN;
}

function parseCSVText(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  // Enhanced CSV parsing to handle quoted fields with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
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
  
  return { headers, rows };
}

function parseSunburstCSV(headers: string[], rows: string[][]): SunburstCSVRow[] {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_\-\/]/g, ''));
  
  return rows.map((row, index) => {
    const rowData: any = {};
    normalizedHeaders.forEach((header, i) => {
      rowData[header] = row[i] || '';
    });
    
    return {
      themeCluster: rowData.themecluster || rowData.theme || '',
      knowledgeArea: rowData.knowledgearea || rowData.knowledge || '',
      discipline: rowData.discipline || '',
      roleSystemOrientation: rowData.rolesystemorientation || rowData.rolesyatemorientation || rowData.role || rowData.system || '',
      toolTechnology: rowData.tooltechnology || rowData.toolstechnology || rowData.tooltehcnology || rowData.tool || rowData.technology || '',
      description: rowData.description || '',
      voiceHook: rowData.voicehook || rowData.hook || '',
      level: parseInt(rowData.level) || 5,
      order: parseInt(rowData.order) || index + 1,
      guestSpeakerName: rowData.guestspeakername || rowData.guestspeaker || '',
      guestSpeakerTitle: rowData.guestspeakertitle || rowData.title || '',
      guestSpeakerOrg: rowData.guestspeakerorg || rowData.organization || '',
    };
  });
}

function parseContentCSV(headers: string[], rows: string[][]): ContentCSVRow[] {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  
  return rows.map((row) => {
    const rowData: any = {};
    normalizedHeaders.forEach((header, i) => {
      rowData[header] = row[i] || '';
    });
    
    return {
      toolkitContentStructure: rowData.toolkitcontentstructure || '',
      type: rowData.type || 'video',
      title: rowData.title || '',
      narrative: rowData.narrative || rowData.description || '',
      hook: rowData.hook || rowData.voicehook || '',
      coreTopics: rowData.coretopics || rowData.topics || '',
      linkedKnowledgeArea: rowData.linkedknowledgearea || rowData.knowledgearea || '',
      linkedDisciplines: rowData.linkeddisciplines || rowData.discipline || '',
      formats: rowData.formats || '',
      tools: rowData.tools || '',
      guestSpeaker: rowData.guestspeaker || '',
      guestSpeakerJobTitle: rowData.guestspeakerjobtitle || rowData.guestspeakertitle || '',
      guestSpeakerCompany: rowData.guestspeakercompany || rowData.guestspeakerorg || '',
      videoLink: rowData.videolink || rowData.video || rowData.youtubeurl || '',
      references: rowData.references || '',
    };
  });
}

async function validateAndProcessSunburstData(data: SunburstCSVRow[], userId: string) {
  const validatedData: any[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  
  // Create hierarchical maps to track unique entries at each level
  const hierarchy = {
    level1: new Map<string, any>(), // Theme Clusters
    level2: new Map<string, any>(), // Knowledge Areas
    level3: new Map<string, any>(), // Disciplines
    level4: new Map<string, any>(), // Role/System Orientations
    level5: new Map<string, any>(), // Tool/Technologies
  };

  for (const [index, row] of data.entries()) {
    const lineNumber = index + 2;

    // Validation
    if (!row.themeCluster || !row.knowledgeArea || !row.discipline || !row.toolTechnology) {
      errors.push(`Line ${lineNumber}: Missing required fields (themeCluster, knowledgeArea, discipline, toolTechnology)`);
      continue;
    }

    // Build hierarchical keys
    const keys = {
      level1: row.themeCluster.trim(),
      level2: `${row.themeCluster.trim()}|${row.knowledgeArea.trim()}`,
      level3: `${row.themeCluster.trim()}|${row.knowledgeArea.trim()}|${row.discipline.trim()}`,
      level4: `${row.themeCluster.trim()}|${row.knowledgeArea.trim()}|${row.discipline.trim()}|${row.roleSystemOrientation?.trim() || 'General'}`,
      level5: `${row.themeCluster.trim()}|${row.knowledgeArea.trim()}|${row.discipline.trim()}|${row.roleSystemOrientation?.trim() || 'General'}|${row.toolTechnology.trim()}`
    };

    // Check if this exact combination already exists
    if (hierarchy.level5.has(keys.level5)) {
      duplicates.push(`Line ${lineNumber}: Entry already exists for ${row.toolTechnology} in ${row.discipline}`);
      continue;
    }

    // Level 1: Theme Cluster
    if (!hierarchy.level1.has(keys.level1)) {
      hierarchy.level1.set(keys.level1, {
        themeCluster: row.themeCluster.trim(),
        knowledgeArea: row.themeCluster.trim(), // For level 1, knowledge area = theme cluster
        discipline: row.themeCluster.trim(),
        roleSystemOrientation: row.themeCluster.trim(),
        toolTechnology: row.themeCluster.trim(),
        description: `Theme cluster: ${row.themeCluster.trim()}`,
        position: {
          level: 1,
          order: hierarchy.level1.size + 1,
        },
        isActive: true,
        createdBy: userId,
      });
    }

    // Level 2: Knowledge Area
    if (!hierarchy.level2.has(keys.level2)) {
      hierarchy.level2.set(keys.level2, {
        themeCluster: row.themeCluster.trim(),
        knowledgeArea: row.knowledgeArea.trim(),
        discipline: row.knowledgeArea.trim(), // For level 2, discipline = knowledge area
        roleSystemOrientation: row.knowledgeArea.trim(),
        toolTechnology: row.knowledgeArea.trim(),
        description: `Knowledge area: ${row.knowledgeArea.trim()} in ${row.themeCluster.trim()}`,
        position: {
          level: 2,
          order: hierarchy.level2.size + 1,
        },
        parentKey: keys.level1,
        isActive: true,
        createdBy: userId,
      });
    }

    // Level 3: Discipline
    if (!hierarchy.level3.has(keys.level3)) {
      hierarchy.level3.set(keys.level3, {
        themeCluster: row.themeCluster.trim(),
        knowledgeArea: row.knowledgeArea.trim(),
        discipline: row.discipline.trim(),
        roleSystemOrientation: row.discipline.trim(), // For level 3, role = discipline
        toolTechnology: row.discipline.trim(),
        description: `Discipline: ${row.discipline.trim()} in ${row.knowledgeArea.trim()}`,
        position: {
          level: 3,
          order: hierarchy.level3.size + 1,
        },
        parentKey: keys.level2,
        isActive: true,
        createdBy: userId,
      });
    }

    // Level 4: Role/System Orientation
    if (!hierarchy.level4.has(keys.level4)) {
      hierarchy.level4.set(keys.level4, {
        themeCluster: row.themeCluster.trim(),
        knowledgeArea: row.knowledgeArea.trim(),
        discipline: row.discipline.trim(),
        roleSystemOrientation: row.roleSystemOrientation?.trim() || 'General',
        toolTechnology: row.roleSystemOrientation?.trim() || 'General',
        description: `Role/System: ${row.roleSystemOrientation?.trim() || 'General'} in ${row.discipline.trim()}`,
        position: {
          level: 4,
          order: hierarchy.level4.size + 1,
        },
        parentKey: keys.level3,
        isActive: true,
        createdBy: userId,
      });
    }

    // Level 5: Tool/Technology (leaf level)
    hierarchy.level5.set(keys.level5, {
      themeCluster: row.themeCluster.trim(),
      knowledgeArea: row.knowledgeArea.trim(),
      discipline: row.discipline.trim(),
      roleSystemOrientation: row.roleSystemOrientation?.trim() || 'General',
      toolTechnology: row.toolTechnology.trim(),
      description: row.description || `${row.toolTechnology.trim()} for ${row.roleSystemOrientation?.trim() || 'General'} in ${row.discipline.trim()}`,
      voiceHook: row.voiceHook?.trim(),
      position: {
        level: 5,
        order: hierarchy.level5.size + 1,
      },
      parentKey: keys.level4,
      guestSpeaker: row.guestSpeakerName ? {
        name: row.guestSpeakerName.trim(),
        title: row.guestSpeakerTitle?.trim() || '',
        organization: row.guestSpeakerOrg?.trim() || '',
      } : undefined,
      relatedContent: [],
      isActive: true,
      createdBy: userId,
    });
  }

  // Convert maps to arrays and establish parent-child relationships
  const allEntries = new Map<string, any>();
  
  // First pass: create all entries
  [hierarchy.level1, hierarchy.level2, hierarchy.level3, hierarchy.level4, hierarchy.level5].forEach(levelMap => {
    levelMap.forEach((entry, key) => {
      allEntries.set(key, entry);
      validatedData.push(entry);
    });
  });

  return { validatedData, duplicates, errors, allEntries };
}

async function insertSunburstDataWithHierarchy(validatedData: any[], allEntries: Map<string, any>) {
  const createdEntries = new Map<string, any>();
  
  // Insert in order from level 1 to 5 to establish parent relationships
  for (let level = 1; level <= 5; level++) {
    const levelEntries = validatedData.filter(entry => entry.position.level === level);
    console.log(`📍 Level ${level}: Processing ${levelEntries.length} entries...`);
    
    // Batch insert for better performance
    const entriesToInsert = [];
    
    for (const entry of levelEntries) {
      // Set parent ID if this entry has a parent
      if (entry.parentKey && createdEntries.has(entry.parentKey)) {
        entry.position.parentId = createdEntries.get(entry.parentKey)._id;
      }
      
      // Remove the parentKey before saving (it's not part of the schema)
      delete entry.parentKey;
      
      entriesToInsert.push(entry);
    }
    
    try {
      // Batch insert all entries for this level
      const insertedEntries = await SunburstMap.insertMany(entriesToInsert);
      
      // Store the created entries for parent reference
      insertedEntries.forEach((savedEntry, index) => {
        const originalEntry = levelEntries[index];
        const entryKey = level === 1 ? originalEntry.themeCluster :
                        level === 2 ? `${originalEntry.themeCluster}|${originalEntry.knowledgeArea}` :
                        level === 3 ? `${originalEntry.themeCluster}|${originalEntry.knowledgeArea}|${originalEntry.discipline}` :
                        level === 4 ? `${originalEntry.themeCluster}|${originalEntry.knowledgeArea}|${originalEntry.discipline}|${originalEntry.roleSystemOrientation}` :
                        `${originalEntry.themeCluster}|${originalEntry.knowledgeArea}|${originalEntry.discipline}|${originalEntry.roleSystemOrientation}|${originalEntry.toolTechnology}`;
        
        createdEntries.set(entryKey, savedEntry);
      });
      
      console.log(`✅ Level ${level}: Successfully inserted ${insertedEntries.length} entries`);
    } catch (error) {
      console.error(`❌ Level ${level}: Error inserting entries:`, error);
      throw error;
    }
  }
  
  return createdEntries;
}

async function validateAndProcessContentData(data: ContentCSVRow[], userId: string) {
  const validatedData: any[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  for (const [index, row] of data.entries()) {
    const lineNumber = index + 2;

    // Validation
    if (!row.title || !row.narrative || !row.linkedKnowledgeArea || !row.linkedDisciplines) {
      errors.push(`Line ${lineNumber}: Missing required fields (title, narrative, linkedKnowledgeArea, linkedDisciplines)`);
      continue;
    }

    // Check for duplicates
    const existing = await ContentModule.findOne({
      title: row.title,
      knowledgeArea: row.linkedKnowledgeArea,
    });

    if (existing) {
      duplicates.push(`Line ${lineNumber}: Content already exists with title "${row.title}"`);
      continue;
    }

    // Determine content type
    let contentType = 'document';
    if (row.videoLink || row.type?.toLowerCase().includes('video')) {
      contentType = 'video';
    } else if (row.type?.toLowerCase().includes('audio')) {
      contentType = 'audio';
    } else if (row.type?.toLowerCase().includes('link')) {
      contentType = 'link';
    } else if (row.type?.toLowerCase().includes('interactive')) {
      contentType = 'interactive';
    }

    // Prepare data for insertion
    const contentEntry: any = {
      title: row.title,
      description: row.narrative,
      contentType,
      youtubeUrl: row.videoLink || undefined,
      voiceHook: row.hook,
      tags: row.coreTopics ? row.coreTopics.split(',').map(t => t.trim()).filter(Boolean) : [],
      knowledgeArea: row.linkedKnowledgeArea,
      discipline: row.linkedDisciplines,
      relatedTools: row.tools ? row.tools.split(',').map(t => t.trim()).filter(Boolean) : [],
      createdBy: userId,
      moderationStatus: 'pending',
    };

    validatedData.push(contentEntry);
  }

  return { validatedData, duplicates, errors };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const csvFile = formData.get('csvFile') as File;
    const importType = formData.get('importType') as string;
    
    if (!csvFile) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const csvText = await csvFile.text();
    const { headers, rows } = parseCSVText(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid data found in CSV' }, { status: 400 });
    }

    // Auto-detect CSV type if not specified
    const detectedType = importType || detectCSVType(headers);
    
    if (detectedType === CSVType.UNKNOWN) {
      return NextResponse.json({ 
        error: 'Unable to determine CSV type. Please ensure your CSV has the correct headers for either sunburst or content data.',
        supportedFormats: {
          sunburst: ['discipline', 'knowledge area', 'tool/technology', 'role/system orientation', 'theme cluster'],
          content: ['type', 'title', 'narrative', 'linked knowledge area', 'linked disciplines']
        }
      }, { status: 400 });
    }

    let result;
    let insertedCount = 0;
    let collection = '';

          if (detectedType === CSVType.SUNBURST) {
        console.log('🧹 Cleaning existing sunburst data...');
        
        // Always clear existing sunburst data before importing new data
        const deleteResult = await SunburstMap.deleteMany({});
        console.log(`✅ Cleared ${deleteResult.deletedCount} existing sunburst entries`);
        
        const parsedData = parseSunburstCSV(headers, rows);
        console.log(`📊 Processing ${parsedData.length} rows into hierarchical structure...`);
        
        const { validatedData, duplicates, errors, allEntries } = await validateAndProcessSunburstData(parsedData, (user as any)._id.toString());
        
        console.log(`🔍 Validation complete: ${validatedData.length} entries to insert, ${duplicates.length} duplicates, ${errors.length} errors`);
        
        if (validatedData.length > 0) {
          console.log('💾 Inserting hierarchical sunburst data...');
          const createdEntries = await insertSunburstDataWithHierarchy(validatedData, allEntries);
          insertedCount = createdEntries.size;
          console.log(`✅ Successfully created ${insertedCount} hierarchical entries`);
        }
        collection = 'sunburst';
      result = { validatedData, duplicates, errors };
    } else {
      const parsedData = parseContentCSV(headers, rows);
      const { validatedData, duplicates, errors } = await validateAndProcessContentData(parsedData, (user as any)._id.toString());
      
      if (validatedData.length > 0) {
        const insertResult = await ContentModule.insertMany(validatedData);
        insertedCount = insertResult.length;
        
        // Notify other admins about bulk content import
        if (insertedCount > 0) {
          const admins = await User.find({ role: 'admin', email: { $ne: session.user.email } });
          const notifications = admins.map(admin => ({
            userId: (admin as any)._id,
            type: 'new_content',
            title: 'Bulk Content Import',
            message: `${insertedCount} new content modules have been imported by ${user.email}`,
            actionUrl: '/admin/dashboard?tab=content',
            relatedItemType: 'content',
          }));
          
          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
          }
        }
      }
      collection = 'content';
      result = { validatedData, duplicates, errors };
    }

    return NextResponse.json({
      success: true,
      message: `CSV import completed for ${collection} data`,
      type: detectedType,
      stats: {
        totalRows: rows.length,
        inserted: insertedCount,
        duplicates: result.duplicates.length,
        errors: result.errors.length,
      },
      details: {
        duplicates: result.duplicates,
        errors: result.errors,
      },
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const templateType = url.searchParams.get('template') || 'sunburst';

    let sampleCSV = '';
    let filename = '';

    if (templateType === 'content') {
      sampleCSV = `Type,Title,Narrative,Hook,Core Topics,Linked Knowledge Area,Linked Disciplines,Formats,Tools,Guest Speaker,Guest Speaker Job Title,Guest Speaker Company,Video Link,References
"video","Introduction to Machine Learning","A comprehensive introduction to machine learning concepts and algorithms","Start your AI journey with this essential guide","machine learning,algorithms,data science","Machine Learning","Computer Science","video,interactive","Python,Scikit-learn","Dr. John Smith","Senior Data Scientist","TechCorp","https://youtube.com/watch?v=example","https://example.com/references"
"document","Data Visualization Guide","Learn to create compelling data visualizations","Transform data into visual stories","visualization,charts,design","Data Analysis","Statistics","document,interactive","R,D3.js,Tableau","","","","","https://example.com/viz-guide"`;
      filename = 'content_template.csv';
    } else {
      sampleCSV = `Theme Cluster,Knowledge Area,Discipline,Role System Orientation,Tool Technology,Description,Voice Hook,Level,Order,Guest Speaker Name,Guest Speaker Title,Guest Speaker Org
"Artificial Intelligence","Machine Learning","Computer Science","Data Scientist","Python","Python programming language for AI and ML","Discover Python for AI development",5,1,"Dr. Emily Chen","AI Researcher","Stanford Lab"
"Data Science","Data Analysis","Statistics","Data Analyst","R","Statistical computing language","Unlock insights with R programming",5,2,"","",""
"Web Development","Frontend","Computer Science","Frontend Developer","React","JavaScript library for UIs","Build modern web interfaces",5,3,"","",""`;
      filename = 'sunburst_template.csv';
    }

    return new NextResponse(sampleCSV, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('CSV template error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    );
  }
} 