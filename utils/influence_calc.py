import networkx as nx
import numpy as np
from typing import Dict, List, Any, Tuple
from collections import defaultdict

class InfluenceCalculator:
    """Utility class for calculating influence metrics and analyzing networks"""
    
    def __init__(self):
        pass
    
    def get_influence_chain(self, graph: nx.DiGraph, user: str, depth: int = 3) -> Dict[str, Any]:
        """
        Get the influence chain of a specific user
        
        Args:
            graph: NetworkX DiGraph
            user: User to analyze
            depth: Maximum depth to explore
            
        Returns:
            Dictionary containing influence chain information
        """
        if user not in graph:
            return {'error': f'User {user} not found in graph'}
        
        # Get nodes within specified depth
        influenced_by = []  # Users who influence this user
        influences = []     # Users influenced by this user
        
        # BFS to find influence chain
        def bfs_influence(start_node, direction='out', max_depth=depth):
            visited = set()
            queue = [(start_node, 0)]  # (node, current_depth)
            result = []
            
            while queue:
                current_node, current_depth = queue.pop(0)
                
                if current_depth >= max_depth or current_node in visited:
                    continue
                
                visited.add(current_node)
                
                if current_node != start_node:
                    node_data = graph.nodes[current_node]
                    result.append({
                        'user': current_node,
                        'depth': current_depth,
                        'follower_count': node_data.get('follower_count', 0),
                        'engagement_score': node_data.get('engagement_score', 0.0)
                    })
                
                # Get neighbors based on direction
                if direction == 'out':
                    neighbors = list(graph.successors(current_node))
                else:
                    neighbors = list(graph.predecessors(current_node))
                
                for neighbor in neighbors:
                    if neighbor not in visited:
                        queue.append((neighbor, current_depth + 1))
            
            return result
        
        influenced_by = bfs_influence(user, direction='in', max_depth=depth)
        influences = bfs_influence(user, direction='out', max_depth=depth)
        
        # Calculate influence score
        user_data = graph.nodes[user]
        influence_score = self._calculate_influence_score(graph, user)
        
        # Calculate effective follower count (combination of stored value and network connections)
        stored_followers = user_data.get('follower_count', 0)
        network_followers = graph.in_degree(user)  # Incoming edges represent followers
        
        # Use the maximum of stored followers or network-based followers
        # This handles cases where users are added via relationships
        effective_followers = max(stored_followers, network_followers)
        
        return {
            'user': user,
            'influence_score': influence_score,
            'follower_count': effective_followers,
            'engagement_score': user_data.get('engagement_score', 0.0),
            'influenced_by': influenced_by,
            'influences': influences,
            'total_influenced_by': len(influenced_by),
            'total_influences': len(influences)
        }
    
    def get_top_influencers(self, graph: nx.DiGraph, limit: int = 10, niche: str = None) -> List[Dict[str, Any]]:
        """
        Get top influencers in the network
        
        Args:
            graph: NetworkX DiGraph
            limit: Number of top influencers to return
            niche: Optional niche filter (not implemented in basic version)
            
        Returns:
            List of top influencers with their metrics
        """
        if graph.number_of_nodes() == 0:
            return []
        
        influencers = []
        
        # Calculate PageRank
        try:
            pagerank_scores = nx.pagerank(graph, weight='weight')
        except:
            pagerank_scores = {node: 0 for node in graph.nodes()}
        
        # Calculate other centrality measures
        try:
            betweenness_scores = nx.betweenness_centrality(graph, weight='weight')
            in_degree_scores = nx.in_degree_centrality(graph)
            out_degree_scores = nx.out_degree_centrality(graph)
        except:
            betweenness_scores = {node: 0 for node in graph.nodes()}
            in_degree_scores = {node: 0 for node in graph.nodes()}
            out_degree_scores = {node: 0 for node in graph.nodes()}
        
        # Compile influencer data
        for node in graph.nodes():
            node_data = graph.nodes[node]
            
            influence_score = self._calculate_influence_score(graph, node)
            
            # Calculate effective follower count
            stored_followers = node_data.get('follower_count', 0)
            network_followers = graph.in_degree(node)
            effective_followers = max(stored_followers, network_followers)
            
            influencer_data = {
                'user': node,
                'influence_score': influence_score,
                'pagerank': pagerank_scores.get(node, 0),
                'betweenness_centrality': betweenness_scores.get(node, 0),
                'in_degree_centrality': in_degree_scores.get(node, 0),
                'out_degree_centrality': out_degree_scores.get(node, 0),
                'follower_count': effective_followers,
                'engagement_score': node_data.get('engagement_score', 0.0),
                'in_degree': graph.in_degree(node),
                'out_degree': graph.out_degree(node)
            }
            
            influencers.append(influencer_data)
        
        # Sort by influence score (combination of multiple metrics)
        influencers.sort(key=lambda x: x['influence_score'], reverse=True)
        
        return influencers[:limit]
    
    def get_mutual_engagement(self, graph: nx.DiGraph, users: List[str]) -> Dict[str, Any]:
        """
        Get mutual engagement networks between specified users
        
        Args:
            graph: NetworkX DiGraph
            users: List of users to analyze
            
        Returns:
            Dictionary containing mutual engagement information
        """
        if not users:
            return {'error': 'No users provided'}
        
        # Filter users that exist in graph
        valid_users = [user for user in users if user in graph]
        
        if not valid_users:
            return {'error': 'None of the specified users found in graph'}
        
        mutual_connections = []
        engagement_matrix = defaultdict(dict)
        
        # Analyze connections between each pair of users
        for i, user1 in enumerate(valid_users):
            for j, user2 in enumerate(valid_users):
                if i != j:
                    # Check if there's a direct connection
                    if graph.has_edge(user1, user2):
                        edge_data = graph[user1][user2]
                        connection = {
                            'from': user1,
                            'to': user2,
                            'relationship_type': edge_data.get('relationship_type', 'unknown'),
                            'weight': edge_data.get('weight', 1.0)
                        }
                        mutual_connections.append(connection)
                        engagement_matrix[user1][user2] = edge_data.get('weight', 1.0)
                    else:
                        engagement_matrix[user1][user2] = 0
        
        # Find common neighbors (users they both interact with)
        common_neighbors = {}
        for i, user1 in enumerate(valid_users):
            for j, user2 in enumerate(valid_users):
                if i < j:  # Avoid duplicates
                    neighbors1 = set(graph.successors(user1)) | set(graph.predecessors(user1))
                    neighbors2 = set(graph.successors(user2)) | set(graph.predecessors(user2))
                    common = neighbors1 & neighbors2
                    
                    if common:
                        common_neighbors[f"{user1}-{user2}"] = list(common)
        
        # Calculate mutual engagement score
        total_possible_connections = len(valid_users) * (len(valid_users) - 1)
        actual_connections = len(mutual_connections)
        mutual_engagement_score = actual_connections / total_possible_connections if total_possible_connections > 0 else 0
        
        return {
            'users': valid_users,
            'mutual_connections': mutual_connections,
            'common_neighbors': common_neighbors,
            'engagement_matrix': dict(engagement_matrix),
            'mutual_engagement_score': mutual_engagement_score,
            'total_connections': actual_connections,
            'possible_connections': total_possible_connections
        }
    
    def _calculate_influence_score(self, graph: nx.DiGraph, node: str) -> float:
        """
        Calculate a composite influence score for a node
        
        Args:
            graph: NetworkX DiGraph
            node: Node to calculate score for
            
        Returns:
            Composite influence score
        """
        if node not in graph:
            return 0.0
        
        node_data = graph.nodes[node]
        
        # Base metrics
        stored_followers = node_data.get('follower_count', 0)
        network_followers = graph.in_degree(node)
        follower_count = max(stored_followers, network_followers)
        engagement_score = node_data.get('engagement_score', 0.0)
        
        # Network metrics
        in_degree = graph.in_degree(node)
        out_degree = graph.out_degree(node)
        
        # Calculate PageRank if possible
        try:
            pagerank_scores = nx.pagerank(graph, weight='weight')
            pagerank = pagerank_scores.get(node, 0)
        except:
            pagerank = 0
        
        # Weighted combination of metrics
        # Normalize follower count (log scale to prevent dominance)
        normalized_followers = np.log10(follower_count + 1) / 6  # Assuming max ~1M followers
        
        # Combine metrics with weights
        influence_score = (
            normalized_followers * 0.3 +      # 30% follower count
            engagement_score * 0.2 +          # 20% engagement
            (in_degree / max(graph.number_of_nodes(), 1)) * 0.2 +  # 20% in-degree centrality
            (out_degree / max(graph.number_of_nodes(), 1)) * 0.1 + # 10% out-degree centrality
            pagerank * 0.2                    # 20% PageRank
        )
        
        return min(influence_score, 1.0)  # Cap at 1.0
    
    def detect_communities(self, graph: nx.DiGraph) -> Dict[str, Any]:
        """
        Detect communities in the influence network
        
        Args:
            graph: NetworkX DiGraph
            
        Returns:
            Dictionary containing community information
        """
        if graph.number_of_nodes() < 2:
            return {'communities': [], 'modularity': 0}
        
        try:
            # Convert to undirected for community detection
            undirected_graph = graph.to_undirected()
            
            # Use Louvain method for community detection
            import networkx.algorithms.community as nx_comm
            communities = list(nx_comm.greedy_modularity_communities(undirected_graph))
            
            # Calculate modularity
            modularity = nx_comm.modularity(undirected_graph, communities)
            
            # Format communities
            community_data = []
            for i, community in enumerate(communities):
                community_nodes = list(community)
                community_info = {
                    'id': i,
                    'nodes': community_nodes,
                    'size': len(community_nodes),
                    'top_influencers': self._get_top_nodes_in_community(graph, community_nodes, 3)
                }
                community_data.append(community_info)
            
            return {
                'communities': community_data,
                'modularity': modularity,
                'num_communities': len(communities)
            }
            
        except Exception as e:
            print(f"Error in community detection: {e}")
            return {'communities': [], 'modularity': 0, 'error': str(e)}
    
    def _get_top_nodes_in_community(self, graph: nx.DiGraph, nodes: List[str], limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get top influencers within a community
        
        Args:
            graph: NetworkX DiGraph
            nodes: List of nodes in the community
            limit: Number of top nodes to return
            
        Returns:
            List of top influencers in the community
        """
        node_scores = []
        
        for node in nodes:
            if node in graph:
                score = self._calculate_influence_score(graph, node)
                node_data = graph.nodes[node]
                
                node_scores.append({
                    'user': node,
                    'influence_score': score,
                    'follower_count': node_data.get('follower_count', 0),
                    'engagement_score': node_data.get('engagement_score', 0.0)
                })
        
        # Sort by influence score
        node_scores.sort(key=lambda x: x['influence_score'], reverse=True)
        
        return node_scores[:limit]
    
    def calculate_network_metrics(self, graph: nx.DiGraph) -> Dict[str, Any]:
        """
        Calculate comprehensive network metrics
        
        Args:
            graph: NetworkX DiGraph
            
        Returns:
            Dictionary containing various network metrics
        """
        if graph.number_of_nodes() == 0:
            return {'error': 'Empty graph'}
        
        try:
            metrics = {
                'basic_metrics': {
                    'num_nodes': graph.number_of_nodes(),
                    'num_edges': graph.number_of_edges(),
                    'density': nx.density(graph),
                    'is_connected': nx.is_weakly_connected(graph)
                },
                'centrality_metrics': {
                    'avg_degree': sum(dict(graph.degree()).values()) / graph.number_of_nodes(),
                    'avg_in_degree': sum(dict(graph.in_degree()).values()) / graph.number_of_nodes(),
                    'avg_out_degree': sum(dict(graph.out_degree()).values()) / graph.number_of_nodes()
                }
            }
            
            # Add clustering coefficient for undirected version
            try:
                undirected = graph.to_undirected()
                metrics['clustering'] = {
                    'avg_clustering': nx.average_clustering(undirected),
                    'transitivity': nx.transitivity(undirected)
                }
            except:
                metrics['clustering'] = {'avg_clustering': 0, 'transitivity': 0}
            
            # Add path metrics if graph is connected
            if nx.is_weakly_connected(graph):
                try:
                    metrics['path_metrics'] = {
                        'avg_shortest_path': nx.average_shortest_path_length(graph),
                        'diameter': nx.diameter(graph)
                    }
                except:
                    metrics['path_metrics'] = {'avg_shortest_path': 0, 'diameter': 0}
            
            return metrics
            
        except Exception as e:
            return {'error': f'Error calculating network metrics: {str(e)}'} 