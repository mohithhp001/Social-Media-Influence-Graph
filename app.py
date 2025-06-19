from flask import Flask, render_template, request, jsonify, redirect, url_for
import networkx as nx
import pandas as pd
import json
import os
from werkzeug.utils import secure_filename
from utils.graph_utils import GraphProcessor
from utils.data_processor import DataProcessor
from utils.influence_calc import InfluenceCalculator

# Ontology imports
import rdflib
from rdflib.namespace import RDF, Namespace

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'static/data'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Load ontology
ontology = rdflib.Graph()
ontology.parse('ontology.owl', format='turtle')
NS = Namespace('http://example.org/socialmedia#')

# Validation function
def validate_relationship(source_type, relation, target_type):
    rel = NS[relation]
    domain = ontology.value(rel, NS.domain)
    range_ = ontology.value(rel, NS.range)
    if domain and range_:
        if domain.split('#')[-1] == source_type and range_.split('#')[-1] == target_type:
            return True
    return False

# Initialize processors
graph_processor = GraphProcessor()
data_processor = DataProcessor()
influence_calc = InfluenceCalculator()

# Global graph to store the influence network
influence_graph = nx.DiGraph()

@app.route('/')
def index():
    """Main page with input forms and basic visualization"""
    return render_template('index.html')

@app.route('/graph')
def graph_view():
    """Dedicated graph visualization page"""
    return render_template('graph.html')

@app.route('/analytics')
def analytics():
    """Analytics dashboard"""
    return render_template('analytics.html')

@app.route('/api/add_user', methods=['POST'])
def add_user():
    """Add a new user to the graph"""
    try:
        data = request.get_json()
        user_handle = data.get('user_handle')
        follower_count = int(data.get('follower_count', 0))
        engagement_score = float(data.get('engagement_score', 0.0))
        
        # Add user to graph with attributes
        influence_graph.add_node(user_handle, 
                                follower_count=follower_count,
                                engagement_score=engagement_score,
                                node_type='user')
        
        return jsonify({
            'status': 'success',
            'message': f'User {user_handle} added successfully',
            'node_count': influence_graph.number_of_nodes()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/add_relationship', methods=['POST'])
def add_relationship():
    """Add a relationship between users with ontology validation"""
    try:
        data = request.get_json()
        source = data.get('source_entity')
        target = data.get('target_entity')
        relationship_type = data.get('relationship_type')
        weight = float(data.get('weight', 1.0))
        
        # Ensure both nodes exist
        if source not in influence_graph:
            influence_graph.add_node(source, follower_count=0, engagement_score=0.0, node_type='user')
        if target not in influence_graph:
            influence_graph.add_node(target, follower_count=0, engagement_score=0.0, node_type='user')

        # Ontology-driven validation
        src_type = influence_graph.nodes[source].get('node_type').capitalize()
        tgt_type = influence_graph.nodes[target].get('node_type').capitalize()
        if not validate_relationship(src_type, relationship_type, tgt_type):
            return jsonify({'status':'error','message':'Invalid relationship per ontology.'}), 400
        
        # For "follows" relationships, reverse edge for influence flow
        if relationship_type == 'follows':
            influence_graph.add_edge(target, source, relationship_type=relationship_type, weight=weight)
        else:
            influence_graph.add_edge(source, target, relationship_type=relationship_type, weight=weight)
        
        return jsonify({
            'status': 'success',
            'message': f'Relationship added: {source} -> {target}',
            'edge_count': influence_graph.number_of_edges()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/upload_file', methods=['POST'])
def upload_file():
    """Handle CSV/JSON file uploads"""
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Process the uploaded file
            if filename.endswith('.csv'):
                result = data_processor.process_csv(filepath, influence_graph)
            elif filename.endswith('.json'):
                result = data_processor.process_json(filepath, influence_graph)
            
            return jsonify({
                'status': 'success',
                'message': f'File processed successfully',
                'nodes_added': result.get('nodes_added', 0),
                'edges_added': result.get('edges_added', 0)
            })
        else:
            return jsonify({'status': 'error', 'message': 'Invalid file type'}), 400
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/get_graph_data')
def get_graph_data():
    """Get graph data for visualization"""
    try:
        graph_data = graph_processor.convert_to_d3_format(influence_graph)
        return jsonify(graph_data)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/query_influence_chain', methods=['POST'])
def query_influence_chain():
    """Query the influence chain of a specific user"""
    try:
        data = request.get_json()
        user = data.get('user')
        depth = int(data.get('depth', 3))
        
        chain = influence_calc.get_influence_chain(influence_graph, user, depth)
        
        if 'error' in chain:
            return jsonify({'status': 'error', 'message': chain['error']}), 404
        
        return jsonify({'status': 'success', 'user': user, 'influence_chain': chain})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/get_top_influencers', methods=['GET'])
def get_top_influencers():
    """Get top influencers in the network"""
    try:
        limit = int(request.args.get('limit', 10))
        niche = request.args.get('niche', None)
        
        influencers = influence_calc.get_top_influencers(influence_graph, limit, niche)
        return jsonify({'status': 'success', 'top_influencers': influencers})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/get_mutual_engagement', methods=['POST'])
def get_mutual_engagement():
    """Get mutual engagement networks"""
    try:
        data = request.get_json()
        users = data.get('users', [])
        
        mutual_network = influence_calc.get_mutual_engagement(influence_graph, users)
        return jsonify({'status': 'success', 'mutual_engagement': mutual_network})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/get_analytics')
def get_analytics():
    """Get network analytics"""
    try:
        node_count = influence_graph.number_of_nodes()
        edge_count = influence_graph.number_of_edges()
        
        if node_count == 0:
            analytics = {'total_nodes': 0,'total_edges': 0,'density': 0.0,'is_connected': False,'average_clustering': 0.0,'pagerank': {}}
        else:
            density = nx.density(influence_graph) if edge_count > 0 else 0.0
            is_conn = nx.is_weakly_connected(influence_graph) if node_count > 1 else True
            try:
                avg_clust = nx.average_clustering(influence_graph.to_undirected()) if node_count > 1 else 0.0
            except:
                avg_clust = 0.0
            try:
                pr = nx.pagerank(influence_graph) if edge_count > 0 else {}
                top_pr = dict(list(pr.items())[:10])
            except:
                top_pr = {}
            analytics = {'total_nodes': node_count,'total_edges': edge_count,'density': density,'is_connected': is_conn,'average_clustering': avg_clust,'pagerank': top_pr}
        
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/clear_graph', methods=['POST'])
def clear_graph():
    """Clear the entire graph"""
    try:
        influence_graph.clear()
        return jsonify({'status': 'success','message': 'Graph cleared successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'csv', 'json'}

@app.route('/NetworkProxy/<path:subpath>')
def handle_network_proxy(subpath):
    """Handle NetworkProxy requests"""
    print(f"NetworkProxy request: {subpath}")
    return jsonify({'status':'ok','note':'Handled'}), 200

@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors and log them"""
    print(f"404 at {request.path}")
    if request.path.startswith('/api/'):
        return jsonify({'status':'error','message': f'API endpoint not found: {request.path}'}), 404
    return render_template('404.html'), 404

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
