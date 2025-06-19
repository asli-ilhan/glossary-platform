'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { select, selectAll } from 'd3-selection';
import { hierarchy, partition } from 'd3-hierarchy';
import { arc } from 'd3-shape';
import { scaleOrdinal, scaleLinear } from 'd3-scale';
import { interpolate } from 'd3-interpolate';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { transition } from 'd3-transition';

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

interface HierarchyNode {
  name: string;
  level: number;
  children?: HierarchyNode[];
  value?: number;
  data?: SunburstNode;
  description?: string;
  voiceHook?: string;
  relatedContent?: SunburstNode['relatedContent'];
  guestSpeaker?: {
    name: string;
    title: string;
    organization: string;
  };
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
  x: number;
  y: number;
}

const SunburstVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SunburstNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [showInstructions, setShowInstructions] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Listen for help button click from parent
  useEffect(() => {
    const handleShowInstructions = () => {
      setShowInstructions(true);
    };
    
    window.addEventListener('showInstructions', handleShowInstructions);
    return () => window.removeEventListener('showInstructions', handleShowInstructions);
  }, []);

  // Responsive resize handler for full-screen
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const maxWidth = Math.min(window.innerWidth - 40, 1200);
      const maxHeight = Math.min(window.innerHeight * 0.7, 800);
      const size = Math.min(maxWidth, maxHeight);
      setDimensions({ width: size, height: size });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Load static sunburst data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { demoSunburstData } = await import('@/app/data/sunburstData');
        console.log('Loaded static sunburst data:', demoSunburstData.length, 'items');
        console.log('Sample item with content:', demoSunburstData.find(item => item.relatedContent?.length > 0));
        setData(demoSunburstData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error loading sunburst data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Transform flat data into better categorized hierarchical structure
  const buildHierarchy = useCallback((flatData: SunburstNode[]): HierarchyNode => {
    console.log('Building categorized hierarchy from:', flatData.length, 'items');
    
    const hierarchy: HierarchyNode = {
      name: 'MAI Knowledge',
      level: 0,
      children: [],
      value: 1
    };

    // Use Maps for better performance and categorization
    const themeClusters = new Map<string, HierarchyNode>();
    const categoryStats = new Map<string, number>();
    
    // First pass: count occurrences for better categorization
    flatData.forEach((item) => {
      const themeKey = item.themeCluster.trim();
      const knowledgeKey = item.knowledgeArea.trim();
      const disciplineKey = item.discipline.trim();
      const roleKey = item.roleSystemOrientation.trim();
      
      categoryStats.set(themeKey, (categoryStats.get(themeKey) || 0) + 1);
      categoryStats.set(`${themeKey}|${knowledgeKey}`, (categoryStats.get(`${themeKey}|${knowledgeKey}`) || 0) + 1);
      categoryStats.set(`${themeKey}|${knowledgeKey}|${disciplineKey}`, (categoryStats.get(`${themeKey}|${knowledgeKey}|${disciplineKey}`) || 0) + 1);
      categoryStats.set(`${themeKey}|${knowledgeKey}|${disciplineKey}|${roleKey}`, (categoryStats.get(`${themeKey}|${knowledgeKey}|${disciplineKey}|${roleKey}`) || 0) + 1);
    });
    
    flatData.forEach((item, index) => {
      console.log(`Processing item ${index}:`, item.themeCluster, '->', item.toolTechnology);
      
      // Theme Cluster (level 1) - with count-based sizing
      if (!themeClusters.has(item.themeCluster)) {
        const themeCount = categoryStats.get(item.themeCluster.trim()) || 1;
        themeClusters.set(item.themeCluster, {
          name: item.themeCluster,
          level: 1,
          children: [],
          description: `Explore ${item.themeCluster} domain (${themeCount} tools)`,
          value: Math.sqrt(themeCount) // Use square root for more balanced sizing
        });
      }
      
      const themeNode = themeClusters.get(item.themeCluster)!;
      
      // Knowledge Area (level 2) - better categorization
      let knowledgeNode = themeNode.children?.find(n => n.name === item.knowledgeArea);
      if (!knowledgeNode) {
        const knowledgeCount = categoryStats.get(`${item.themeCluster.trim()}|${item.knowledgeArea.trim()}`) || 1;
        knowledgeNode = {
          name: item.knowledgeArea,
          level: 2,
          children: [],
          description: `${item.knowledgeArea} within ${item.themeCluster} (${knowledgeCount} tools)`,
          value: Math.sqrt(knowledgeCount)
        };
        themeNode.children!.push(knowledgeNode);
      }
      
      // Discipline (level 3) - improved grouping
      let disciplineNode = knowledgeNode.children?.find(n => n.name === item.discipline);
      if (!disciplineNode) {
        const disciplineCount = categoryStats.get(`${item.themeCluster.trim()}|${item.knowledgeArea.trim()}|${item.discipline.trim()}`) || 1;
        disciplineNode = {
          name: item.discipline,
          level: 3,
          children: [],
          description: `${item.discipline} discipline (${disciplineCount} tools)`,
          value: Math.sqrt(disciplineCount)
        };
        knowledgeNode.children!.push(disciplineNode);
      }
      
      // Role/System Orientation (level 4) - smart categorization
      let roleNode = disciplineNode.children?.find(n => n.name === item.roleSystemOrientation);
      if (!roleNode) {
        const roleCount = categoryStats.get(`${item.themeCluster.trim()}|${item.knowledgeArea.trim()}|${item.discipline.trim()}|${item.roleSystemOrientation.trim()}`) || 1;
        roleNode = {
          name: item.roleSystemOrientation,
          level: 4,
          children: [],
          description: `${item.roleSystemOrientation} role (${roleCount} tools)`,
          value: Math.sqrt(roleCount)
        };
        disciplineNode.children!.push(roleNode);
      }
      
      // Tool/Technology (level 5) - leaf nodes
      const toolNode: HierarchyNode = {
        name: item.toolTechnology,
        level: 5,
        value: 1,
        data: item,
        description: item.description,
        voiceHook: item.voiceHook,
        relatedContent: item.relatedContent,
        guestSpeaker: item.guestSpeaker
      };
      roleNode.children!.push(toolNode);
    });

    // Sort children by value (size) for better visual organization
    const sortChildren = (node: HierarchyNode) => {
      if (node.children) {
        node.children.sort((a, b) => (b.value || 0) - (a.value || 0));
        node.children.forEach(sortChildren);
      }
    };

    hierarchy.children = Array.from(themeClusters.values());
    hierarchy.children.sort((a, b) => (b.value || 0) - (a.value || 0));
    hierarchy.children.forEach(sortChildren);
    
    console.log('Built categorized hierarchy with stats:', {
      themes: themeClusters.size,
      totalItems: flatData.length,
      avgPerTheme: Math.round(flatData.length / themeClusters.size)
    });
    
    return hierarchy;
  }, []);

  // Color scale - Vibrant greens with white/gray like the reference image
  const getColorScale = useCallback((level: number) => {
    const colorSchemes: { [key: number]: readonly string[] } = {
      1: ['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af'], // Whites to light greys
      2: ['#00ff88', '#00e676', '#00c853', '#4caf50', '#2e7d32'], // Vibrant greens
      3: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'], // Very light greys
      4: ['#00ff9f', '#00e5ff', '#1de9b6', '#4db6ac', '#26a69a'], // Bright cyan-greens
      5: ['#6b7280', '#4b5563', '#374151', '#1f2937', '#111827']  // Medium to dark greys
    };
    return scaleOrdinal(colorSchemes[level] || schemeCategory10);
  }, []);

  // Create sunburst visualization
  useEffect(() => {
    if (!data.length || !svgRef.current) {
      console.log('Cannot create visualization:', { dataLength: data.length, svgRef: !!svgRef.current });
      return;
    }

    console.log('Creating sunburst visualization with', data.length, 'data points');

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2 - 20;

    console.log('SVG dimensions:', { width, height, radius });

    // Create main group and center it
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Build hierarchy
    const hierarchyData = buildHierarchy(data);
    console.log('Hierarchy data:', hierarchyData);
    
    const root = hierarchy(hierarchyData)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    console.log('D3 hierarchy root:', root);

    // Create partition layout
    const partitionLayout = partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partitionLayout(root);
    
    console.log('Partitioned data points:', root.descendants().length);

    // Arc generator
    const arcGenerator = arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Create arcs with enhanced shadows and seamless styling
    const arcs = g.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .enter()
      .append('path')
      .attr('d', arcGenerator as any)
      .attr('fill', d => {
        const colorScale = getColorScale(d.depth);
        let baseColor = colorScale(d.data.name);
        
        // Highlight tools with content modules
        if (d.depth === 5 && d.data.relatedContent && d.data.relatedContent.length > 0) {
          // Add a bright cyan highlight for tools with content
          return '#00ffff'; // Bright cyan for content-rich tools
        }
        
        return baseColor;
      })
             .attr('stroke', d => {
         // Special border for tools with content
         if (d.depth === 5 && d.data.relatedContent && d.data.relatedContent.length > 0) {
           return '#ffffff';
         }
         return '#ffffff';
       })
       .attr('stroke-width', d => {
         // Thicker border for tools with content
         if (d.depth === 5 && d.data.relatedContent && d.data.relatedContent.length > 0) {
           return 2;
         }
         return 0.2;
       })
      .style('cursor', 'pointer')
             .style('opacity', d => {
         // Make content tools more prominent
         if (d.depth === 5 && d.data.relatedContent && d.data.relatedContent.length > 0) {
           return 1;
         }
         return 0.95;
       })
       .style('filter', d => {
         // Enhanced glow for content tools
         if (d.depth === 5 && d.data.relatedContent && d.data.relatedContent.length > 0) {
           return 'drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.25)) drop-shadow(0px 0px 8px rgba(0, 255, 255, 0.6))';
         }
         return 'drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.25)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.1))';
       });

        // Add hover effects with dynamic text appearance
    arcs
      .on('mouseenter', function(event, d) {
        // Debug logging
        console.log('Hovered on:', d.data.name, 'Level:', d.depth, 'Has content:', d.data.relatedContent?.length || 0);
        
        // Highlight current arc
        select(this)
          .style('opacity', 1)
          .attr('stroke-width', 2);

        // Show/enhance labels for this segment and related ones
        g.selectAll('.sunburst-label')
          .transition()
          .duration(200)
          .style('opacity', function(labelData) {
            const segmentData = select(this).datum();
            
            // Highlight current segment label
            if (segmentData === d.data) {
              return 1;
            }
            
            // Show parent/child relationship labels
            if (segmentData.depth === d.depth - 1 || segmentData.depth === d.depth + 1) {
              // Check if it's in the same hierarchy path - with null safety
              const segmentName = segmentData.name || '';
              const currentName = d.data.name || '';
              
              const isRelated = segmentData.depth < d.depth ? 
                currentName.includes(segmentName) || segmentName.includes(currentName) :
                segmentName.includes(currentName) || currentName.includes(segmentName);
              
              if (isRelated) return 0.8;
            }
            
            // Fade other labels
            const angleDiff = segmentData.x1 - segmentData.x0;
            const radiusDiff = segmentData.y1 - segmentData.y0;
            const area = angleDiff * radiusDiff;
            
            // Return dimmed opacity for non-related labels
            if (segmentData.depth === 1 && angleDiff > 0.15) return 0.3;
            if (segmentData.depth === 2 && angleDiff > 0.1 && area > 0.02) return 0.2;
            if (segmentData.depth === 3 && angleDiff > 0.08 && area > 0.015) return 0.15;
            return 0.1;
          });

        // Show tooltip with fixed positioning
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          setTooltipPosition({ x, y });
          
          // Safely extract tooltip data
          const tooltipData = {
            name: d.data.name || 'Unknown',
            level: d.depth,
            description: d.data.description,
            voiceHook: d.data.voiceHook,
            relatedContent: d.data.relatedContent || [],
            guestSpeaker: d.data.guestSpeaker,
            x,
            y
          };
          
          setTooltip(tooltipData);
          
          // Debug the tooltip data
          console.log('Setting tooltip:', tooltipData.name, 'with content:', tooltipData.relatedContent?.length || 0, 'modules');
        }
      })
      .on('mouseleave', function() {
        // Remove highlight
        select(this)
          .style('opacity', 0.8)
          .attr('stroke-width', 1);

        // Reset all labels to their default opacity
        g.selectAll('.sunburst-label')
          .transition()
          .duration(300)
          .style('opacity', function() {
            const d = select(this).datum();
            const angleDiff = d.x1 - d.x0;
            const radiusDiff = d.y1 - d.y0;
            const area = angleDiff * radiusDiff;
            
            // Return to default opacity rules
            if (d.depth === 1 && angleDiff > 0.15) return 1;
            if (d.depth === 2 && angleDiff > 0.1 && area > 0.02) return 0.9;
            if (d.depth === 3 && angleDiff > 0.08 && area > 0.015) return 0.7;
            if (d.depth === 4 && angleDiff > 0.06 && area > 0.01) return 0.5;
            if (d.depth === 5 && angleDiff > 0.04 && area > 0.008) return 0.3;
            return 0;
          });

        // Hide tooltip
        setTooltip(null);
      })
      .on('click', function(event, d) {
        // Zoom functionality
        const clickedNode = d;
        
        // Calculate new angles and radii for zoom
        const newX0 = Math.max(0, Math.min(2 * Math.PI, clickedNode.x0 - clickedNode.x0));
        const newX1 = Math.max(0, Math.min(2 * Math.PI, clickedNode.x1 - clickedNode.x0));
        const newY0 = Math.max(0, clickedNode.y0);
        const newY1 = Math.min(radius, clickedNode.y1);

        // Update partition with zoom
        const newPartition = partition<HierarchyNode>()
          .size([newX1 - newX0, newY1 - newY0]);

        // Smooth transition
        const t = g.transition().duration(750);

        arcs.transition(t)
          .attrTween('d', (node) => {
            const interpolateX0 = interpolate(node.x0, node.x0 - clickedNode.x0);
            const interpolateX1 = interpolate(node.x1, node.x1 - clickedNode.x0);
            const interpolateY0 = interpolate(node.y0, node.y0 - clickedNode.y0);
            const interpolateY1 = interpolate(node.y1, node.y1 - clickedNode.y0);

            return (time) => {
              node.x0 = interpolateX0(time);
              node.x1 = interpolateX1(time);
              node.y0 = interpolateY0(time);
              node.y1 = interpolateY1(time);
              return arcGenerator(node);
            };
          });
      });

    // Add dynamic text labels that appear/fade based on interaction
    const labels = g.selectAll('text')
      .data(root.descendants().filter(d => d.depth > 0))
      .enter()
      .append('text')
      .attr('class', 'sunburst-label')
      .attr('transform', d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;
        return `translate(${x}, ${y})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', d => {
        const segmentSize = (d.y1 - d.y0);
        const baseSize = Math.min(14, Math.max(6, segmentSize / 3));
        // Different sizes for different levels
        if (d.depth === 1) return Math.min(baseSize + 4, 18) + 'px';
        if (d.depth === 2) return Math.min(baseSize + 2, 14) + 'px';
        if (d.depth === 3) return Math.min(baseSize + 1, 12) + 'px';
        return Math.min(baseSize, 10) + 'px';
      })
      .style('font-family', 'Inter, system-ui, sans-serif')
      .style('font-weight', d => d.depth <= 2 ? '700' : '600')
      .style('fill', d => {
        // Use dark text for light segments, light text for dark segments
        const colorScale = getColorScale(d.depth);
        const color = colorScale(d.data.name);
        const isLightColor = ['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#f8fafc', '#f1f5f9', '#e2e8f0'].includes(color);
        return isLightColor ? '#1f2937' : '#ffffff';
      })
      .style('text-shadow', d => {
        const colorScale = getColorScale(d.depth);
        const color = colorScale(d.data.name);
        const isLightColor = ['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#f8fafc', '#f1f5f9', '#e2e8f0'].includes(color);
        return isLightColor ? '1px 1px 2px rgba(255, 255, 255, 0.8)' : '2px 2px 4px rgba(0, 0, 0, 0.8)';
      })
      .style('pointer-events', 'none')
      .style('opacity', d => {
        // Dynamic opacity based on segment size and level
        const angleDiff = d.x1 - d.x0;
        const radiusDiff = d.y1 - d.y0;
        const area = angleDiff * radiusDiff;
        
        // Show labels based on size and importance
        if (d.depth === 1 && angleDiff > 0.15) return 1; // Theme clusters - always visible if large enough
        if (d.depth === 2 && angleDiff > 0.1 && area > 0.02) return 0.9; // Knowledge areas
        if (d.depth === 3 && angleDiff > 0.08 && area > 0.015) return 0.7; // Disciplines  
        if (d.depth === 4 && angleDiff > 0.06 && area > 0.01) return 0.5; // Roles
        if (d.depth === 5 && angleDiff > 0.04 && area > 0.008) return 0.3; // Tools - subtle
        return 0; // Hide if too small
      })
      .style('transition', 'opacity 0.3s ease, font-size 0.3s ease')
      .text(d => {
        const angleDiff = d.x1 - d.x0;
        // Adaptive text length based on segment size
        const maxLength = Math.floor(angleDiff * 15); // More responsive to angle
        let text = d.data.name;
        
        // Smart truncation with category-aware abbreviations
        if (text.length > maxLength && maxLength > 3) {
          // For common words, use smart abbreviations
          text = text.replace(/Development/g, 'Dev')
                    .replace(/Technology/g, 'Tech')
                    .replace(/Management/g, 'Mgmt')
                    .replace(/Engineering/g, 'Eng')
                    .replace(/Intelligence/g, 'Intel')
                    .replace(/Application/g, 'App');
          
          if (text.length > maxLength) {
            text = text.substring(0, maxLength - 3) + '...';
          }
        }
        
        return text;
      });

    // Add center circle with vibrant styling and enhanced shadows
    const centerGroup = g.append('g')
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(6px 6px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0px 0px 8px rgba(0, 255, 136, 0.3))')
      .on('click', () => {
        // Reset to root view
        location.reload(); // Simple reset for now
      });

    centerGroup.append('circle')
      .attr('r', 40)
      .attr('fill', '#ffffff')
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 3);

    // Add return icon (home icon) with vibrant styling
    centerGroup.append('g')
      .attr('transform', 'translate(-12, -12) scale(1)')
      .append('path')
      .attr('d', 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z') // Home icon path
      .attr('fill', '#1f2937')
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 0.8);

  }, [data, dimensions, buildHierarchy, getColorScale]);

  if (loading) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-[70vh] flex justify-center items-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-900/10 to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading knowledge visualization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-[70vh] flex justify-center items-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-900/10 to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 font-medium">Failed to load visualization</p>
          <p className="text-white text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="modal z-[60]" onClick={() => setShowInstructions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">🌟 Welcome to Knowledge Visualization</h2>
            <div className="text-left space-y-3 mb-6">
              <p className="text-gray-300">Explore our interactive 5-level knowledge hierarchy:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md border border-gray-300" style={{backgroundColor: '#ffffff'}}></div>
                  <span>Level 1: Theme Clusters (broad domains)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md" style={{backgroundColor: '#00ff88'}}></div>
                  <span>Level 2: Knowledge Areas (specific fields)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md border border-gray-300" style={{backgroundColor: '#f1f5f9'}}></div>
                  <span>Level 3: Disciplines (academic areas)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md" style={{backgroundColor: '#00ff9f'}}></div>
                  <span>Level 4: Roles (professional paths)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md" style={{backgroundColor: '#6b7280'}}></div>
                  <span>Level 5: Tools/Technologies</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded shadow-md border-2 border-white" style={{backgroundColor: '#00ffff', filter: 'drop-shadow(0px 0px 4px rgba(0, 255, 255, 0.6))'}}></div>
                  <span className="font-medium text-cyan-300">💎 Tools with Content Modules</span>
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded text-sm">
                <p className="font-medium mb-2">How to interact:</p>
                <ul className="space-y-1 text-gray-300">
                  <li>• Hover over <span className="text-cyan-300 font-medium">bright cyan tools</span> to see content modules</li>
                  <li>• Click segments to zoom in and explore</li>
                  <li>• Click center home icon (🏠) to return to full view</li>
                </ul>
              </div>
            </div>
            <button onClick={() => setShowInstructions(false)} className="primary w-full">
              Start Exploring
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Visualization with Enhanced Background */}
      <div className="w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black min-h-[70vh] flex justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent"></div>
        <div className="absolute inset-0 bg-radial-gradient opacity-20"></div>
        
        {/* Floating Legend */}
        <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-gray-600 z-20">
          <p className="text-xs text-gray-300 mb-2">Legend:</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded border-2 border-white" style={{backgroundColor: '#00ffff', filter: 'drop-shadow(0px 0px 4px rgba(0, 255, 255, 0.6))'}}></div>
            <span className="text-cyan-300 font-medium">Tools with Content</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Hover over cyan tools to see content modules!</p>
        </div>
        
        <svg ref={svgRef} className="drop-shadow-2xl relative z-10" style={{filter: 'drop-shadow(8px 8px 16px rgba(0, 0, 0, 0.3)) drop-shadow(0px 0px 12px rgba(0, 255, 136, 0.1))'}}></svg>
      </div>

      {/* Fixed Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[70] bg-gray-800 text-white p-4 rounded-lg shadow-xl max-w-md border border-gray-600"
          style={{
            left: Math.min(tooltipPosition.x + 15, window.innerWidth - 400),
            top: Math.max(tooltipPosition.y - 10, 10),
            pointerEvents: 'none'
          }}
        >
          <h4 className="font-bold text-lg mb-2">{tooltip.name}</h4>
          <p className="text-sm text-gray-300 mb-2">Level {tooltip.level}</p>
          
          {tooltip.description && (
            <p className="text-sm mb-3">{tooltip.description}</p>
          )}
          
          {tooltip.voiceHook && (
            <div className="mb-3">
              <p className="text-xs text-blue-300 font-medium mb-1">Voice Hook:</p>
              <p className="text-sm italic">&quot;{tooltip.voiceHook}&quot;</p>
            </div>
          )}
          
          {tooltip.relatedContent && tooltip.relatedContent.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-cyan-300 font-medium mb-2">📚 Related Content ({tooltip.relatedContent.length}):</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tooltip.relatedContent
                  .filter(content => content.moderationStatus === 'approved')
                  .slice(0, 3)
                  .map((content, index) => (
                  <div key={content._id} className="bg-gray-700 rounded p-2 border-l-2 border-cyan-400">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{content.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            content.contentType === 'video' ? 'bg-red-500/20 text-red-300' :
                            content.contentType === 'interactive' ? 'bg-blue-500/20 text-blue-300' :
                            content.contentType === 'audio' ? 'bg-purple-500/20 text-purple-300' :
                            content.contentType === 'document' ? 'bg-green-500/20 text-green-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {content.contentType === 'video' ? '🎥' : 
                             content.contentType === 'interactive' ? '🔧' :
                             content.contentType === 'audio' ? '🎵' :
                             content.contentType === 'document' ? '📄' : '🔗'} {content.contentType}
                          </span>
                          {content.youtubeUrl && (
                            <span className="text-xs text-red-400">YouTube</span>
                          )}
                        </div>
                        {content.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{content.description}</p>
                        )}
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {content.tags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tagIndex} className="text-xs bg-gray-600 text-gray-300 px-1 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tooltip.relatedContent.filter(content => content.moderationStatus === 'approved').length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{tooltip.relatedContent.filter(content => content.moderationStatus === 'approved').length - 3} more content modules
                  </p>
                )}
              </div>
            </div>
          )}
          
          {tooltip.guestSpeaker && (
            <div className="bg-gray-700 rounded p-2">
              <p className="text-xs text-green-300 font-medium mb-1">Guest Speaker:</p>
              <p className="text-sm font-medium">{tooltip.guestSpeaker.name}</p>
              <p className="text-xs text-gray-400">{tooltip.guestSpeaker.title}</p>
              <p className="text-xs text-gray-400">{tooltip.guestSpeaker.organization}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SunburstVisualization; 