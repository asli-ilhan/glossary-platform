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

const SunburstVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SunburstNode[]>([]);
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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [isNearTop, setIsNearTop] = useState(true);
  const [visualizationStats, setVisualizationStats] = useState({
    totalDataPoints: 0,
    totalConnections: 0,
    relatedContentCount: 0,
    glossaryTermsCount: 0
  });

  // Listen for help button click from parent
  useEffect(() => {
    const handleShowInstructions = () => {
      setShowInstructions(true);
    };

    const handleCloseSidePanel = () => {
      setShowSidePanel(false);
    };
    
    window.addEventListener('showInstructions', handleShowInstructions);
    window.addEventListener('closeSidePanel', handleCloseSidePanel);
    return () => {
      window.removeEventListener('showInstructions', handleShowInstructions);
      window.removeEventListener('closeSidePanel', handleCloseSidePanel);
    };
  }, []);

  // Track initial load completion (removed automatic instructions display)
  useEffect(() => {
    if (isInitialLoad && !loading && data.length > 0) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loading, data]);

  // Responsive resize handler for fullscreen width
  const handleResize = useCallback(() => {
    setDimensions({ 
      width: window.innerWidth - 20, // Nearly fullscreen width
      height: Math.min(window.innerHeight - 100, 1000) // Expanded height for better visualization containment
    });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Track scroll position to show/hide scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const threshold = 200; // Show indicator only when within 200px of top
      setIsNearTop(scrollTop < threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch both sunburst data and glossary terms
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
      
      // Fetch glossary terms
      const glossaryResponse = await fetch('/api/glossary');
      if (!glossaryResponse.ok) {
        throw new Error('Failed to fetch glossary data');
      }
      const glossaryData = await glossaryResponse.json();
      console.log('Fetched glossary terms:', glossaryData.length, 'terms');
      
      setData(sunburstData);
      setGlossaryTerms(glossaryData || []);
      
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
      
      setVisualizationStats({
        totalDataPoints,
        totalConnections: 0, // Will be calculated when radial nodes are created
        relatedContentCount,
        glossaryTermsCount: linkedGlossaryCount
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
          
          setSidePanelContent({
            name: matchingNode.name,
            description: matchingNode.description || matchingNode.data?.description || 'No description available',
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

    // Create nodes for each level
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
          data: item
        });
        connections.set(discId, new Set());
      }

      // Tool/Technology (inner ring)
      const toolId = `tool-${item.toolTechnology}`;
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
          hasContent
        });
        connections.set(toolId, new Set());
      }

      // Add connections
      connections.get(kaId)?.add(discId);
      connections.get(discId)?.add(kaId);
      connections.get(discId)?.add(toolId);
      connections.get(toolId)?.add(discId);
    });

    // Convert connections to arrays
    const nodes = Array.from(nodeMap.values());
    nodes.forEach(node => {
      node.connections = Array.from(connections.get(node.id) || []);
    });

    return nodes;
  }, []);

  // Update radial nodes when data changes
  useEffect(() => {
    if (data.length > 0) {
      const nodes = transformDataToRadialNodes(data);
      setRadialNodes(nodes);
      
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
          // Ensure all original data is preserved
          data: node.data,
          description: node.description || node.data?.description,
          voiceHook: node.voiceHook || node.data?.voiceHook,
          relatedContent: node.relatedContent || node.data?.relatedContent,
          guestSpeaker: node.guestSpeaker || node.data?.guestSpeaker,
          hasContent: node.hasContent || (node.data?.relatedContent && node.data.relatedContent.length > 0)
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
    
    connectionsGroup.selectAll('.connection-line')
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
      .attr('fill', (d: any) => d.hasContent ? '#9b5de5' : '#6b7280')
      .attr('stroke', (d: any) => d.hasContent ? '#b794f6' : '#9ca3af')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.9)
      .style('filter', (d: any) => 
        d.hasContent ? 
        'drop-shadow(0 0 8px rgba(155, 93, 229, 0.4))' : 
        'drop-shadow(0 0 8px rgba(107, 114, 128, 0.3))'
      );

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
              return d.hasContent ? 
                'drop-shadow(0 0 15px rgba(155, 93, 229, 0.8))' : 
                'drop-shadow(0 0 10px rgba(107, 114, 128, 0.6))';
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
        setTooltip({
          name: d.name,
          level: d.level,
          description: d.description,
          voiceHook: d.voiceHook,
          relatedContent: d.relatedContent,
          guestSpeaker: d.guestSpeaker,
          glossaryTerms: matchingTerms,
          x: absoluteX,
          y: absoluteY
        });
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
              return d.hasContent ? 
                'drop-shadow(0 0 6px rgba(155, 93, 229, 0.4))' : 
                'drop-shadow(0 0 3px rgba(107, 114, 128, 0.3))';
            }
          });
        
        // Reset connection lines to 70% transparency default
        connectionsGroup.selectAll('.connection-line')
          .transition()
          .duration(300)
          .attr('opacity', 0.4); // Back to 40% transparency

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
                return nodeData.hasContent ? 
                  'drop-shadow(0 0 25px rgba(155, 93, 229, 1))' : 
                  'drop-shadow(0 0 20px rgba(107, 114, 128, 0.8))';
              }
            } else {
              // Reset others to default
              if (nodeData.type === 'knowledgeArea') {
                return 'drop-shadow(0 0 10px rgba(40, 175, 176, 0.4))';
              } else if (nodeData.type === 'discipline') {
                return 'drop-shadow(0 0 8px rgba(249, 160, 63, 0.4))';
              } else {
                return nodeData.hasContent ? 
                  'drop-shadow(0 0 6px rgba(155, 93, 229, 0.4))' : 
                  'drop-shadow(0 0 3px rgba(107, 114, 128, 0.3))';
              }
            }
          });

        // Show side panel for ALL nodes (not just those with content) - PRESERVE ALL DATA
        const matchingTerms = findMatchingGlossaryTerms(d.name);
        
        setSidePanelContent({
          name: d.name,
          description: d.description || d.data?.description || 'No description available',
          voiceHook: d.voiceHook || d.data?.voiceHook,
          relatedContent: d.relatedContent || d.data?.relatedContent || [],
          guestSpeaker: d.guestSpeaker || d.data?.guestSpeaker,
          glossaryTerms: matchingTerms
        });
        setShowSidePanel(true);
        
        console.log('Clicked node:', d.name, 'Side panel should show:', true);
      });

  }, [radialNodes, dimensions, findMatchingGlossaryTerms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[1000px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[1000px]">
        <div className="text-red-500 text-center">
          <p className="text-xl font-bold mb-2">Error Loading Visualization</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Main Visualization Container - Fullscreen Width */}
      <div ref={containerRef} className="relative w-full h-[1000px] flex flex-col items-center justify-center">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full bg-black rounded-lg"
          style={{ display: 'block' }}
        />
        
        {/* Visualization Statistics & Legend - Top Left */}
        <div className="absolute top-8 left-8 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-6 z-30 border border-gray-700">
          {/* Statistics */}
          <div className="mb-4 border-b border-gray-600 pb-6 mr-2">
            <button 
              onClick={fetchData}
              className="absolute top-0 -right-3 text-gray-400 hover:text-white transition-colors"
              title="Refresh data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Statistics</h4>
            <div className="text-gray-300 text-xs space-y-1">
              <p>
                <span className="text-cyan-400 font-semibold">{visualizationStats.totalDataPoints}</span> data points with
              </p>
              <p>
                <span className="text-green-400 font-semibold">{visualizationStats.totalConnections}</span> connections.
              </p>
              <p>
                <span className="text-orange-400 font-semibold">{visualizationStats.relatedContentCount}</span> linked content and
              </p>
              <p>
                <span className="text-purple-400 font-semibold">{visualizationStats.glossaryTermsCount}</span> linked glossary entries.
              </p>
            </div>
          </div>
          
          {/* Visual Legend */}
          <div>
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Visual Legend</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-400 border border-teal-400" style={{ backgroundColor: '#28afb0', borderColor: '#5eead4' }}></div>
                <span className="text-xs" style={{ color: '#28afb0' }}>Knowledge Areas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400 border border-orange-400" style={{ backgroundColor: '#f9a03f', borderColor: '#fbbf24' }}></div>
                <span className="text-xs" style={{ color: '#f9a03f' }}>Disciplines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400 border border-purple-400" style={{ backgroundColor: '#9b5de5', borderColor: '#b794f6' }}></div>
                <span className="text-xs" style={{ color: '#9b5de5' }}>Tools & Tech</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ring Titles - Positioned directly ON the ring frames */}
        <svg className="absolute inset-0 pointer-events-none z-20" width="100%" height="100%">
          {radialNodes.length > 0 && (
            <>
              {/* Knowledge Areas - Text directly on teal ring frame */}
              <text
                x={dimensions.width / 2 + (1.63 * 1.2 * (Math.min(dimensions.width, dimensions.height) / 2 - 120))}
                y={dimensions.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-bold text-sm"
                fill="#28afb0"
                style={{
                  textShadow: '0 0 8px rgba(40, 175, 176, 0.8)',
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
                className="font-bold text-sm"
                fill="#f9a03f"
                style={{
                  textShadow: '0 0 8px rgba(249, 160, 63, 0.8)',
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
                className="font-bold text-sm"
                fill="#9b5de5"
                style={{
                  textShadow: '0 0 8px rgba(155, 93, 229, 0.8)',
                  fontSize: '14px'
                }}
              >
                Tools & Technologies
              </text>
            </>
          )}
        </svg>

        {/* Scroll Down Indicator - Bottom Hover Area */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-20 z-20"
          onMouseEnter={() => setShowScrollIndicator(true)}
          onMouseLeave={() => setShowScrollIndicator(false)}
        >
          <div 
            className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
              showScrollIndicator && isNearTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex flex-col items-center text-white animate-bounce">
              <span className="text-sm font-medium mb-2 text-gray-300">Please scroll down</span>
              <svg 
                className="w-6 h-6 text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-blue-500 max-w-xs pointer-events-none"
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
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)',
          }}
        >
          <h3 className="font-bold text-blue-300 mb-2">{tooltip.name}</h3>
          {tooltip.description && (
            <p className="text-sm text-gray-300 mb-2">{tooltip.description}</p>
          )}
          {tooltip.voiceHook && (
            <div className="text-xs text-blue-300 italic mb-2">
              &quot;{tooltip.voiceHook}&quot;
                </div>
          )}
          {tooltip.relatedContent && tooltip.relatedContent.length > 0 && (
            <div className="text-xs text-blue-400">
              📚 {tooltip.relatedContent.filter(c => c.moderationStatus === 'approved').length} contents linked
              </div>
          )}
          {tooltip.glossaryTerms && tooltip.glossaryTerms.length > 0 && (
            <div className="text-xs text-blue-400">
              📖 {tooltip.glossaryTerms.length} glossary entries linked
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
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 rounded-lg">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90%] overflow-y-auto border border-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blue-300">Getting Started</h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-gray-400 hover:text-white text-2xl p-2 rounded hover:bg-gray-700 transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6 text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">What is in the Toolkit</h3>
                  <p className="text-sm mb-2 leading-relaxed">
                    The Toolkit is built around a glossary that explains disciplines, knowledge areas, and technologies using accessible language.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• Glossary entries may include short videos, examples, and contextual explanations.</li>
                    <li>• Each entry is represented as a node in an interactive map.</li>
                </ul>
              </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">How the Toolkit is Organised</h3>
                  <p className="text-sm mb-2 leading-relaxed">
                    The glossary entries are connected through an interactive map structured across three layers:
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• <span style={{ color: '#9b5de5' }}>Inner circle</span>: tools and technologies</li>
                    <li>• <span style={{ color: '#f9a03f' }}>Middle circle</span>: disciplines</li>
                    <li>• <span style={{ color: '#28afb0' }}>Outer circle</span>: knowledge areas</li>
                  </ul>
            </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">How to Navigate the Toolkit</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Use the search tab to look up terms in the Toolkit.</li>
                    <li>• Hover over a circle on the interactive map to see how that entry connects to others.</li>
                    <li>• Click to open a circle and view related concepts on the side.</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">How to Contribute to the Toolkit</h3>
                  <p className="text-sm leading-relaxed">
                    You can edit glossary entries or submit your own work to the toolkit. 
                    <a 
                      href="/about#how-can-you-contribute" 
                      className="text-white hover:text-gray-300 underline inline-flex items-center gap-1 transition-colors ml-1"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/about#how-can-you-contribute';
                      }}
                    >
                      Learn how to contribute
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 inline-flex items-center gap-2"
                >
                  Continue to Map
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
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 rounded-lg">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90%] overflow-y-auto border border-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blue-300">
                  📖 Glossary: {glossaryModalTitle}
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
                      <h3 className="text-lg font-semibold text-blue-300">
                        {term.title}
                        {selectedGlossaryTerms.length > 1 && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({index + 1}/{selectedGlossaryTerms.length})
                          </span>
                        )}
                      </h3>
          </div>
                    <p className="text-gray-300 leading-relaxed mb-3">{term.description}</p>
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
      {showSidePanel && sidePanelContent && (
        <>
          {/* Full screen backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-[90]"
            style={{ top: '80px' }} // Start below header
            onClick={() => setShowSidePanel(false)}
          />
          
          {/* Full screen side panel */}
          <div className={`fixed top-20 right-0 h-[calc(100vh-80px)] w-96 bg-gray-900 text-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${
            showSidePanel ? 'translate-x-0' : 'translate-x-full'
          } border-l border-blue-500`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
              <h2 className="text-lg font-bold text-blue-300 truncate pr-2">
                {sidePanelContent.name}
              </h2>
              <button
                onClick={() => setShowSidePanel(false)}
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
                      <h3 className="text-sm font-semibold text-cyan-300 mb-2 uppercase tracking-wide">Connected Data Points</h3>
                      <div className="flex flex-wrap gap-1">
                        {connectedNodes.map((nodeName, index) => (
                          <span 
                            key={index}
                            className="inline-block bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded border border-gray-600"
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
                    <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Voice Hook</h3>
                    <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-blue-400">
                      <p className="text-sm italic text-gray-100">&quot;{sidePanelContent.voiceHook}&quot;</p>
                    </div>
            </div>
          )}

                {/* Description */}
                {sidePanelContent.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Description</h3>
                    <p className="text-sm text-gray-100 leading-relaxed">{sidePanelContent.description}</p>
                  </div>
                )}
          
                {/* Related Content */}
                {sidePanelContent.relatedContent && sidePanelContent.relatedContent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">
                      📚 Related Content ({sidePanelContent.relatedContent.filter(c => c.moderationStatus === 'approved').length})
                    </h3>
                    <div className="space-y-3">
                      {sidePanelContent.relatedContent
                  .filter(content => content.moderationStatus === 'approved')
                        .map((content) => (
                        <div key={content._id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-white flex-1">{content.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded ml-2 ${
                              content.contentType === 'video' ? 'bg-blue-500/20 text-blue-300' :
                              content.contentType === 'interactive' ? 'bg-blue-600/20 text-blue-300' :
                              content.contentType === 'audio' ? 'bg-blue-400/20 text-blue-300' :
                              content.contentType === 'document' ? 'bg-blue-700/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {content.contentType === 'video' ? '🎥' : 
                             content.contentType === 'interactive' ? '🔧' :
                             content.contentType === 'audio' ? '🎵' :
                             content.contentType === 'document' ? '📄' : '🔗'} {content.contentType}
                          </span>
                        </div>

                          {content.voiceHook && (
                            <div className="bg-gray-700 rounded-lg p-2 mb-2 border-l-4 border-blue-400">
                              <p className="text-xs italic text-blue-200">&quot;{content.voiceHook}&quot;</p>
                            </div>
                          )}
                          
                        {content.description && (
                            <p className="text-xs text-gray-300 mb-2 leading-relaxed">{content.description}</p>
                          )}
                          
                          {content.youtubeUrl && (
                            <div className="mb-2">
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                🎥 YouTube Video
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
                    <h3 className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">
                      📖 Glossary Entries ({sidePanelContent.glossaryTerms.length})
                    </h3>
                    <div className="space-y-3">
                      {sidePanelContent.glossaryTerms.map((term, index) => (
                        <div key={term._id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 border-l-4 border-l-blue-400">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-medium text-blue-300">
                              {term.title}
                              {sidePanelContent.glossaryTerms!.length > 1 && (
                                <span className="text-xs text-gray-400 ml-2">
                                  ({index + 1}/{sidePanelContent.glossaryTerms!.length})
                                </span>
                              )}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed mb-2">{term.description}</p>
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
                    <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Guest Speaker</h3>
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 border-l-4 border-l-blue-400">
                      <p className="text-sm font-medium text-white">{sidePanelContent.guestSpeaker.name}</p>
                      <p className="text-xs text-gray-300">{sidePanelContent.guestSpeaker.title}</p>
                      <p className="text-xs text-gray-400">{sidePanelContent.guestSpeaker.organization}</p>
                    </div>
            </div>
          )}

                {/* Action Buttons - Only show if there are glossary terms */}
                {sidePanelContent.glossaryTerms && sidePanelContent.glossaryTerms.length > 0 && (
                <div className="pt-4 border-t border-gray-700">
                    <button
                      onClick={() => window.location.href = '/contribute?tab=glossary'}
                      className="w-full text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded transition-colors"
                    >
                      View Full Glossary →
                    </button>
        </div>
                )}

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SunburstVisualization; 