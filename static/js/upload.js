// File Upload Handler for Social Media Influence Graph
class FileUploadHandler {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        const uploadForm = document.getElementById('upload-form');
        const fileInput = document.getElementById('data-file');

        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });
    }

    setupDragAndDrop() {
        const uploadCard = document.querySelector('#upload-form').closest('.form-card');
        
        uploadCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadCard.classList.add('drag-over');
        });

        uploadCard.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadCard.classList.remove('drag-over');
        });

        uploadCard.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadCard.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                document.getElementById('data-file').files = files;
                this.handleFileSelection(file);
            }
        });
    }

    handleFileSelection(file) {
        if (!file) return;

        const fileInfo = this.getFileInfo(file);
        this.displayFileInfo(fileInfo);
        
        if (this.validateFile(file)) {
            this.showMessage(`File "${file.name}" selected and ready for upload`, 'info');
        }
    }

    async handleFileUpload() {
        const fileInput = document.getElementById('data-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('Please select a file to upload', 'error');
            return;
        }

        if (!this.validateFile(file)) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showUploadProgress(true);
            
            const response = await fetch(`${this.apiBase}/upload_file`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showMessage(
                    `File uploaded successfully! Added ${result.nodes_added} nodes and ${result.edges_added} edges.`,
                    'success'
                );
                
                // Reset form and refresh graph
                document.getElementById('upload-form').reset();
                this.clearFileInfo();
                
                // Refresh the graph and stats
                if (window.influenceApp) {
                    await window.influenceApp.refreshGraph();
                    await window.influenceApp.updateNetworkStats();
                }
            } else {
                this.showMessage(`Upload failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Upload error: ${error.message}`, 'error');
        } finally {
            this.showUploadProgress(false);
        }
    }

    validateFile(file) {
        const maxSize = 16 * 1024 * 1024; // 16MB
        const allowedTypes = ['text/csv', 'application/json', 'text/json'];
        const allowedExtensions = ['.csv', '.json'];

        // Check file size
        if (file.size > maxSize) {
            this.showMessage('File size exceeds 16MB limit', 'error');
            return false;
        }

        // Check file type
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            this.showMessage('Only CSV and JSON files are allowed', 'error');
            return false;
        }

        // Additional MIME type check
        if (!allowedTypes.includes(file.type) && file.type !== '') {
            console.warn('MIME type check failed, but proceeding based on extension');
        }

        return true;
    }

    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type || 'Unknown',
            lastModified: new Date(file.lastModified).toLocaleString(),
            extension: '.' + file.name.split('.').pop().toLowerCase()
        };
    }

    displayFileInfo(fileInfo) {
        const fileInfoContainer = document.querySelector('.file-info');
        
        const infoHTML = `
            <div class="selected-file-info">
                <h5>Selected File:</h5>
                <p><strong>Name:</strong> ${fileInfo.name}</p>
                <p><strong>Size:</strong> ${fileInfo.size}</p>
                <p><strong>Type:</strong> ${fileInfo.extension.toUpperCase()}</p>
                <p><strong>Modified:</strong> ${fileInfo.lastModified}</p>
            </div>
        `;
        
        // Remove existing file info if present
        const existingInfo = fileInfoContainer.querySelector('.selected-file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        fileInfoContainer.insertAdjacentHTML('beforeend', infoHTML);
    }

    clearFileInfo() {
        const existingInfo = document.querySelector('.selected-file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
    }

    showUploadProgress(show) {
        const submitButton = document.querySelector('#upload-form button[type="submit"]');
        
        if (show) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading"></span> Uploading...';
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Upload File';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showMessage(message, type = 'info') {
        if (window.influenceApp) {
            window.influenceApp.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Sample data generators for testing
    generateSampleCSV() {
        const csvContent = `source_entity,target_entity,relationship_type,weight,source_followers,target_followers,source_engagement,target_engagement
@influencer1,@user1,follows,1.0,50000,1000,0.8,0.3
@influencer1,@user2,mentions,2.0,50000,500,0.8,0.2
@user1,@user3,likes,1.5,1000,200,0.3,0.1
@user2,@influencer2,follows,1.0,500,25000,0.2,0.7
@influencer2,@user3,shares,3.0,25000,200,0.7,0.1
@user3,@user1,comments,1.2,200,1000,0.1,0.3
@influencer1,@influencer2,mentions,2.5,50000,25000,0.8,0.7`;
        
        return csvContent;
    }

    generateSampleJSON() {
        const jsonData = {
            nodes: [
                { id: "@influencer1", follower_count: 50000, engagement_score: 0.8, node_type: "user" },
                { id: "@influencer2", follower_count: 25000, engagement_score: 0.7, node_type: "user" },
                { id: "@user1", follower_count: 1000, engagement_score: 0.3, node_type: "user" },
                { id: "@user2", follower_count: 500, engagement_score: 0.2, node_type: "user" },
                { id: "@user3", follower_count: 200, engagement_score: 0.1, node_type: "user" }
            ],
            edges: [
                { source: "@influencer1", target: "@user1", relationship_type: "follows", weight: 1.0 },
                { source: "@influencer1", target: "@user2", relationship_type: "mentions", weight: 2.0 },
                { source: "@user1", target: "@user3", relationship_type: "likes", weight: 1.5 },
                { source: "@user2", target: "@influencer2", relationship_type: "follows", weight: 1.0 },
                { source: "@influencer2", target: "@user3", relationship_type: "shares", weight: 3.0 },
                { source: "@user3", target: "@user1", relationship_type: "comments", weight: 1.2 },
                { source: "@influencer1", target: "@influencer2", relationship_type: "mentions", weight: 2.5 }
            ]
        };
        
        return JSON.stringify(jsonData, null, 2);
    }

    downloadSampleCSV() {
        const csvContent = this.generateSampleCSV();
        this.downloadFile(csvContent, 'sample_influence_data.csv', 'text/csv');
    }

    downloadSampleJSON() {
        const jsonContent = this.generateSampleJSON();
        this.downloadFile(jsonContent, 'sample_influence_data.json', 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Add sample data download buttons
function addSampleDataButtons() {
    const uploadCard = document.querySelector('#upload-form').closest('.form-card');
    const fileInfo = uploadCard.querySelector('.file-info');
    
    const sampleButtonsHTML = `
        <div class="sample-data-buttons" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <p><strong>Need sample data?</strong></p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="download-sample-csv" class="btn btn-info" style="font-size: 12px; padding: 8px 16px;">
                    Download Sample CSV
                </button>
                <button type="button" id="download-sample-json" class="btn btn-info" style="font-size: 12px; padding: 8px 16px;">
                    Download Sample JSON
                </button>
            </div>
        </div>
    `;
    
    fileInfo.insertAdjacentHTML('beforeend', sampleButtonsHTML);
    
    // Add event listeners for sample download buttons
    document.getElementById('download-sample-csv').addEventListener('click', () => {
        window.fileUploadHandler.downloadSampleCSV();
    });
    
    document.getElementById('download-sample-json').addEventListener('click', () => {
        window.fileUploadHandler.downloadSampleJSON();
    });
}

// Add drag-over styling
const dragOverStyle = `
    .form-card.drag-over {
        border: 2px dashed #3498db !important;
        background-color: rgba(52, 152, 219, 0.1) !important;
        transform: scale(1.02);
    }
`;

// Inject the style
const styleSheet = document.createElement('style');
styleSheet.textContent = dragOverStyle;
document.head.appendChild(styleSheet);

// Initialize file upload handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fileUploadHandler = new FileUploadHandler();
    addSampleDataButtons();
}); 