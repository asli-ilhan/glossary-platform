'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { select, selectAll } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { forceSimulation, forceRadial, forceCollide, forceManyBody } from 'd3-force';
// Import transition differently for D3 v6+
import 'd3-transition';
import { zoom } from 'd3-zoom';

interface SunburstNode {
  _id: string;
  themeCluster: string;
  knowledgeArea: string;
  discipline: string;
  roleSystemOrientation: string;
  toolTechnology: string;
  inequality: string; // Add inequality field
  description: string;
  voiceHook?: string;
  relatedContent?: {
    _id: string;
    title: string;
    contentType: 'video' | 'audio' | 'document' | 'link' | 'interactive';
    moderationStatus: 'pending' | 'approved' | 'rejected';
    description?: string;
    voiceHook?: string;
    youtubeUrl?: string;
    mediaUrl?: string;
    fileUrl?: string;
    tags?: string[];
  }[];
  guestSpeaker?: {
    name: string;
    title: string;
    organization: string;
  };
  position: {
    level: number;
    order: number;
  };
  isActive: boolean;
}

interface RadialNode {
  id: string;
  name: string;
  type: 'knowledgeArea' | 'discipline' | 'tool';
  level: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  connections: string[];
  connectionInequalities: Map<string, string>; // Map connection to inequality
  data?: SunburstNode;
  description?: string;
  voiceHook?: string;
  relatedContent?: SunburstNode['relatedContent'];
  guestSpeaker?: SunburstNode['guestSpeaker'];
  hasContent?: boolean;
}

interface GlossaryTerm {
  _id: string;
    title: string;
  description: string;
  userId?: { _id: string; email: string };
  approved?: boolean;
  createdAt?: string;
}

interface TooltipData {
  name: string;
  level: number;
  description?: string;
  voiceHook?: string;
  relatedContent?: SunburstNode['relatedContent'];
  guestSpeaker?: {
    name: string;
    title: string;
    organization: string;
  };
  glossaryTerms?: GlossaryTerm[];
  x: number;
  y: number;
}

interface LayerDescription {
  _id: string;
  layer: string;
  entry: string;
  description: string;
}

const SunburstVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SunburstNode[]>([]);
  const [layerDescriptions, setLayerDescriptions] = useState<LayerDescription[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [selectedGlossaryTerms, setSelectedGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [glossaryModalTitle, setGlossaryModalTitle] = useState('');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelContent, setSidePanelContent] = useState<{
    name: string;
    description?: string;
    voiceHook?: string;
    relatedContent: any[];
    guestSpeaker?: any;
    glossaryTerms?: GlossaryTerm[];
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [radialNodes, setRadialNodes] = useState<RadialNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [inequalityTypes, setInequalityTypes] = useState<string[]>([]);
  const [isStatsPanelCollapsed, setIsStatsPanelCollapsed] = useState(false);
  const [isInequalityPanelCollapsed, setIsInequalityPanelCollapsed] = useState(false);

  const [visualizationStats, setVisualizationStats] = useState({
    totalDataPoints: 0,
    totalConnections: 0,
    relatedContentCount: 0,
    glossaryTermsCount: 0,
    disciplineCount: 0,
    knowledgeAreaCount: 0,
    toolCount: 0,
    contributorSubmissions: 0,
    activeContributors: 0
  });

  // Handle side panel close with animation
  const handleCloseSidePanel = useCallback(() => {
    setShowSidePanel(false);
    // Clear content after animation completes (500ms duration)
    if (sidePanelContent) {
      setTimeout(() => {
        setSidePanelContent(null);
      }, 500);
    }
  }, [sidePanelContent]);

  // Listen for help button click from parent
  useEffect(() => {
    const handleShowInstructions = () => {
      setShowInstructions(true);
    };
    
    window.addEventListener('showInstructions', handleShowInstructions);
    window.addEventListener('closeSidePanel', handleCloseSidePanel);
    return () => {
      window.removeEventListener('showInstructions', handleShowInstructions);
      window.removeEventListener('closeSidePanel', handleCloseSidePanel);
    };
  }, [handleCloseSidePanel]);

  // Track initial load completion (removed automatic instructions display)
  useEffect(() => {
    if (isInitialLoad && !loading && data.length > 0) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loading, data]);

  // Responsive resize handler - full width since panels are collapsible
  const handleResize = useCallback(() => {
    setDimensions({ 
      width: window.innerWidth - 40, // Account for padding only
      height: Math.min(window.innerHeight - 100, 1000) // Expanded height for better visualization containment
    });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Disable body scrolling when side panel is open
  useEffect(() => {
    if (showSidePanel) {
      // Disable scrolling on the body
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling on the body
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSidePanel]);



  // Fetch sunburst data, glossary terms, and layer descriptions
  const fetchData = useCallback(async () => {
      try {
        setLoading(true);
        
        // Fetch sunburst data
        const sunburstResponse = await fetch('/api/sunburst');
        if (!sunburstResponse.ok) {
          throw new Error('Failed to fetch sunburst data');
        }
        const sunburstData = await sunburstResponse.json();
        console.log('Fetched sunburst data from database:', sunburstData.length, 'items');
        // Log sample data to verify inequality field is present
        if (sunburstData.length > 0) {
          console.log('Inequality data available:', !!sunburstData[0].inequality);
        }
        
        // Fetch glossary terms
        const glossaryResponse = await fetch('/api/glossary');
        if (!glossaryResponse.ok) {
          throw new Error('Failed to fetch glossary data');
        }
        const glossaryData = await glossaryResponse.json();
        console.log('Fetched glossary terms:', glossaryData.length, 'terms');
        
        // Fetch layer descriptions
        const descriptionsResponse = await fetch('/api/layer-descriptions');
        if (!descriptionsResponse.ok) {
          throw new Error('Failed to fetch layer descriptions');
        }
        const descriptionsData = await descriptionsResponse.json();
        console.log('Fetched layer descriptions:', descriptionsData.length, 'descriptions');
        
        // Fetch real statistics
        const statisticsResponse = await fetch('/api/statistics');
        let realStats = null;
        if (statisticsResponse.ok) {
          realStats = await statisticsResponse.json();
          console.log('Fetched real statistics:', realStats);
        } else {
          console.warn('Failed to fetch real statistics, using fallback calculations');
        }
        
        setData(sunburstData);
        setGlossaryTerms(glossaryData || []);
        setLayerDescriptions(descriptionsData || []);
      
      // Calculate visualization statistics from actual database data
      const totalDataPoints = sunburstData.length;
      
      // Count related content linked to data points
      const relatedContentCount = sunburstData.reduce((count: number, item: SunburstNode) => {
        return count + (item.relatedContent?.filter(content => content.moderationStatus === 'approved').length || 0);
      }, 0);
      
      // Count glossary terms that match data points using the same logic as findMatchingGlossaryTerms
      let linkedGlossaryCount = 0;
      if (glossaryData && Array.isArray(glossaryData)) {
        const approvedTerms = glossaryData.filter((term: GlossaryTerm) => term.approved !== false);
        
        // Debug logging
        console.log('Total glossary terms:', glossaryData.length);
        console.log('Approved glossary terms:', approvedTerms.length);
        console.log('Sample approved terms:', approvedTerms.slice(0, 5).map(t => t.title));
                  console.log('Sample sunburst data:', sunburstData.slice(0, 3).map((item: SunburstNode) => ({
          toolTechnology: item.toolTechnology,
          themeCluster: item.themeCluster,
          knowledgeArea: item.knowledgeArea,
          discipline: item.discipline
        })));
        
        // Create a set to avoid counting the same term multiple times
        const matchedTermIds = new Set<string>();
        
        sunburstData.forEach((item: SunburstNode) => {
          // Check each field of the sunburst item
          const fieldsToCheck = [
            item.toolTechnology,
            item.themeCluster, 
            item.knowledgeArea,
            item.discipline,
            item.roleSystemOrientation
          ].filter(Boolean);
          
          fieldsToCheck.forEach(fieldValue => {
            const normalizedFieldValue = fieldValue?.toLowerCase().trim();
            if (!normalizedFieldValue) return;
            
            approvedTerms.forEach(term => {
              const termTitle = term.title.toLowerCase().trim();
              
              // Exact match or partial match (same logic as findMatchingGlossaryTerms)
              if (termTitle === normalizedFieldValue || 
                  termTitle.includes(normalizedFieldValue) || 
                  normalizedFieldValue.includes(termTitle)) {
                matchedTermIds.add(term._id);
                console.log('Match found:', termTitle, '<->', normalizedFieldValue);
              }
            });
          });
        });
        
        linkedGlossaryCount = matchedTermIds.size;
        console.log('Total linked glossary count:', linkedGlossaryCount);
      }
      
      // Count by categories
      const uniqueDisciplines = new Set(sunburstData.map((item: SunburstNode) => item.discipline).filter(Boolean));
      const uniqueKnowledgeAreas = new Set(sunburstData.map((item: SunburstNode) => item.knowledgeArea).filter(Boolean));
      const uniqueTools = new Set(sunburstData.map((item: SunburstNode) => item.toolTechnology).filter(Boolean));
      
      // Use real statistics if available, otherwise fall back to estimates
      const contributorSubmissions = realStats?.totalGlossaryEntries || linkedGlossaryCount;
      const activeContributors = realStats?.activeContributors || Math.max(1, Math.floor(contributorSubmissions / 3));
      
      setVisualizationStats({
        totalDataPoints,
        totalConnections: 0, // Will be calculated when radial nodes are created
        relatedContentCount,
        glossaryTermsCount: linkedGlossaryCount,
        disciplineCount: uniqueDisciplines.size,
        knowledgeAreaCount: uniqueKnowledgeAreas.size,
        toolCount: uniqueTools.size,
        contributorSubmissions,
        activeContributors
      });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for data updates from other parts of the application
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('Data update detected, refreshing visualization...');
      fetchData();
    };

    // Listen for various data update events
    window.addEventListener('glossaryUpdated', handleDataUpdate);
    window.addEventListener('contentUpdated', handleDataUpdate);
    window.addEventListener('csvImported', handleDataUpdate);
    window.addEventListener('sunburstUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('glossaryUpdated', handleDataUpdate);
      window.removeEventListener('contentUpdated', handleDataUpdate);
      window.removeEventListener('csvImported', handleDataUpdate);
      window.removeEventListener('sunburstUpdated', handleDataUpdate);
    };
  }, [fetchData]);



  // Function to match glossary terms with sunburst data
  const findMatchingGlossaryTerms = useCallback((sunburstName: string): GlossaryTerm[] => {
    if (!glossaryTerms.length) return [];
    
    const normalizedSunburstName = sunburstName.toLowerCase().trim();
    
    // Find exact matches first
    const exactMatches = glossaryTerms.filter(term => 
      term.title.toLowerCase() === normalizedSunburstName
    );
    
    if (exactMatches.length > 0) return exactMatches;

    // Find partial matches
    const partialMatches = glossaryTerms.filter(term => {
      const termTitle = term.title.toLowerCase().trim();
      return termTitle.includes(normalizedSunburstName) || 
             normalizedSunburstName.includes(termTitle);
    });
    
    return partialMatches;
  }, [glossaryTerms]);

  // Function to get layer description for an entry
  const getLayerDescription = useCallback((entryName: string, nodeType: string): string => {
    if (!layerDescriptions.length) return '';
    
    // Map node type to layer name
    const layerMap: Record<string, string> = {
      'knowledgeArea': 'Knowledge Area',
      'discipline': 'Discipline', 
      'tool': 'Tool / Technology'
    };
    
    const layerName = layerMap[nodeType];
    if (!layerName) return '';
    
    const description = layerDescriptions.find(desc => 
      desc.layer === layerName && desc.entry === entryName
    );
    
    return description?.description || '';
  }, [layerDescriptions]);

  // Check for URL parameter to open specific entry
  useEffect(() => {
    if (!loading && data.length > 0 && radialNodes.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const openEntry = urlParams.get('openEntry');
      
      if (openEntry) {
        // Find the matching node in radialNodes
        const matchingNode = radialNodes.find(node => 
          node.name.toLowerCase() === decodeURIComponent(openEntry).toLowerCase()
        );
        
        if (matchingNode) {
          // Open the side panel for this entry
          const matchingTerms = findMatchingGlossaryTerms(matchingNode.name);
          const layerDescription = getLayerDescription(matchingNode.name, matchingNode.type);
          
          setSidePanelContent({
            name: matchingNode.name,
            description: layerDescription || matchingNode.description || matchingNode.data?.description || 'No description available',
            voiceHook: matchingNode.voiceHook || matchingNode.data?.voiceHook,
            relatedContent: matchingNode.relatedContent || matchingNode.data?.relatedContent || [],
            guestSpeaker: matchingNode.guestSpeaker || matchingNode.data?.guestSpeaker,
            glossaryTerms: matchingTerms
          });
          setShowSidePanel(true);
          
          // Clean up the URL parameter
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('openEntry');
          window.history.replaceState({}, '', newUrl.toString());
          
          console.log('Auto-opened side panel for:', matchingNode.name);
        }
      }
    }
  }, [loading, data, radialNodes, findMatchingGlossaryTerms]);

  // Transform data into radial nodes structure
  const transformDataToRadialNodes = useCallback((rawData: SunburstNode[]): RadialNode[] => {
    const nodeMap = new Map<string, RadialNode>();
    const connections = new Map<string, Set<string>>();
    const connectionToInequality = new Map<string, string>(); // Map specific connections to inequalities

    // Create nodes for each level and track inequalities for specific data combinations
    rawData.forEach(item => {
      // Knowledge Area (outer ring)
      const kaId = `ka-${item.knowledgeArea}`;
      if (!nodeMap.has(kaId)) {
        nodeMap.set(kaId, {
          id: kaId,
          name: item.knowledgeArea,
          type: 'knowledgeArea',
          level: 3,
          connections: [],
          connectionInequalities: new Map(),
          data: item
        });
        connections.set(kaId, new Set());
      }

      // Discipline (middle ring)
      const discId = `disc-${item.discipline}`;
      if (!nodeMap.has(discId)) {
        nodeMap.set(discId, {
          id: discId,
          name: item.discipline,
          type: 'discipline',
          level: 2,
          connections: [],
          connectionInequalities: new Map(),
          data: item
        });
        connections.set(discId, new Set());
      }

      // Tool/Technology (inner ring) - Each tool instance can have its own inequality
      const toolId = `tool-${item.toolTechnology}-${item.discipline}-${item.knowledgeArea}`;
      if (!nodeMap.has(toolId)) {
        const hasContent = item.relatedContent && item.relatedContent.length > 0;
        nodeMap.set(toolId, {
          id: toolId,
          name: item.toolTechnology,
          type: 'tool',
          level: 1,
          connections: [],
          data: item,
          description: item.description,
          voiceHook: item.voiceHook,
          relatedContent: item.relatedContent,
          guestSpeaker: item.guestSpeaker,
          hasContent,
          connectionInequalities: new Map()
        });
        connections.set(toolId, new Set());
      }

      // Add connections
      connections.get(kaId)?.add(discId);
      connections.get(discId)?.add(kaId);
      connections.get(discId)?.add(toolId);
      connections.get(toolId)?.add(discId);
      
      // Map this specific tool's inequality to its connections
      const toolToDiscConnection = [toolId, discId].sort().join('-');
      const discToKaConnection = [discId, kaId].sort().join('-');
      
      if (item.inequality) {
        connectionToInequality.set(toolToDiscConnection, item.inequality);
        connectionToInequality.set(discToKaConnection, item.inequality);
      }
      
      // Map inequality to connections for this specific tool instance
      if (item.inequality) {
        console.log('DEBUG: Mapping inequality', item.inequality, 'for tool', item.toolTechnology, 'connections:', toolToDiscConnection, discToKaConnection);
      }
    });

    // Convert connections to arrays and set inequality mappings
    const nodes = Array.from(nodeMap.values());
    nodes.forEach(node => {
      node.connections = Array.from(connections.get(node.id) || []);
      
      // Set inequality mappings for this node's connections
      node.connections.forEach(connectedId => {
        const connectionKey = [node.id, connectedId].sort().join('-');
        const inequality = connectionToInequality.get(connectionKey);
        if (inequality) {
          node.connectionInequalities.set(connectedId, inequality);
        }
      });
    });

    // Node transformation complete with inequality mappings
    console.log('Nodes with inequality mappings created:', nodes.filter(n => n.connectionInequalities.size > 0).length);

    return nodes;
  }, []);

  // Update radial nodes when data changes
  useEffect(() => {
    if (data.length > 0) {
      const nodes = transformDataToRadialNodes(data);
      setRadialNodes(nodes);
      
      // Extract unique inequality types
      const inequalitySet = new Set<string>();
      nodes.forEach(node => {
        node.connectionInequalities.forEach(inequality => {
          if (inequality.trim()) {
            inequalitySet.add(inequality);
          }
        });
      });
      setInequalityTypes(Array.from(inequalitySet).sort());
      
      // Calculate total connections between data points
      // Count unique connections in the hierarchical structure
      const connectionSet = new Set<string>();
      nodes.forEach(node => {
        node.connections.forEach(connectedNodeId => {
          // Create a consistent connection ID regardless of direction
          const connectionId = [node.id, connectedNodeId].sort().join('-');
          connectionSet.add(connectionId);
        });
      });
      
      setVisualizationStats(prev => ({
        ...prev,
        totalConnections: connectionSet.size
      }));
    }
  }, [data, transformDataToRadialNodes]);

  // Create the radial visualization
  useEffect(() => {
    if (!radialNodes.length || !svgRef.current) return;

    const svg = select(svgRef.current);
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 120; // Further reduced radius to ensure containment

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group (no zoom behavior)
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Draw concentric rings (visual guides) - Fine-tuned ring sizes
    const rings = [
      { level: 1, radius: maxRadius * 0.73, label: 'Tools & Technologies', color: '#9b5de5' }, // Purple - fine-tuned inner boundary
      { level: 2, radius: maxRadius * 1.18, label: 'Disciplines', color: '#f9a03f' }, // Orange - fine-tuned middle boundary  
      { level: 3, radius: maxRadius * 1.63, label: 'Knowledge Areas', color: '#28afb0' } // Teal - fine-tuned outer boundary
    ];

    rings.forEach((ring, index) => {
      // Add FULL clickable area for each ring (entire ellipse, not just border)
      g.append('ellipse')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('rx', ring.radius * 1.2) // Horizontal radius (wider)
        .attr('ry', ring.radius * 0.8) // Vertical radius (narrower)
        .attr('fill', ring.color)
        .attr('opacity', 0.05) // Slightly more visible for better interaction
        .style('cursor', 'pointer')
        .on('click', function() {
          console.log(`Clicked inside ${ring.label} area`);
          // You can add specific ring functionality here
        })
        .on('mouseenter', function() {
          // Highlight ring area on hover
          select(this).attr('opacity', 0.1);
        })
        .on('mouseleave', function() {
          // Reset ring area
          select(this).attr('opacity', 0.05);
        });

      // Add ring outline
      g.append('ellipse')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('rx', ring.radius * 1.2) // Horizontal radius (wider)
        .attr('ry', ring.radius * 0.8) // Vertical radius (narrower)
        .attr('fill', 'none')
        .attr('stroke', ring.color)
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .style('pointer-events', 'none'); // Don't interfere with the fill area clicks
    });

    // Position nodes with organized, aesthetic layout - NOT CHAOTIC
    const positionedNodes: RadialNode[] = [];
    const nodePositions = new Map<string, { x: number; y: number; radius: number }>();

    // Group nodes by type for organized placement
    const nodesByType = {
      knowledgeArea: radialNodes.filter(n => n.type === 'knowledgeArea'),
      discipline: radialNodes.filter(n => n.type === 'discipline'),
      tool: radialNodes.filter(n => n.type === 'tool')
    };

    // Fine-tuned zones to match the adjusted rings
    const ringConfigs = [
      { 
        type: 'tool', 
        minRadius: maxRadius * 0.1, // Start further from center
        maxRadius: maxRadius * 0.68, // Slightly smaller to match purple ring (0.73)
        nodeRadius: 10,
        minSpacing: 12
      },
      { 
        type: 'discipline', 
        minRadius: maxRadius * 0.76, // Start after purple ring
        maxRadius: maxRadius * 1.13, // Slightly smaller to match orange ring (1.18)
        nodeRadius: 10,
        minSpacing: 15
      },
      { 
        type: 'knowledgeArea', 
        minRadius: maxRadius * 1.23, // Start after orange ring
        maxRadius: maxRadius * 1.53, // Pull in more to prevent any overflow
        nodeRadius: 10,
        minSpacing: 18
      }
    ];

    ringConfigs.forEach(config => {
      const nodes = nodesByType[config.type as keyof typeof nodesByType];
      if (!nodes.length) return;

      // Calculate optimal angular spacing
      const angleStep = (2 * Math.PI) / Math.max(nodes.length, 8);
      
      nodes.forEach((node, index) => {
        let attempts = 0;
        let validPosition = false;
        let x, y;

        while (!validPosition && attempts < 50) {
          // Organized angular placement with slight randomization
          const baseAngle = index * angleStep;
          const angleVariation = (Math.random() - 0.5) * angleStep * 0.3; // Small variation
          const angle = baseAngle + angleVariation;
          
          // Simple radius placement within strict boundaries
          const radiusRange = config.maxRadius - config.minRadius;
          const radius = config.minRadius + (Math.random() * radiusRange);
          
          // ELLIPTICAL POSITIONING: Balanced spread without overflow
          const horizontalRadius = radius * 1.2; // Slightly less horizontal expansion
          const verticalRadius = radius * 0.85; // Slightly more compression to prevent overflow
          
          x = Math.cos(angle) * horizontalRadius;
          y = Math.sin(angle) * verticalRadius;

          // Check for collisions
          validPosition = true;
          for (const [existingId, existingPos] of nodePositions) {
            const distance = Math.sqrt((x - existingPos.x) ** 2 + (y - existingPos.y) ** 2);
            const minDistance = config.nodeRadius + existingPos.radius + config.minSpacing;

            if (distance < minDistance) {
              validPosition = false;
              break;
            }
          }
          attempts++;
        }

        // Fallback: systematic placement if collision detection fails
        if (!validPosition) {
          const fallbackAngle = index * angleStep;
          const fallbackRadius = Math.min(config.minRadius + (attempts * 5), config.maxRadius); // Stay within boundaries
          
          // ELLIPTICAL FALLBACK: Balanced fallback positioning without overflow
          const fallbackHorizontalRadius = fallbackRadius * 1.2; // Same horizontal expansion
          const fallbackVerticalRadius = fallbackRadius * 0.85; // Same compression to prevent overflow
          
          x = Math.cos(fallbackAngle) * fallbackHorizontalRadius;
          y = Math.sin(fallbackAngle) * fallbackVerticalRadius;
        }

        const positionedNode: RadialNode = {
          ...node,
          x: x || 0,
          y: y || 0,
          // Ensure all original data is preserved INCLUDING INEQUALITY MAPPINGS
          data: node.data,
          description: node.description || node.data?.description,
          voiceHook: node.voiceHook || node.data?.voiceHook,
          relatedContent: node.relatedContent || node.data?.relatedContent,
          guestSpeaker: node.guestSpeaker || node.data?.guestSpeaker,
          hasContent: node.hasContent || (node.data?.relatedContent && node.data.relatedContent.length > 0),
          connectionInequalities: node.connectionInequalities // PRESERVE the inequality mappings!
        };

        nodePositions.set(node.id, { x: x || 0, y: y || 0, radius: config.nodeRadius });
        positionedNodes.push(positionedNode);
      });
    });

    // Create all connection lines (ALWAYS visible at 70% transparency)
    const allConnections: { source: { x: number; y: number }; target: { x: number; y: number }; id: string }[] = [];
    positionedNodes.forEach(node => {
      node.connections.forEach((connId: string) => {
        const connectedNode = positionedNodes.find(n => n.id === connId);
        if (connectedNode && connectedNode.x !== undefined && connectedNode.y !== undefined && node.x !== undefined && node.y !== undefined) {
          allConnections.push({
            source: { x: node.x, y: node.y },
            target: { x: connectedNode.x, y: connectedNode.y },
            id: `${node.id}-${connId}` // Unique identifier for each connection
          });
        }
      });
    });

    // Create connections group and draw all connections
    const connectionsGroup = g.append('g').attr('class', 'connections');
    
    const connectionElements = connectionsGroup.selectAll('.connection-line')
      .data(allConnections)
      .enter()
      .append('line')
      .attr('class', 'connection-line')
      .attr('x1', (conn: any) => conn.source.x)
      .attr('y1', (conn: any) => conn.source.y)
      .attr('x2', (conn: any) => conn.target.x)
      .attr('y2', (conn: any) => conn.target.y)
      .attr('stroke', '#1e40af')
      .attr('stroke-width', 0.3) // Thinner lines for cleaner look
      .attr('opacity', 0.4); // Reduced opacity for cleaner appearance

    // Create inequality labels group AFTER nodes to ensure they appear on top
    const inequalityLabelsGroup = g.append('g').attr('class', 'inequality-labels');
    
    // Add inequality labels for connections that have inequality data
    const connectionsWithInequalities = allConnections.filter((conn: any) => {
      // Find the inequality for this connection
      const sourceNode = positionedNodes.find(n => n.x === conn.source.x && n.y === conn.source.y);
      const targetNode = positionedNodes.find(n => n.x === conn.target.x && n.y === conn.target.y);
      return sourceNode && targetNode && sourceNode.connectionInequalities.has(targetNode.id);
    });
    
    // DEBUG: Check if inequality mappings are preserved
    const nodesWithInequalityMappings = positionedNodes.filter(n => n.connectionInequalities.size > 0).length;
    console.log('Positioned nodes with inequality mappings:', nodesWithInequalityMappings);
    console.log('Connections with inequalities found:', connectionsWithInequalities.length);
    
    const inequalityLabels = inequalityLabelsGroup.selectAll('.inequality-label')
      .data(connectionsWithInequalities)
      .enter()
      .append('g')
      .attr('class', 'inequality-label')
      .attr('transform', (conn: any) => {
        // Position at midpoint of connection
        const midX = (conn.source.x + conn.target.x) / 2;
        const midY = (conn.source.y + conn.target.y) / 2;
        return `translate(${midX}, ${midY})`;
      })
      .style('opacity', 0) // Initially hidden, only visible on hover
      .style('pointer-events', 'none');

    // Add background rectangle for inequality labels
    inequalityLabels.append('rect')
      .attr('class', 'inequality-bg')
      .attr('fill', '#000000')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('filter', 'drop-shadow(0 0 4px rgba(255,255,255,0.5))');

    // Add inequality text
    inequalityLabels.append('text')
      .attr('class', 'inequality-text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .style('text-shadow', '0 0 3px rgba(0,0,0,0.8)')
      .each(function(conn: any) {
        const sourceNode = positionedNodes.find(n => n.x === conn.source.x && n.y === conn.source.y);
        const targetNode = positionedNodes.find(n => n.x === conn.target.x && n.y === conn.target.y);
        if (sourceNode && targetNode) {
          const inequalityText = sourceNode.connectionInequalities.get(targetNode.id) || '';
          
          // Format the inequality text based on specific rules
          if (inequalityText.includes('Community Marginalisation')) {
            // "Community Marginalisation | Offline to Online" → "Community Marginalisation"
            select(this).text('Community Marginalisation');
          } else if (inequalityText.includes('Data Surveillance and Extractivism')) {
            // "Data Surveillance and Extractivism" → two lines
            select(this).selectAll('*').remove(); // Clear any existing content
            
            const textElement = select(this);
            textElement.append('tspan')
              .attr('x', 0)
              .attr('dy', '-0.3em')
              .text('Data Surveillance');
            
            textElement.append('tspan')
              .attr('x', 0)
              .attr('dy', '1.2em')
              .text('& Extractivism');
          } else if (inequalityText.includes('Industry-Specific Inclusion and Exclusion')) {
            // "Industry-Specific Inclusion and Exclusion" → "Industry-Specific Inclusion & Exclusion"
            select(this).text('Industry-Specific Inclusion & Exclusion');
          } else {
            // For other inequalities, use the full text
            select(this).text(inequalityText);
          }
        }
      });

    // Adjust background rectangle size based on text
    inequalityLabels.each(function(this: SVGGElement) {
      const text = select(this).select('.inequality-text').node() as SVGTextElement;
      const bg = select(this).select('.inequality-bg');
      if (text) {
        const bbox = text.getBBox();
        // Add extra padding for multi-line text
        const extraPadding = text.children.length > 1 ? 2 : 0;
        bg.attr('x', bbox.x - 3)
          .attr('y', bbox.y - 1 - extraPadding)
          .attr('width', bbox.width + 6)
          .attr('height', bbox.height + 2 + (extraPadding * 2));
      }
    });

    // IMPORTANT: Ensure ALL labels are hidden on initial load
    inequalityLabelsGroup.selectAll('.inequality-label')
      .style('opacity', 0);

    // Create nodes group
    const nodesGroup = g.append('g').attr('class', 'nodes');

    // Draw nodes with glow effects
    const nodeSelection = nodesGroup.selectAll('.node')
      .data(positionedNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer');

    // Tools (uniform circles) - Purple
    nodeSelection.filter((d: any) => d.type === 'tool')
      .append('circle')
      .attr('r', 10) // Same size as all others
      .attr('fill', '#9b5de5') // Always purple for tools
      .attr('stroke', '#b794f6')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 8px rgba(155, 93, 229, 0.4))');

    // Disciplines (uniform circles) - Orange
    nodeSelection.filter((d: any) => d.type === 'discipline')
      .append('circle')
      .attr('r', 10) // Same size as all others
      .attr('fill', '#f9a03f')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 8px rgba(249, 160, 63, 0.4))');

    // Knowledge Areas (uniform circles, no dashes) - Teal
    nodeSelection.filter((d: any) => d.type === 'knowledgeArea')
      .append('circle')
      .attr('r', 10) // Same size as all others
      .attr('fill', '#28afb0') // Teal color
      .attr('stroke', '#5eead4')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 8px rgba(40, 175, 176, 0.4))');

    // Add hover and click interactions
    nodeSelection
      .on('mouseenter', function(event, d: any) {
        setHoveredNode(d.id);
        
        // Enhanced glow on hover
        select(this).select('circle')
          .transition()
          .duration(200)
          .style('filter', function() {
            if (d.type === 'knowledgeArea') {
              return 'drop-shadow(0 0 20px rgba(40, 175, 176, 0.8))';
            } else if (d.type === 'discipline') {
              return 'drop-shadow(0 0 15px rgba(249, 160, 63, 0.7))';
            } else {
              return 'drop-shadow(0 0 15px rgba(155, 93, 229, 0.8))'; // Always purple for tools
            }
          });
        
        // Highlight connected nodes and their connections
        const connectedNodeIds = new Set([d.id, ...d.connections]);
        
        // Highlight relevant connection lines (make them fully opaque and thicker)
        connectionsGroup.selectAll('.connection-line')
          .transition()
          .duration(200)
          .attr('opacity', function() {
            const lineData = select(this).datum() as any;
            const sourceConnected = positionedNodes.find(n => 
              n.x === lineData.source.x && n.y === lineData.source.y && connectedNodeIds.has(n.id)
            );
            const targetConnected = positionedNodes.find(n => 
              n.x === lineData.target.x && n.y === lineData.target.y && connectedNodeIds.has(n.id)
            );
            
            if (sourceConnected && targetConnected) {
              return 1; // Full opacity for relevant connections
            }
            return 0.2; // Dimmed for non-relevant connections
          })
          .attr('stroke', function() {
            const lineData = select(this).datum() as any;
            const sourceConnected = positionedNodes.find(n => 
              n.x === lineData.source.x && n.y === lineData.source.y && connectedNodeIds.has(n.id)
            );
            const targetConnected = positionedNodes.find(n => 
              n.x === lineData.target.x && n.y === lineData.target.y && connectedNodeIds.has(n.id)
            );
            
            if (sourceConnected && targetConnected) {
              return '#0ea5e9'; // Bright blue for highlighted connections
            }
            return '#1e40af'; // Default blue for others
          })
          .attr('stroke-width', function() {
            const lineData = select(this).datum() as any;
            const sourceConnected = positionedNodes.find(n => 
              n.x === lineData.source.x && n.y === lineData.source.y && connectedNodeIds.has(n.id)
            );
            const targetConnected = positionedNodes.find(n => 
              n.x === lineData.target.x && n.y === lineData.target.y && connectedNodeIds.has(n.id)
            );
            
            if (sourceConnected && targetConnected) {
              return 2; // Thicker for highlighted connections
            }
            return 0.5; // Default thickness
          });

        // Show inequality labels ONLY for highlighted connections of the hovered node
        inequalityLabelsGroup.selectAll('.inequality-label')
          .transition()
          .duration(200)
          .style('opacity', function() {
            const labelData = select(this).datum() as any;
            const sourceConnected = positionedNodes.find(n => 
              n.x === labelData.source.x && n.y === labelData.source.y && connectedNodeIds.has(n.id)
            );
            const targetConnected = positionedNodes.find(n => 
              n.x === labelData.target.x && n.y === labelData.target.y && connectedNodeIds.has(n.id)
            );
            
            // Only show if BOTH nodes are connected to the hovered node
            return (sourceConnected && targetConnected) ? 1 : 0;
          });

        // Highlight connected nodes
        nodesGroup.selectAll('.node')
          .transition()
          .duration(200)
          .attr('opacity', (node: any) => connectedNodeIds.has(node.id) ? 1 : 0.3);

        // Show labels for hovered and connected nodes
        nodesGroup.selectAll('.node')
          .filter((node: any) => connectedNodeIds.has(node.id))
          .append('text')
          .attr('class', 'node-label')
          .attr('text-anchor', 'middle')
          .attr('dy', (node: any) => node.type === 'knowledgeArea' ? -30 : node.type === 'discipline' ? -22 : -15)
          .attr('fill', '#e2e8f0')
          .attr('font-family', 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"')
          .attr('font-size', (node: any) => node.type === 'knowledgeArea' ? '14px' : '12px')
          .attr('font-weight', (node: any) => node.type === 'knowledgeArea' ? 'bold' : 'normal')
          .style('text-shadow', '0 0 8px rgba(14, 165, 233, 0.6)')
          .text((node: any) => {
            const maxLength = node.type === 'knowledgeArea' ? 18 : 15;
            return node.name.length > maxLength ? 
              node.name.substring(0, maxLength) + '...' : 
              node.name;
          })
          .attr('opacity', 0)
          .transition()
          .duration(300)
          .attr('opacity', 1);

        // Show tooltip near the hovered point
        const rect = svgRef.current!.getBoundingClientRect();
        const absoluteX = rect.left + centerX + d.x;
        const absoluteY = rect.top + centerY + d.y;
        
        setTooltipPosition({ x: absoluteX, y: absoluteY });
        
        const matchingTerms = findMatchingGlossaryTerms(d.name);
        const layerDescription = getLayerDescription(d.name, d.type);
        setTooltip({
          name: d.name,
          level: d.level,
          description: layerDescription || d.description || d.data?.description || 'No description available',
          voiceHook: d.voiceHook,
          relatedContent: d.relatedContent || d.data?.relatedContent || [],
          guestSpeaker: d.guestSpeaker,
          glossaryTerms: matchingTerms,
          x: absoluteX,
          y: absoluteY
        });
        
        // DEBUG: Log what content is available
        console.log('Tooltip for:', d.name, 'type:', d.type, 'relatedContent:', d.relatedContent || d.data?.relatedContent || []);
      })
      .on('mouseleave', function() {
        setHoveredNode(null);
        setTooltip(null);
        
        // Reset glow effects
        select(this).select('circle')
          .transition()
          .duration(300)
          .style('filter', function() {
            const element = this as SVGCircleElement;
            const parentElement = element.parentNode as Element;
            if (!parentElement) return '';
            const d = select(parentElement).datum() as any;
            if (d.type === 'knowledgeArea') {
              return 'drop-shadow(0 0 10px rgba(40, 175, 176, 0.4))';
            } else if (d.type === 'discipline') {
              return 'drop-shadow(0 0 8px rgba(249, 160, 63, 0.4))';
            } else {
              return 'drop-shadow(0 0 6px rgba(155, 93, 229, 0.4))'; // Always purple for tools
            }
          });
        
        // Reset connection lines to 40% transparency default
        connectionsGroup.selectAll('.connection-line')
          .transition()
          .duration(300)
          .attr('opacity', 0.4) // Back to 40% transparency
          .attr('stroke', '#1e40af') // Reset stroke color
          .attr('stroke-width', 0.3); // Reset stroke width

        // Hide ALL inequality labels when not hovering
        inequalityLabelsGroup.selectAll('.inequality-label')
          .transition()
          .duration(300)
          .style('opacity', 0);

        // Reset node opacity
        nodesGroup.selectAll('.node')
          .transition()
          .duration(200)
          .attr('opacity', 1);

        // Remove labels
        nodesGroup.selectAll('.node-label')
          .transition()
          .duration(200)
          .attr('opacity', 0)
          .remove();
      })
      .on('click', function(event, d: any) {
        setSelectedNode(d.id);
        
        // Enhanced glow on click (persistent until another node is clicked)
        nodesGroup.selectAll('.node circle')
          .style('filter', function() {
            const element = this as SVGCircleElement;
            const parentElement = element.parentNode as Element;
            if (!parentElement) return '';
            const nodeData = select(parentElement).datum() as any;
            if (nodeData.id === d.id) {
              // Clicked node gets strongest glow
              if (nodeData.type === 'knowledgeArea') {
                return 'drop-shadow(0 0 30px rgba(40, 175, 176, 1))';
              } else if (nodeData.type === 'discipline') {
                return 'drop-shadow(0 0 25px rgba(249, 160, 63, 1))';
              } else {
                return 'drop-shadow(0 0 25px rgba(155, 93, 229, 1))'; // Always purple for tools
              }
            } else {
              // Reset others to default
              if (nodeData.type === 'knowledgeArea') {
                return 'drop-shadow(0 0 10px rgba(40, 175, 176, 0.4))';
              } else if (nodeData.type === 'discipline') {
                return 'drop-shadow(0 0 8px rgba(249, 160, 63, 0.4))';
              } else {
                return 'drop-shadow(0 0 6px rgba(155, 93, 229, 0.4))'; // Always purple for tools
              }
            }
          });

        // Show side panel for ALL nodes (not just those with content) - PRESERVE ALL DATA
        const matchingTerms = findMatchingGlossaryTerms(d.name);
        const layerDescription = getLayerDescription(d.name, d.type);
        
        setSidePanelContent({
          name: d.name,
          description: layerDescription || d.description || d.data?.description || 'No description available',
          voiceHook: d.voiceHook || d.data?.voiceHook,
          relatedContent: d.relatedContent || d.data?.relatedContent || [],
          guestSpeaker: d.guestSpeaker || d.data?.guestSpeaker,
          glossaryTerms: matchingTerms
        });
        setShowSidePanel(true);
        
        // DEBUG: Log what content is available for side panel
        console.log('Side panel for:', d.name, 'type:', d.type, 'relatedContent:', d.relatedContent || d.data?.relatedContent || []);
        console.log('Clicked node:', d.name, 'Side panel should show:', true);
      });

    // Inequality labels are now properly working with the fixed positioning

  }, [radialNodes, dimensions, findMatchingGlossaryTerms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: dimensions.height }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: dimensions.height }}>
        <div className="text-red-500 text-center">
          <p className="text-xl font-bold mb-2">Error Loading Visualization</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden relative pb-20 flex">
      {/* Main Visualization Container - Left Side */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="relative w-full flex flex-col items-center justify-center" style={{ height: dimensions.height }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full bg-black rounded-lg"
          style={{ display: 'block' }}
        />
        
        {/* Collapsible Visualization Statistics - Left Side */}
        <div className={`absolute top-8 left-0 z-30 flex transition-transform duration-300 ${
          isStatsPanelCollapsed ? '-translate-x-[calc(100%-24px)]' : 'translate-x-0'
        }`}>
          {/* Main panel content */}
          <div className="bg-black bg-opacity-80 backdrop-blur-sm border-t border-b border-gray-700 p-6 relative">
            {/* Custom right border with cutout for button */}
            
            <div className="absolute bottom-0 right-0 w-px bg-gray-700 h-[231px]"></div>
            <button 
              onClick={fetchData}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Statistics:
            </h3>
            
            <div className="text-gray-300 text-xs space-y-1.5">
              <p>
                <span className="text-white font-semibold">Glossary entries (total):</span> <span className="text-gray-400 font-semibold">{visualizationStats.totalDataPoints}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="#f9a03f" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white font-semibold">Disciplines:</span> <span className="text-gray-400 font-semibold">{visualizationStats.disciplineCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="#28afb0" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white font-semibold">Knowledge areas:</span> <span className="text-gray-400 font-semibold">{visualizationStats.knowledgeAreaCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="#9b5de5" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white font-semibold">Tools and technologies:</span> <span className="text-gray-400 font-semibold">{visualizationStats.toolCount}</span>
              </div>
              <p>
                <span className="text-white font-semibold">Digital Inequalities:</span> <span className="text-gray-400 font-semibold">{visualizationStats.totalConnections}</span>
              </p>
              <p>
                <span className="text-white font-semibold">Glossary entries submitted by contributors:</span> <span className="text-gray-400 font-semibold">{visualizationStats.contributorSubmissions}</span>
              </p>
              <p>
                <span className="text-white font-semibold">Active contributors:</span> <span className="text-gray-400 font-semibold">{visualizationStats.activeContributors}</span>
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-600">
              <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* Toggle button/tab - attached and moves with panel */}
          <button
            onClick={() => setIsStatsPanelCollapsed(!isStatsPanelCollapsed)}
            className="bg-black bg-opacity-80 backdrop-blur-sm border border-gray-700 border-l-0 hover:bg-gray-800 transition-colors flex items-center justify-center w-6 h-12 !rounded-none !m-0 !p-0 mt-3"
            title={isStatsPanelCollapsed ? "Show Statistics" : "Hide Statistics"}
          >
            <svg 
              className={`w-3 h-3 text-white transition-transform duration-300 ${
                isStatsPanelCollapsed ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Ring Titles - Positioned directly ON the ring frames */}
        <svg className="absolute inset-0 pointer-events-none z-30" width="100%" height="100%">
          {radialNodes.length > 0 && (
            <>
              {/* Knowledge Areas - Text directly on teal ring frame */}
              <text
                x={dimensions.width / 2 + (1.63 * 1.2 * (Math.min(dimensions.width, dimensions.height) / 2 - 120))}
                y={dimensions.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm"
                fill="#888888"
                style={{
                  fontSize: '14px'
                }}
              >
                Knowledge Areas
              </text>
              
              {/* Disciplines - Text directly on orange ring frame */}
              <text
                x={dimensions.width / 2 + (1.18 * 1.2 * (Math.min(dimensions.width, dimensions.height) / 2 - 120))}
                y={dimensions.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm"
                fill="#888888"
                style={{
                  fontSize: '14px'
                }}
              >
                Disciplines
              </text>
              
              {/* Tools & Technologies - Text directly on purple ring frame */}
              <text
                x={dimensions.width / 2 + (0.73 * 1.2 * (Math.min(dimensions.width, dimensions.height) / 2 - 120))}
                y={dimensions.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm"
                fill="#888888"
                style={{
                  fontSize: '14px'
                }}
              >
                Tools & Technologies
              </text>
            </>
          )}
        </svg>


      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 bg-black text-white p-3 rounded-lg shadow-xl border border-white max-w-xs pointer-events-none"
          style={{
            left: Math.min(
              Math.max(tooltipPosition.x + 10 - (containerRef.current?.getBoundingClientRect().left || 0), 10),
              dimensions.width - 320
            ),
            top: (() => {
              const containerTop = containerRef.current?.getBoundingClientRect().top || 0;
              const relativeY = tooltipPosition.y - containerTop;
              const tooltipHeight = 200; // Approximate tooltip height
              
              // If tooltip would go below bottom, position it above the cursor
              if (relativeY + tooltipHeight > dimensions.height - 20) {
                return Math.max(relativeY - tooltipHeight - 10, 10);
              }
              // Otherwise position it below the cursor
              return Math.max(relativeY - 50, 10);
            })(),
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
          }}
        >
          <h3 className="font-bold text-white mb-2">{tooltip.name}</h3>
          {tooltip.description && (
            <p className="text-sm text-gray-400 mb-2">{tooltip.description}</p>
          )}
          {tooltip.voiceHook && (
            <div className="text-xs text-gray-400 italic mb-2">
              &quot;{tooltip.voiceHook}&quot;
                </div>
          )}
          {tooltip.relatedContent && tooltip.relatedContent.length > 0 && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {tooltip.relatedContent.filter(c => c.moderationStatus === 'approved').length} work{tooltip.relatedContent.filter(c => c.moderationStatus === 'approved').length === 1 ? '' : 's'} linked.
              </div>
          )}
          {tooltip.glossaryTerms && tooltip.glossaryTerms.length > 0 && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {tooltip.glossaryTerms.length} glossary entr{tooltip.glossaryTerms.length === 1 ? 'y' : 'ies'} linked.
                </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {tooltip.level === 3 ? 'Knowledge Area' : 
             tooltip.level === 2 ? 'Discipline' : 
             'Tool/Technology'}
                </div>
          <div className="text-xs text-gray-400 mt-2 italic flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
            </svg>
            Click to see the content and connected data points
                </div>
                </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 rounded-lg">
          <div className="bg-black text-gray-400 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90%] overflow-y-auto border border-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Getting Started</h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-white text-2xl p-2 rounded hover:bg-gray-800 transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 text-gray-400">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">What is the Glossary?</h3>
                    <p className="text-sm mb-3 leading-relaxed">
                      The glossary is a list of individual entries with 4 components:
                    </p>
                    <ul className="space-y-1 text-sm ml-4">
                      <li>• <strong className="text-white">Disciplines</strong> (e.g. Media Studies, Sociology, Human-Computer Interaction)</li>
                      <li>• <strong className="text-white">Knowledge Areas</strong> (e.g. Digital Rights and Regulation, Speculative and Critical Prototyping)</li>
                      <li>• <strong className="text-white">Tools and Technologies</strong> (e.g. Facial Recognition, Blockchain, APIs)</li>
                      <li>• <strong className="text-white">Terms and Concepts Connected to Digital Inequalities:</strong> A specific digital inequality defined from offline to online through connection made between different disciplines, knowledge areas, and technologies.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">What's in a Glossary Entry?</h3>
                    <p className="text-sm mb-3 leading-relaxed">
                      Each entry includes:
                    </p>
                    <ul className="space-y-1 text-sm ml-4">
                      <li>• A description using accessible, non-technical language</li>
                      <li>• Optional context, examples, or visuals contributed by Toolkit users</li>
                    </ul>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">What is the Toolkit?</h3>
                    <p className="text-sm mb-3 leading-relaxed">
                      The interactive map visualises the connections between different knowledge areas (<span style={{ color: '#28afb0' }}>outer layer</span>), disciplines (<span style={{ color: '#f9a03f' }}>middle layer</span>) and technologies and tools (<span style={{ color: '#9b5de5' }}>inner layer</span>) to define a specific digital inequality indexed on the toolkit (side bar). It shows how different combinations of disciplines, knowledge areas, and tools and technologies come together to define a digital inequality.
                    </p>
                    <p className="text-sm leading-relaxed">
                      These connections are created by contributors based on how the work they submit to the toolkit interact in real-world contexts e.g.; when a technology (like facial recognition) is analysed using a knowledge area (like surveillance studies) within a disciplinary lens (like critical race theory).
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">How Does the Toolkit Work?</h3>
                    <p className="text-sm mb-2 leading-relaxed">You can:</p>
                    <ul className="space-y-1 text-sm ml-4">
                      <li>• Hover over a node that represent a glossary entry to preview its definition.</li>
                      <li>• Click a node to view how it connects to other nodes and how these connections define a specific digital inequality in the right-hand panel.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">How to Contribute</h3>
                    <p className="text-sm mb-2 leading-relaxed">You can:</p>
                    <ul className="space-y-1 text-sm ml-4">
                      <li>• Propose a new glossary entry text.</li>
                      <li>• Edit an existing glossary entry text.</li>
                      <li>• Submit examples, media, or references for a glossary entry.</li>
                      <li>• Submit your own work related to inequality.</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/about#how-can-you-contribute';
                  }}
                  className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 inline-flex items-center gap-2 rounded-sm"
                >
                  Learn how to contribute
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glossary Modal */}
      {showGlossaryModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 rounded-lg">
          <div className="bg-black text-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90%] overflow-y-auto border border-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Glossary: {glossaryModalTitle}
                </h2>
                <button
                  onClick={() => setShowGlossaryModal(false)}
                  className="text-gray-400 hover:text-white text-2xl p-2 rounded hover:bg-gray-700 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {selectedGlossaryTerms.map((term, index) => (
                  <div key={term._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-white">
                        {term.title}
                        {selectedGlossaryTerms.length > 1 && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({index + 1}/{selectedGlossaryTerms.length})
                          </span>
                        )}
                      </h3>
          </div>
                    <p className="text-gray-400 leading-relaxed mb-3">{term.description}</p>
                    <div className="text-sm text-gray-500 space-y-1">
                      {term.userId?.email && (
                        <p>👤 Contributed by: {term.userId.email}</p>
                      )}
                      {term.createdAt && (
                        <p>📅 Added: {new Date(term.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
        </div>
        
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  Found {selectedGlossaryTerms.length} definition{selectedGlossaryTerms.length !== 1 ? 's' : ''} for this term
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = '/contribute?tab=glossary'}
                    className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
                  >
                    View Full Glossary →
                  </button>
                  <button
                    onClick={() => setShowGlossaryModal(false)}
                    className="text-sm bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                  >
                    Close
                  </button>
      </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel for Content Details - FULL SCREEN OVERLAY */}
      {sidePanelContent && (
        <>
          {/* Full screen backdrop */}
          <div 
            className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out z-[90] ${
              showSidePanel ? 'bg-opacity-70' : 'bg-opacity-0 pointer-events-none'
            }`}
            style={{ top: '80px' }} // Start below header
            onClick={handleCloseSidePanel}
          />
          
          {/* Full screen side panel */}
          <div className={`fixed top-20 right-0 h-[calc(100vh-80px)] w-96 bg-black text-white shadow-2xl z-[100] transform transition-all duration-500 ease-out ${
            showSidePanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          } border-l border-white`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black">
              <h2 className="text-lg font-bold text-white truncate pr-2">
                {sidePanelContent.name}
              </h2>
              <button
                onClick={handleCloseSidePanel}
                className="text-gray-400 hover:text-white text-2xl p-1 rounded hover:bg-gray-700 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="h-full overflow-y-auto pb-24">
              <div className="p-4 space-y-6">
                
                {/* Connected Data Points */}
                {(() => {
                  const currentNode = radialNodes.find(n => n.name === sidePanelContent.name);
                  const connectedNodes = currentNode ? currentNode.connections
                    .map(connId => radialNodes.find(n => n.id === connId))
                    .filter(Boolean)
                    .map(node => node!.name) : [];
                  
                  return connectedNodes.length > 0 && (
                  <div>
                      <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide">Connected Data Points</h3>
                      <div className="flex flex-wrap gap-1">
                        {connectedNodes.map((nodeName, index) => (
                          <span 
                            key={index}
                            className="inline-block bg-black text-gray-400 text-xs px-2 py-1 rounded border border-gray-700"
                          >
                            {nodeName}
                          </span>
                        ))}
                  </div>
                    </div>
                  );
                })()}

                {/* Voice Hook */}
                {sidePanelContent.voiceHook && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide">Voice Hook</h3>
                    <div className="bg-black rounded-lg p-3 border border-white">
                      <p className="text-sm italic text-gray-400">&quot;{sidePanelContent.voiceHook}&quot;</p>
                    </div>
            </div>
          )}

                {/* Description */}
                {sidePanelContent.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide">Description</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{sidePanelContent.description}</p>
            </div>
          )}
          
                {/* Related Content */}
                {sidePanelContent.relatedContent && sidePanelContent.relatedContent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Related Work{sidePanelContent.relatedContent.filter(c => c.moderationStatus === 'approved').length === 1 ? '' : 's'} ({sidePanelContent.relatedContent.filter(c => c.moderationStatus === 'approved').length})
                    </h3>
                    <div className="space-y-3">
                      {sidePanelContent.relatedContent
                  .filter(content => content.moderationStatus === 'approved')
                        .map((content) => (
                        <div key={content._id} className="bg-black rounded-lg p-3 border border-white hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-white flex-1">{content.title}</h4>
                            <span className="text-xs px-2 py-1 rounded ml-2 bg-black border border-gray-700 text-gray-400 flex items-center gap-1">
                            {content.contentType === 'video' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            ) : content.contentType === 'interactive' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : content.contentType === 'audio' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 21V3l7 4v10l-7 4z" />
                              </svg>
                            ) : content.contentType === 'document' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            )}
                            {content.contentType}
                          </span>
                        </div>

                          {content.voiceHook && (
                            <div className="bg-black rounded-lg p-2 mb-2 border border-white">
                              <p className="text-xs italic text-gray-400">&quot;{content.voiceHook}&quot;</p>
                            </div>
                          )}
                          
                        {content.description && (
                            <p className="text-xs text-gray-400 mb-2 leading-relaxed">{content.description}</p>
                          )}
                          
                          {content.youtubeUrl && (
                            <div className="mb-2">
                              <span className="text-xs bg-black border border-gray-700 text-gray-400 px-2 py-1 rounded flex items-center gap-1 inline-flex">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                YouTube Video
                              </span>
                            </div>
                          )}
                          
                        {content.tags && content.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {content.tags.map((tag: string, tagIndex: number) => (
                                <span key={tagIndex} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Glossary Terms */}
                {sidePanelContent.glossaryTerms && sidePanelContent.glossaryTerms.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Glossary Entr{sidePanelContent.glossaryTerms.length === 1 ? 'y' : 'ies'} ({sidePanelContent.glossaryTerms.length})
                    </h3>
                    <div className="space-y-3">
                      {sidePanelContent.glossaryTerms.map((term, index) => (
                        <div key={term._id} className="bg-black rounded-lg p-3 border border-white">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-medium text-white">
                              {term.title}
                              {sidePanelContent.glossaryTerms!.length > 1 && (
                                <span className="text-xs text-gray-400 ml-2">
                                  ({index + 1}/{sidePanelContent.glossaryTerms!.length})
                                </span>
                              )}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed mb-2">{term.description}</p>
                          {term.userId?.email && (
                            <p className="text-xs text-gray-500">by {term.userId.email}</p>
                          )}
                          {term.createdAt && (
                            <p className="text-xs text-gray-500">
                              Added {new Date(term.createdAt).toLocaleDateString()}
                  </p>
                )}
                        </div>
                      ))}
              </div>
            </div>
          )}
          
                {/* Guest Speaker */}
                {sidePanelContent.guestSpeaker && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide">Guest Speaker</h3>
                    <div className="bg-black rounded-lg p-3 border border-white">
                      <p className="text-sm font-medium text-white">{sidePanelContent.guestSpeaker.name}</p>
                      <p className="text-xs text-gray-400">{sidePanelContent.guestSpeaker.title}</p>
                      <p className="text-xs text-gray-400">{sidePanelContent.guestSpeaker.organization}</p>
                    </div>
            </div>
          )}



              </div>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Collapsible Digital Inequalities Index - Right Side */}
      <div className={`absolute top-8 right-0 z-30 flex transition-transform duration-300 ${
        isInequalityPanelCollapsed ? 'translate-x-[calc(100%-24px)]' : 'translate-x-0'
      }`}>
        
        {/* Toggle button/tab - attached and moves with panel */}
        <button
          onClick={() => setIsInequalityPanelCollapsed(!isInequalityPanelCollapsed)}
          className="bg-black bg-opacity-80 backdrop-blur-sm border border-gray-700 border-r-0 hover:bg-gray-800 transition-colors flex items-center justify-center w-6 h-12 !rounded-none !m-0 !p-0 mt-3"
          title={isInequalityPanelCollapsed ? "Show Digital Inequalities Index" : "Hide Digital Inequalities Index"}
        >
          <svg 
            className={`w-3 h-3 text-white transition-transform duration-300 ${
              isInequalityPanelCollapsed ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Digital Inequalities Index Panel */}
        <div className="w-50 bg-black bg-opacity-80 backdrop-blur-sm border-t border-r border-b border-gray-700 p-3 overflow-y-auto relative">
          {/* Custom left border with cutout for button */}
          <div className="absolute bottom-0 left-0 w-px bg-gray-700 h-[116px]"></div>
          
          <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
            Digital Inequalities Index:
          </h3>
          
          <div className="space-y-2">
            {inequalityTypes.length > 0 ? (
              inequalityTypes.map((inequality, index) => (
                <div key={index} className="flex items-start gap-2 text-gray-300 hover:text-white transition-colors cursor-pointer">
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-medium leading-relaxed">
                    {inequality.includes('Community Marginalisation') 
                      ? 'Community Marginalisation'
                      : inequality.includes('Data Surveillance and Extractivism')
                      ? 'Data Surveillance & Extractivism'
                      : inequality.includes('Industry-Specific Inclusion and Exclusion')
                      ? 'Industry-Specific Inclusion & Exclusion'
                      : inequality
                    }
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-xs py-4">
                Loading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SunburstVisualization; 