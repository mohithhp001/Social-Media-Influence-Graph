// Main JavaScript for Social Media Influence Graph
class InfluenceGraphApp {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('add-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        document.getElementById('add-relationship-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addRelationship();
        });

        document.getElementById('query-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.queryInfluenceChain();
        });

        // Button clicks
        document.getElementById('refresh-graph').addEventListener('click', () => {
            this.refreshGraph();
        });

        document.getElementById('clear-graph').addEventListener('click', () => {
            this.clearGraph();
        });

        document.getElementById('get-top-influencers').addEventListener('click', () => {
            this.getTopInfluencers();
        });
    }

    async addUser() {
        const form = document.getElementById('add-user-form');
        const formData = new FormData(form);
        
        const userData = {
            user_handle: formData.get('user_handle'),
            follower_count: parseInt(formData.get('follower_count')) || 0,
            engagement_score: parseFloat(formData.get('engagement_score')) || 0.0
        };

        try {
            const response = await fetch(`${this.apiBase}/add_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showMessage(result.message, 'success');
                form.reset();
                this.updateNetworkStats();
                this.refreshGraph();
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Error adding user: ' + error.message, 'error');
        }
    }

    async addRelationship() {
        const form = document.getElementById('add-relationship-form');
        const formData = new FormData(form);
        
        const relationshipData = {
            source_entity: formData.get('source_entity'),
            target_entity: formData.get('target_entity'),
            relationship_type: formData.get('relationship_type'),
            weight: parseFloat(formData.get('weight')) || 1.0
        };

        try {
            const response = await fetch(`${this.apiBase}/add_relationship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(relationshipData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showMessage(result.message, 'success');
                form.reset();
                this.updateNetworkStats();
                this.refreshGraph();
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Error adding relationship: ' + error.message, 'error');
        }
    }

    async queryInfluenceChain() {
        const form = document.getElementById('query-form');
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const queryResultsContainer = document.getElementById('query-results');
        
        const queryData = {
            user: formData.get('user').trim(),
            depth: parseInt(formData.get('depth')) || 3
        };

        // Input validation
        if (!queryData.user) {
            this.showMessage('Please enter a user handle to query', 'error');
            return;
        }

        // Show loading state
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Querying...';
        submitButton.disabled = true;
        
        // Show loading in results area
        queryResultsContainer.innerHTML = `
            <div class="query-loading">
                <div class="loading-spinner"></div>
                <p>Searching influence chain for <strong>"${queryData.user}"</strong> (depth: ${queryData.depth})...</p>
            </div>
        `;

        try {
            const response = await fetch(`${this.apiBase}/query_influence_chain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.displayQueryResults(result.influence_chain, queryData);
                this.showMessage(`✅ Found influence chain for "${result.user}"`, 'success');
                
                // Highlight the queried user in the graph if available
                if (window.graphVisualizer) {
                    window.graphVisualizer.highlightNode(result.user);
                }
            } else {
                this.displayQueryError(result.message, queryData);
                this.showMessage(`❌ ${result.message}`, 'error');
            }
        } catch (error) {
            this.displayQueryError('Network error occurred', queryData);
            this.showMessage('Error querying influence chain: ' + error.message, 'error');
        } finally {
            // Restore button state
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    }

    async getTopInfluencers() {
        try {
            const response = await fetch(`${this.apiBase}/get_top_influencers?limit=10`);
            const result = await response.json();
            
            if (result.status === 'success') {
                this.displayTopInfluencers(result.top_influencers);
                this.showMessage('Top influencers retrieved', 'success');
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            this.showMessage('Error getting top influencers: ' + error.message, 'error');
        }
    }

    async refreshGraph() {
        try {
            const response = await fetch(`${this.apiBase}/get_graph_data`);
            const graphData = await response.json();
            
            if (window.graphVisualizer) {
                window.graphVisualizer.updateGraph(graphData);
            }
            
            this.updateNetworkStats();
            this.showMessage('Graph refreshed', 'info');
        } catch (error) {
            this.showMessage('Error refreshing graph: ' + error.message, 'error');
        }
    }

    async clearGraph() {
        if (confirm('Are you sure you want to clear the entire graph? This action cannot be undone.')) {
            try {
                const response = await fetch(`${this.apiBase}/clear_graph`, {
                    method: 'POST'
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    this.showMessage(result.message, 'success');
                    this.refreshGraph();
                    this.updateNetworkStats();
                    this.clearResults();
                } else {
                    this.showMessage(result.message, 'error');
                }
            } catch (error) {
                this.showMessage('Error clearing graph: ' + error.message, 'error');
            }
        }
    }

    async updateNetworkStats() {
        try {
            const response = await fetch(`${this.apiBase}/get_analytics`);
            const analytics = await response.json();
            
            document.getElementById('node-count').textContent = analytics.total_nodes || 0;
            document.getElementById('edge-count').textContent = analytics.total_edges || 0;
            document.getElementById('density').textContent = (analytics.density || 0).toFixed(3);
        } catch (error) {
            console.error('Error updating network stats:', error);
        }
    }

    displayQueryResults(result, queryData) {
        const container = document.getElementById('query-results');
        
        // Safely handle undefined values
        const influenceScore = result.influence_score || 0;
        const followerCount = result.follower_count || 0;
        const engagementScore = result.engagement_score || 0;
        const influencedBy = result.influenced_by || [];
        const influences = result.influences || [];
        const totalInfluencedBy = result.total_influenced_by || 0;
        const totalInfluences = result.total_influences || 0;
        
        const html = `
            <div class="query-result success">
                <div class="query-header">
                    <div class="query-info">
                        <span class="query-label">Query Result for:</span>
                        <span class="query-user">"${result.user}"</span>
                        <span class="query-depth">(depth: ${queryData.depth})</span>
                    </div>
                    <div class="query-timestamp">${new Date().toLocaleTimeString()}</div>
                </div>
                
                <div class="user-metrics">
                    <div class="metric-card">
                        <span class="metric-label">Influence Score</span>
                        <span class="metric-value influence-score ${this.getInfluenceClass(influenceScore)}">${influenceScore.toFixed(3)}</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Followers</span>
                        <span class="metric-value">${followerCount.toLocaleString()}</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Engagement</span>
                        <span class="metric-value">${engagementScore.toFixed(3)}</span>
                    </div>
                </div>
                
                <div class="influence-network">
                    <div class="influence-section">
                        <h6>👥 Influenced By (${totalInfluencedBy})</h6>
                        ${totalInfluencedBy > 0 ? `
                            <ul class="influence-list">
                                ${influencedBy.slice(0, 5).map(user => 
                                    `<li><span class="user-name">${user.user}</span> <span class="depth-badge">depth ${user.depth}</span></li>`
                                ).join('')}
                                ${influencedBy.length > 5 ? `<li class="more-items">... and ${influencedBy.length - 5} more</li>` : ''}
                            </ul>
                        ` : '<p class="no-data">No incoming influences found</p>'}
                    </div>
                    
                    <div class="influence-section">
                        <h6>📢 Influences Others (${totalInfluences})</h6>
                        ${totalInfluences > 0 ? `
                            <ul class="influence-list">
                                ${influences.slice(0, 5).map(user => 
                                    `<li><span class="user-name">${user.user}</span> <span class="depth-badge">depth ${user.depth}</span></li>`
                                ).join('')}
                                ${influences.length > 5 ? `<li class="more-items">... and ${influences.length - 5} more</li>` : ''}
                            </ul>
                        ` : '<p class="no-data">No outgoing influences found</p>'}
                    </div>
                </div>
                
                <div class="query-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.influenceApp.queryInfluenceChain()">🔄 Refresh Query</button>
                    <button class="btn btn-sm btn-info" onclick="document.getElementById('query-user').value=''; document.getElementById('query-user').focus()">🔍 New Query</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    displayQueryError(errorMessage, queryData) {
        const container = document.getElementById('query-results');
        
        const html = `
            <div class="query-result error">
                <div class="query-header">
                    <div class="query-info">
                        <span class="query-label">Query Failed for:</span>
                        <span class="query-user">"${queryData.user}"</span>
                        <span class="query-depth">(depth: ${queryData.depth})</span>
                    </div>
                    <div class="query-timestamp">${new Date().toLocaleTimeString()}</div>
                </div>
                
                <div class="error-content">
                    <div class="error-icon">❌</div>
                    <div class="error-message">
                        <h6>Error:</h6>
                        <p>${errorMessage}</p>
                    </div>
                </div>
                
                <div class="error-suggestions">
                    <h6>💡 Suggestions:</h6>
                    <ul>
                        <li>Check if the user "${queryData.user}" exists in the network</li>
                        <li>Try a different user handle</li>
                        <li>Make sure the user has been added to the graph</li>
                        <li>Reduce the search depth if the network is small</li>
                    </ul>
                </div>
                
                <div class="query-actions">
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('query-user').focus(); document.getElementById('query-user').select()">✏️ Edit Query</button>
                    <button class="btn btn-sm btn-info" onclick="window.influenceApp.getTopInfluencers()">👑 Show Top Users</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    displayTopInfluencers(influencers) {
        const container = document.getElementById('top-influencers-list');
        
        if (!influencers || influencers.length === 0) {
            container.innerHTML = '<p>No influencers found</p>';
            return;
        }
        
        const html = `
            <div class="influencers-list">
                ${influencers.map((influencer, index) => {
                    const influenceScore = influencer.influence_score || 0;
                    const followerCount = influencer.follower_count || 0;
                    
                    return `
                        <div class="influencer-item">
                            <span class="rank">#${index + 1}</span>
                            <div class="influencer-info">
                                <strong>${influencer.user}</strong>
                                <div class="metrics">
                                    <span class="influence-score ${this.getInfluenceClass(influenceScore)}">
                                        ${influenceScore.toFixed(3)}
                                    </span>
                                    <small>${followerCount.toLocaleString()} followers</small>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    getInfluenceClass(score) {
        if (score > 0.7) return 'influence-high';
        if (score > 0.4) return 'influence-medium';
        return 'influence-low';
    }

    clearResults() {
        document.getElementById('query-results').innerHTML = '<p>No queries performed</p>';
        document.getElementById('top-influencers-list').innerHTML = '<p>No data available</p>';
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('status-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message status-${type}`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    async loadInitialData() {
        await this.updateNetworkStats();
        await this.refreshGraph();
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.influenceApp = new InfluenceGraphApp();
    window.themeManager = new ThemeManager();
});

class ThemeManager {
    constructor() {
        this.toggleBtn = document.getElementById('theme-toggle');
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        this.loadTheme();
    }

    loadTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-mode', theme === 'dark');
        this.updateButton(theme);
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        const theme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        this.updateButton(theme);
    }

    updateButton(theme) {
        if (!this.toggleBtn) return;
        this.toggleBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}
