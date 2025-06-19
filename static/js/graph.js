// D3.js Graph Visualization for Social Media Influence Graph
class GraphVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.svg = d3.select(`#${containerId}`);
        this.width = 0;
        this.height = 0;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.nodeElements = null;
        this.linkElements = null;
        this.labelElements = null;
        this.tooltip = null;
        
        this.init();
    }

    init() {
        this.setupSVG();
        this.createTooltip();
        this.createLegend();
        this.setupZoom();
        this.setupSimulation();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupSVG() {
        // Try both container IDs (for main page and graph page)
        let container = document.getElementById('graph-container') || 
                       document.getElementById('fullscreen-graph-container');
        
        if (!container) {
            console.error('Graph container not found');
            return;
        }
        
        this.width = container.clientWidth || 800;
        this.height = container.clientHeight || 600;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Create arrow marker definitions
        this.createArrowMarkers();
        
        // Create main group for zooming/panning
        this.g = this.svg.append('g').attr('class', 'main-group');
        
        // Create groups for different elements
        this.linkGroup = this.g.append('g').attr('class', 'links');
        this.nodeGroup = this.g.append('g').attr('class', 'nodes');
        this.labelGroup = this.g.append('g').attr('class', 'labels');
    }

    createArrowMarkers() {
        // Create defs element for markers
        const defs = this.svg.append('defs');
        
        // Create different arrow markers for different relationship types
        const markerTypes = [
            { id: 'arrow-default', color: '#999' },
            { id: 'arrow-follows', color: '#4CAF50' },
            { id: 'arrow-mentions', color: '#FF9800' },
            { id: 'arrow-likes', color: '#E91E63' },
            { id: 'arrow-shares', color: '#2196F3' },
            { id: 'arrow-highlighted', color: '#FF5722' }
        ];
        
        markerTypes.forEach(marker => {
            defs.append('marker')
                .attr('id', marker.id)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 15)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', marker.color)
                .attr('stroke', marker.color);
        });
    }

    createTooltip() {
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    createLegend() {
        // Try both container IDs for legend placement
        const containerSelector = '#graph-container, #fullscreen-graph-container';
        const container = d3.select(containerSelector);
        
        if (container.empty()) {
            console.warn('No container found for legend');
            return;
        }
        
        const legend = container
            .append('div')
            .attr('class', 'legend');
        
        // Node legend
        const nodeSection = legend.append('div').attr('class', 'legend-section');
        nodeSection.append('h4').text('Node Types');
        
        const nodeData = [
            { color: '#ff4444', label: 'Mega Influencers (100K+)' },
            { color: '#ff8844', label: 'Macro Influencers (10K+)' },
            { color: '#ffaa44', label: 'Micro Influencers (1K+)' },
            { color: '#4488ff', label: 'Regular Users' }
        ];
        
        const nodeItems = nodeSection.selectAll('.legend-item')
            .data(nodeData)
            .enter()
            .append('div')
            .attr('class', 'legend-item');
        
        nodeItems.append('div')
            .attr('class', 'legend-color')
            .style('background-color', d => d.color);
        
        nodeItems.append('span')
            .text(d => d.label);
        
        // Relationship legend
        const relationshipSection = legend.append('div').attr('class', 'legend-section');
        relationshipSection.append('h4').text('Relationships');
        
        const relationshipData = [
            { color: '#4CAF50', label: 'Follows' },
            { color: '#FF9800', label: 'Mentions' },
            { color: '#E91E63', label: 'Likes' },
            { color: '#2196F3', label: 'Shares' },
            { color: '#999', label: 'Other' }
        ];
        
        const relationshipItems = relationshipSection.selectAll('.legend-item')
            .data(relationshipData)
            .enter()
            .append('div')
            .attr('class', 'legend-item');
        
        relationshipItems.append('div')
            .attr('class', 'legend-arrow')
            .style('background-color', d => d.color)
            .style('width', '20px')
            .style('height', '2px')
            .style('position', 'relative')
            .append('div')
            .style('position', 'absolute')
            .style('right', '-5px')
            .style('top', '-3px')
            .style('width', '0')
            .style('height', '0')
            .style('border-left', `4px solid ${d => d.color}`)
            .style('border-top', '3px solid transparent')
            .style('border-bottom', '3px solid transparent');
        
        relationshipItems.append('span')
            .text(d => d.label);
    }

    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
    }

    setupSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 5));
    }

    updateGraph(data) {
        if (!data || !data.nodes || !data.links) {
            console.warn('Invalid graph data received');
            return;
        }

        this.nodes = data.nodes.map(d => ({ ...d }));
        this.links = data.links.map(d => ({ ...d }));

        // Process links to handle multiple relationships between same nodes
        this.processMultipleLinks();

        this.updateLinks();
        this.updateNodes();
        this.updateLabels();
        this.updateSimulation();
    }

    processMultipleLinks() {
        // Initialize all links with no curve
        this.links.forEach(link => {
            link.curveOffset = 0;
            link.isMultiple = false;
        });

        // Group all links by node pairs (regardless of direction)
        const nodePairs = {};
        this.links.forEach(link => {
            // Handle both string IDs and object references
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const pairKey = [sourceId, targetId].sort().join('-');
            
            if (!nodePairs[pairKey]) {
                nodePairs[pairKey] = [];
            }
            nodePairs[pairKey].push(link);
            
            // Debug: Log the grouping
            console.log(`Grouping: ${sourceId}->${targetId} (${link.relationship_type}) into key: ${pairKey}`);
        });

        // Process each node pair
        Object.values(nodePairs).forEach(pairLinks => {
            if (pairLinks.length === 1) {
                // Single relationship - no curve needed
                pairLinks[0].curveOffset = 0;
                pairLinks[0].isMultiple = false;
            } else {
                // Multiple relationships between same pair of nodes
                // Sort links to ensure consistent ordering
                pairLinks.sort((a, b) => {
                    // First sort by direction (source-target)
                    const dirA = `${a.source}-${a.target}`;
                    const dirB = `${b.source}-${b.target}`;
                    if (dirA !== dirB) return dirA.localeCompare(dirB);
                    // Then by relationship type for same direction
                    return a.relationship_type.localeCompare(b.relationship_type);
                });

                // Assign curve offsets - spread links with positive and negative offsets
                const totalLinks = pairLinks.length;
                const baseOffset = 50; // Spacing between curves
                
                pairLinks.forEach((link, index) => {
                    // For 2 links: first gets negative offset, second gets positive offset
                    // For 3 links: first negative, middle straight (0), third positive
                    // Formula: (index - center) * spacing
                    const centerIndex = (totalLinks - 1) / 2;
                    const offset = (index - centerIndex) * baseOffset;
                    
                    link.curveOffset = offset;
                    link.isMultiple = true;
                    
                    // Debug: Log the offset assignment
                    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                    console.log(`${srcId}->${tgtId} (${link.relationship_type}): offset=${offset}`);
                });
            }
        });
    }

    updateLinks() {
        // Use paths instead of lines to support curves
        this.linkElements = this.linkGroup
            .selectAll('.link')
            .data(this.links, d => `${d.source}-${d.target}-${d.relationship_type}`);

        this.linkElements.exit().remove();

        const linkEnter = this.linkElements
            .enter()
            .append('path')
            .attr('class', 'link')
            .style('stroke', d => this.getLinkColor(d.relationship_type))
            .style('stroke-width', d => Math.sqrt(d.weight) * 2)
            .style('stroke-opacity', 0.6)
            .style('fill', 'none')
            .attr('marker-end', d => `url(#${this.getArrowMarker(d.relationship_type)})`);

        this.linkElements = linkEnter.merge(this.linkElements)
            .style('stroke', d => this.getLinkColor(d.relationship_type))
            .attr('marker-end', d => `url(#${this.getArrowMarker(d.relationship_type)})`);

        // Add link labels for relationship types
        this.linkLabels = this.labelGroup
            .selectAll('.link-label')
            .data(this.links, d => `${d.source}-${d.target}-${d.relationship_type}`);

        this.linkLabels.exit().remove();

        const linkLabelEnter = this.linkLabels
            .enter()
            .append('g')
            .attr('class', 'link-label');

        // Add background rectangle for better readability
        linkLabelEnter
            .append('rect')
            .attr('class', 'link-label-bg')
            .style('fill', 'rgba(255, 255, 255, 0.9)')
            .style('stroke', '#ddd')
            .style('stroke-width', '0.5px')
            .style('rx', '3px');

        // Add text
        linkLabelEnter
            .append('text')
            .attr('class', 'link-label-text')
            .style('font-size', '10px')
            .style('fill', '#555')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('font-weight', '500')
            .text(d => d.relationship_type);

        this.linkLabels = linkLabelEnter.merge(this.linkLabels);
    }

    getArrowMarker(relationshipType) {
        const type = (relationshipType || '').toLowerCase();
        switch (type) {
            case 'follows': return 'arrow-follows';
            case 'mentions': return 'arrow-mentions';
            case 'likes': return 'arrow-likes';
            case 'shares': return 'arrow-shares';
            default: return 'arrow-default';
        }
    }

    getLinkColor(relationshipType) {
        const type = (relationshipType || '').toLowerCase();
        switch (type) {
            case 'follows': return '#4CAF50';
            case 'mentions': return '#FF9800';
            case 'likes': return '#E91E63';
            case 'shares': return '#2196F3';
            default: return '#999';
        }
    }

    updateNodes() {
        this.nodeElements = this.nodeGroup
            .selectAll('.node')
            .data(this.nodes, d => d.id);

        this.nodeElements.exit().remove();

        const nodeEnter = this.nodeElements
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', d => d.size || 10)
            .style('fill', d => d.color || '#4488ff')
            .style('stroke', '#fff')
            .style('stroke-width', 2)
            .call(this.drag());

        // Add hover effects
        nodeEnter
            .on('mouseover', (event, d) => {
                this.showTooltip(event, d);
                this.highlightConnections(d);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                this.unhighlightConnections();
            })
            .on('click', (event, d) => {
                this.handleNodeClick(d);
            });

        this.nodeElements = nodeEnter.merge(this.nodeElements);
    }

    updateLabels() {
        this.labelElements = this.labelGroup
            .selectAll('.node-label')
            .data(this.nodes, d => d.id);

        this.labelElements.exit().remove();

        const labelEnter = this.labelElements
            .enter()
            .append('text')
            .attr('class', 'node-label')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#333')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text(d => d.name || d.id);

        this.labelElements = labelEnter.merge(this.labelElements);
    }

    updateSimulation() {
        this.simulation
            .nodes(this.nodes)
            .on('tick', () => this.ticked());

        this.simulation
            .force('link')
            .links(this.links);

        this.simulation.alpha(1).restart();
    }

    ticked() {
        if (this.linkElements) {
            this.linkElements.attr('d', d => this.createLinkPath(d));
        }

        if (this.nodeElements) {
            this.nodeElements
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        }

        if (this.labelElements) {
            this.labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y + 4);
        }

        if (this.linkLabels) {
            this.linkLabels.each((d, i, nodes) => {
                const pathData = this.createLinkPath(d);
                const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathElement.setAttribute('d', pathData);
                
                const pathLength = pathElement.getTotalLength();
                const midPoint = pathElement.getPointAtLength(pathLength / 2);
                
                const labelGroup = d3.select(nodes[i]);
                const text = labelGroup.select('.link-label-text');
                const bg = labelGroup.select('.link-label-bg');
                
                // Position text
                text
                    .attr('x', midPoint.x)
                    .attr('y', midPoint.y - 5);
                
                // Get text dimensions and position background
                const textNode = text.node();
                if (textNode) {
                    const bbox = textNode.getBBox();
                    bg
                        .attr('x', bbox.x - 2)
                        .attr('y', bbox.y - 1)
                        .attr('width', bbox.width + 4)
                        .attr('height', bbox.height + 2);
                }
            });
        }
    }

    createLinkPath(d) {
        const sourceRadius = d.source.size || 10;
        const targetRadius = d.target.size || 10;
        
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return '';
        
        // Calculate start and end points (edge of circles)
        const startX = d.source.x + (dx / distance) * sourceRadius;
        const startY = d.source.y + (dy / distance) * sourceRadius;
        const endX = d.target.x - (dx / distance) * (targetRadius + 5); // +5 for arrow space
        const endY = d.target.y - (dy / distance) * (targetRadius + 5);
        
        // If no curve needed (single relationship), draw straight line
        if (!d.isMultiple || d.curveOffset === 0) {
            return `M ${startX} ${startY} L ${endX} ${endY}`;
        }
        

        
        // Calculate control point for curve
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Perpendicular vector for curve offset
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        const controlX = midX + perpX * d.curveOffset;
        const controlY = midY + perpY * d.curveOffset;
        
        // Create quadratic curve
        return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    }

    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    showTooltip(event, d) {
        const tooltipContent = `
            <strong>${d.name || d.id}</strong><br/>
            Followers: ${(d.follower_count || 0).toLocaleString()}<br/>
            Engagement: ${(d.engagement_score || 0).toFixed(3)}<br/>
            Node Type: ${d.node_type || 'user'}
        `;

        this.tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }

    highlightConnections(node) {
        // Highlight connected nodes and links
        const connectedNodeIds = new Set();
        
        this.linkElements
            .style('stroke-opacity', d => {
                if (d.source.id === node.id || d.target.id === node.id) {
                    connectedNodeIds.add(d.source.id);
                    connectedNodeIds.add(d.target.id);
                    return 1;
                }
                return 0.1;
            })
            .style('stroke-width', d => {
                if (d.source.id === node.id || d.target.id === node.id) {
                    return Math.sqrt(d.weight) * 3;
                }
                return Math.sqrt(d.weight) * 2;
            })
            .attr('marker-end', d => {
                if (d.source.id === node.id || d.target.id === node.id) {
                    return 'url(#arrow-highlighted)';
                }
                return `url(#${this.getArrowMarker(d.relationship_type)})`;
            });

        this.nodeElements
            .style('opacity', d => {
                return connectedNodeIds.has(d.id) ? 1 : 0.3;
            });

        this.labelElements
            .style('opacity', d => {
                return connectedNodeIds.has(d.id) ? 1 : 0.3;
            });
    }

    unhighlightConnections() {
        this.linkElements
            .style('stroke-opacity', 0.6)
            .style('stroke-width', d => Math.sqrt(d.weight) * 2)
            .attr('marker-end', d => `url(#${this.getArrowMarker(d.relationship_type)})`);

        this.nodeElements.style('opacity', 1);
        this.labelElements.style('opacity', 1);
    }

    handleNodeClick(node) {
        // Fill the query form with the clicked node
        const queryUserInput = document.getElementById('query-user');
        if (queryUserInput) {
            queryUserInput.value = node.id;
        }

        // Optionally trigger the query
        console.log('Node clicked:', node);
    }

    handleResize() {
        const container = document.getElementById('graph-container') || 
                         document.getElementById('fullscreen-graph-container');
        
        if (!container) return;
        
        this.width = container.clientWidth || 800;
        this.height = container.clientHeight || 600;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        
        this.simulation
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .restart();
    }

    // Public methods for external control
    zoomToFit() {
        if (this.nodes.length === 0) return;

        const bounds = this.getGraphBounds();
        const fullWidth = this.width;
        const fullHeight = this.height;
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const midX = (bounds.maxX + bounds.minX) / 2;
        const midY = (bounds.maxY + bounds.minY) / 2;

        if (width === 0 || height === 0) return;

        const scale = Math.min(fullWidth / width, fullHeight / height) * 0.8;
        const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

        this.svg.transition()
            .duration(750)
            .call(
                this.zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
    }

    getGraphBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        });

        return { minX, minY, maxX, maxY };
    }

    centerGraph() {
        this.svg.transition()
            .duration(750)
            .call(
                this.zoom.transform,
                d3.zoomIdentity.translate(0, 0).scale(1)
            );
    }

    highlightNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            this.highlightConnections(node);
            
            // Center on the node
            const transform = d3.zoomTransform(this.svg.node());
            const x = transform.invertX(this.width / 2) - node.x;
            const y = transform.invertY(this.height / 2) - node.y;
            
            this.svg.transition()
                .duration(750)
                .call(
                    this.zoom.transform,
                    transform.translate(x, y)
                );
        }
    }
}

// Initialize graph visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check which SVG element exists and initialize accordingly
    const mainGraphSvg = document.getElementById('network-graph');
    const fullscreenGraphSvg = document.getElementById('fullscreen-network-graph');
    
    if (fullscreenGraphSvg) {
        // We're on the graph page
        window.graphVisualizer = new GraphVisualizer('fullscreen-network-graph');
        
        // Load initial graph data
        fetch('/api/get_graph_data')
            .then(response => response.json())
            .then(data => {
                if (window.graphVisualizer) {
                    window.graphVisualizer.updateGraph(data);
                }
            })
            .catch(error => console.error('Error loading graph data:', error));
            
        // Setup graph page controls
        setupGraphPageControls();
    } else if (mainGraphSvg) {
        // We're on the main page
        window.graphVisualizer = new GraphVisualizer('network-graph');
    }
});

function setupGraphPageControls() {
    // Zoom to fit button
    const zoomFitBtn = document.getElementById('zoom-fit');
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => {
            if (window.graphVisualizer) {
                window.graphVisualizer.zoomToFit();
            }
        });
    }
    
    // Center graph button
    const centerBtn = document.getElementById('center-graph');
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            if (window.graphVisualizer) {
                window.graphVisualizer.centerGraph();
            }
        });
    }
    
    // Refresh graph button
    const refreshBtn = document.getElementById('refresh-graph');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetch('/api/get_graph_data')
                .then(response => response.json())
                .then(data => {
                    if (window.graphVisualizer) {
                        window.graphVisualizer.updateGraph(data);
                    }
                })
                .catch(error => console.error('Error refreshing graph:', error));
        });
    }
    
    // Highlight node functionality
    const highlightBtn = document.getElementById('highlight-node');
    const nodeSearchInput = document.getElementById('node-search');
    
    if (highlightBtn && nodeSearchInput) {
        highlightBtn.addEventListener('click', () => {
            const nodeId = nodeSearchInput.value.trim();
            if (nodeId && window.graphVisualizer) {
                window.graphVisualizer.highlightNode(nodeId);
            }
        });
        
        nodeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                highlightBtn.click();
            }
        });
    }
    
    // Update graph stats
    updateGraphStats();
}

function updateGraphStats() {
    fetch('/api/get_analytics')
        .then(response => response.json())
        .then(data => {
            const nodeCountEl = document.getElementById('graph-node-count');
            const edgeCountEl = document.getElementById('graph-edge-count');
            const densityEl = document.getElementById('graph-density');
            
            if (nodeCountEl) nodeCountEl.textContent = data.total_nodes || 0;
            if (edgeCountEl) edgeCountEl.textContent = data.total_edges || 0;
            if (densityEl) densityEl.textContent = (data.density || 0).toFixed(3);
        })
        .catch(error => console.error('Error updating graph stats:', error));
} 