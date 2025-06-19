import networkx as nx
import json
from typing import Dict, List, Any

class GraphProcessor:
    """Utility class for processing and converting graph data"""
    
    def __init__(self):
        pass
    
    def convert_to_d3_format(self, graph: nx.DiGraph) -> Dict[str, Any]:
        """
        Convert NetworkX graph to D3.js compatible format
        
        Args:
            graph: NetworkX DiGraph object
            
        Returns:
            Dictionary with nodes and links for D3.js visualization
        """
        nodes = []
        links = []
        
        # Convert nodes
        for node, data in graph.nodes(data=True):
            node_data = {
                'id': node,
                'name': node,
                'follower_count': data.get('follower_count', 0),
                'engagement_score': data.get('engagement_score', 0.0),
                'node_type': data.get('node_type', 'user'),
                'size': self._calculate_node_size(data),
                'color': self._get_node_color(data)
            }
            nodes.append(node_data)
        
        # Convert edges
        for source, target, data in graph.edges(data=True):
            link_data = {
                'source': source,
                'target': target,
                'relationship_type': data.get('relationship_type', 'unknown'),
                'weight': data.get('weight', 1.0),
                'color': self._get_edge_color(data.get('relationship_type', 'unknown'))
            }
            links.append(link_data)
        
        return {
            'nodes': nodes,
            'links': links,
            'metadata': {
                'node_count': len(nodes),
                'edge_count': len(links),
                'density': nx.density(graph) if len(nodes) > 1 else 0
            }
        }
    
    def _calculate_node_size(self, node_data: Dict) -> int:
        """Calculate node size based on influence metrics"""
        follower_count = node_data.get('follower_count', 0)
        engagement_score = node_data.get('engagement_score', 0.0)
        
        # Base size + scaled follower count + engagement bonus
        base_size = 10
        follower_bonus = min(follower_count / 1000, 20)  # Max 20 bonus
        engagement_bonus = engagement_score * 5  # Scale engagement
        
        return int(base_size + follower_bonus + engagement_bonus)
    
    def _get_node_color(self, node_data: Dict) -> str:
        """Determine node color based on influence level"""
        follower_count = node_data.get('follower_count', 0)
        
        if follower_count > 100000:
            return '#ff4444'  # Red for mega influencers
        elif follower_count > 10000:
            return '#ff8844'  # Orange for macro influencers
        elif follower_count > 1000:
            return '#ffaa44'  # Yellow for micro influencers
        else:
            return '#4488ff'  # Blue for regular users
    
    def _get_edge_color(self, relationship_type: str) -> str:
        """Determine edge color based on relationship type"""
        color_map = {
            'follows': '#666666',
            'mentions': '#44aa44',
            'likes': '#ff6666',
            'shares': '#6666ff',
            'created': '#aa44aa',
            'comments': '#44aaaa'
        }
        return color_map.get(relationship_type, '#999999')
    
    def get_subgraph(self, graph: nx.DiGraph, center_node: str, radius: int = 2) -> nx.DiGraph:
        """
        Extract subgraph around a center node
        
        Args:
            graph: Original graph
            center_node: Node to center the subgraph around
            radius: Number of hops from center node
            
        Returns:
            Subgraph containing nodes within radius of center_node
        """
        if center_node not in graph:
            return nx.DiGraph()
        
        # Get nodes within radius
        nodes_in_radius = set([center_node])
        current_nodes = set([center_node])
        
        for _ in range(radius):
            next_nodes = set()
            for node in current_nodes:
                # Add predecessors and successors
                next_nodes.update(graph.predecessors(node))
                next_nodes.update(graph.successors(node))
            
            nodes_in_radius.update(next_nodes)
            current_nodes = next_nodes - nodes_in_radius
        
        return graph.subgraph(nodes_in_radius).copy()
    
    def calculate_centrality_metrics(self, graph: nx.DiGraph) -> Dict[str, Dict[str, float]]:
        """
        Calculate various centrality metrics for all nodes
        
        Args:
            graph: NetworkX DiGraph
            
        Returns:
            Dictionary with centrality metrics for each node
        """
        metrics = {}
        
        try:
            # Calculate different centrality measures
            degree_centrality = nx.degree_centrality(graph)
            in_degree_centrality = nx.in_degree_centrality(graph)
            out_degree_centrality = nx.out_degree_centrality(graph)
            betweenness_centrality = nx.betweenness_centrality(graph)
            pagerank = nx.pagerank(graph)
            
            # Combine metrics for each node
            for node in graph.nodes():
                metrics[node] = {
                    'degree_centrality': degree_centrality.get(node, 0),
                    'in_degree_centrality': in_degree_centrality.get(node, 0),
                    'out_degree_centrality': out_degree_centrality.get(node, 0),
                    'betweenness_centrality': betweenness_centrality.get(node, 0),
                    'pagerank': pagerank.get(node, 0)
                }
        except Exception as e:
            print(f"Error calculating centrality metrics: {e}")
            # Return empty metrics if calculation fails
            for node in graph.nodes():
                metrics[node] = {
                    'degree_centrality': 0,
                    'in_degree_centrality': 0,
                    'out_degree_centrality': 0,
                    'betweenness_centrality': 0,
                    'pagerank': 0
                }
        
        return metrics 