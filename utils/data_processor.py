import pandas as pd
import json
import networkx as nx
from typing import Dict, Any, List

class DataProcessor:
    """Utility class for processing uploaded data files"""
    
    def __init__(self):
        pass
    
    def process_csv(self, filepath: str, graph: nx.DiGraph) -> Dict[str, int]:
        """
        Process CSV file and add data to graph
        
        Expected CSV format:
        - source_entity, target_entity, relationship_type, weight, follower_count, engagement_score
        
        Args:
            filepath: Path to CSV file
            graph: NetworkX graph to update
            
        Returns:
            Dictionary with counts of nodes and edges added
        """
        try:
            df = pd.read_csv(filepath)
            nodes_added = 0
            edges_added = 0
            
            # Process each row
            for _, row in df.iterrows():
                source = str(row.get('source_entity', ''))
                target = str(row.get('target_entity', ''))
                relationship_type = str(row.get('relationship_type', 'unknown'))
                weight = float(row.get('weight', 1.0))
                
                # Add source node if not exists
                if source and source not in graph:
                    graph.add_node(source,
                                 follower_count=int(row.get('source_followers', 0)),
                                 engagement_score=float(row.get('source_engagement', 0.0)),
                                 node_type='user')
                    nodes_added += 1
                
                # Add target node if not exists
                if target and target not in graph:
                    graph.add_node(target,
                                 follower_count=int(row.get('target_followers', 0)),
                                 engagement_score=float(row.get('target_engagement', 0.0)),
                                 node_type='user')
                    nodes_added += 1
                
                # Add edge if both nodes exist
                if source and target:
                    # For "follows" relationships, reverse the edge direction to represent influence flow
                    # If A follows B, then B influences A, so edge should be B -> A
                    if relationship_type == 'follows':
                        graph.add_edge(target, source,
                                     relationship_type=relationship_type,
                                     weight=weight)
                    else:
                        # For other relationships, keep original direction
                        graph.add_edge(source, target,
                                     relationship_type=relationship_type,
                                     weight=weight)
                    edges_added += 1
            
            return {
                'nodes_added': nodes_added,
                'edges_added': edges_added,
                'total_rows_processed': len(df)
            }
            
        except Exception as e:
            raise Exception(f"Error processing CSV file: {str(e)}")
    
    def process_json(self, filepath: str, graph: nx.DiGraph) -> Dict[str, int]:
        """
        Process JSON file and add data to graph
        
        Expected JSON format:
        {
            "nodes": [
                {
                    "id": "user1",
                    "follower_count": 1000,
                    "engagement_score": 0.5
                }
            ],
            "edges": [
                {
                    "source": "user1",
                    "target": "user2",
                    "relationship_type": "follows",
                    "weight": 1.0
                }
            ]
        }
        
        Args:
            filepath: Path to JSON file
            graph: NetworkX graph to update
            
        Returns:
            Dictionary with counts of nodes and edges added
        """
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            nodes_added = 0
            edges_added = 0
            
            # Process nodes
            if 'nodes' in data:
                for node_data in data['nodes']:
                    node_id = str(node_data.get('id', ''))
                    if node_id and node_id not in graph:
                        graph.add_node(node_id,
                                     follower_count=int(node_data.get('follower_count', 0)),
                                     engagement_score=float(node_data.get('engagement_score', 0.0)),
                                     node_type=node_data.get('node_type', 'user'))
                        nodes_added += 1
            
            # Process edges
            if 'edges' in data:
                for edge_data in data['edges']:
                    source = str(edge_data.get('source', ''))
                    target = str(edge_data.get('target', ''))
                    relationship_type = str(edge_data.get('relationship_type', 'unknown'))
                    weight = float(edge_data.get('weight', 1.0))
                    
                    if source and target:
                        # Ensure both nodes exist
                        if source not in graph:
                            graph.add_node(source, follower_count=0, engagement_score=0.0, node_type='user')
                            nodes_added += 1
                        if target not in graph:
                            graph.add_node(target, follower_count=0, engagement_score=0.0, node_type='user')
                            nodes_added += 1
                        
                        # For "follows" relationships, reverse the edge direction to represent influence flow
                        # If A follows B, then B influences A, so edge should be B -> A
                        if relationship_type == 'follows':
                            graph.add_edge(target, source,
                                         relationship_type=relationship_type,
                                         weight=weight)
                        else:
                            # For other relationships, keep original direction
                            graph.add_edge(source, target,
                                         relationship_type=relationship_type,
                                         weight=weight)
                        edges_added += 1
            
            return {
                'nodes_added': nodes_added,
                'edges_added': edges_added,
                'total_nodes_in_file': len(data.get('nodes', [])),
                'total_edges_in_file': len(data.get('edges', []))
            }
            
        except Exception as e:
            raise Exception(f"Error processing JSON file: {str(e)}")
    
    def validate_csv_format(self, filepath: str) -> Dict[str, Any]:
        """
        Validate CSV file format and return information about the file
        
        Args:
            filepath: Path to CSV file
            
        Returns:
            Dictionary with validation results and file info
        """
        try:
            df = pd.read_csv(filepath)
            
            required_columns = ['source_entity', 'target_entity']
            optional_columns = ['relationship_type', 'weight', 'source_followers', 'target_followers', 
                              'source_engagement', 'target_engagement']
            
            missing_required = [col for col in required_columns if col not in df.columns]
            available_optional = [col for col in optional_columns if col in df.columns]
            
            return {
                'is_valid': len(missing_required) == 0,
                'total_rows': len(df),
                'columns': list(df.columns),
                'missing_required_columns': missing_required,
                'available_optional_columns': available_optional,
                'sample_data': df.head(3).to_dict('records') if len(df) > 0 else []
            }
            
        except Exception as e:
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    def validate_json_format(self, filepath: str) -> Dict[str, Any]:
        """
        Validate JSON file format and return information about the file
        
        Args:
            filepath: Path to JSON file
            
        Returns:
            Dictionary with validation results and file info
        """
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            has_nodes = 'nodes' in data and isinstance(data['nodes'], list)
            has_edges = 'edges' in data and isinstance(data['edges'], list)
            
            node_count = len(data.get('nodes', []))
            edge_count = len(data.get('edges', []))
            
            # Check node structure
            node_sample = data.get('nodes', [])[:3] if has_nodes else []
            edge_sample = data.get('edges', [])[:3] if has_edges else []
            
            return {
                'is_valid': has_nodes or has_edges,
                'has_nodes': has_nodes,
                'has_edges': has_edges,
                'node_count': node_count,
                'edge_count': edge_count,
                'node_sample': node_sample,
                'edge_sample': edge_sample
            }
            
        except Exception as e:
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    def export_graph_to_csv(self, graph: nx.DiGraph, filepath: str) -> bool:
        """
        Export graph data to CSV format
        
        Args:
            graph: NetworkX graph to export
            filepath: Output file path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            rows = []
            
            for source, target, data in graph.edges(data=True):
                source_data = graph.nodes[source]
                target_data = graph.nodes[target]
                
                row = {
                    'source_entity': source,
                    'target_entity': target,
                    'relationship_type': data.get('relationship_type', 'unknown'),
                    'weight': data.get('weight', 1.0),
                    'source_followers': source_data.get('follower_count', 0),
                    'source_engagement': source_data.get('engagement_score', 0.0),
                    'target_followers': target_data.get('follower_count', 0),
                    'target_engagement': target_data.get('engagement_score', 0.0)
                }
                rows.append(row)
            
            df = pd.DataFrame(rows)
            df.to_csv(filepath, index=False)
            return True
            
        except Exception as e:
            print(f"Error exporting to CSV: {e}")
            return False
    
    def export_graph_to_json(self, graph: nx.DiGraph, filepath: str) -> bool:
        """
        Export graph data to JSON format
        
        Args:
            graph: NetworkX graph to export
            filepath: Output file path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            nodes = []
            edges = []
            
            # Export nodes
            for node, data in graph.nodes(data=True):
                node_data = {
                    'id': node,
                    'follower_count': data.get('follower_count', 0),
                    'engagement_score': data.get('engagement_score', 0.0),
                    'node_type': data.get('node_type', 'user')
                }
                nodes.append(node_data)
            
            # Export edges
            for source, target, data in graph.edges(data=True):
                edge_data = {
                    'source': source,
                    'target': target,
                    'relationship_type': data.get('relationship_type', 'unknown'),
                    'weight': data.get('weight', 1.0)
                }
                edges.append(edge_data)
            
            output_data = {
                'nodes': nodes,
                'edges': edges,
                'metadata': {
                    'node_count': len(nodes),
                    'edge_count': len(edges),
                    'export_timestamp': pd.Timestamp.now().isoformat()
                }
            }
            
            with open(filepath, 'w') as f:
                json.dump(output_data, f, indent=2)
            
            return True
            
        except Exception as e:
            print(f"Error exporting to JSON: {e}")
            return False 