# Social Media Influence Graph

A web-based Knowledge Graph application that models and visualizes relationships between social media users, their content, interactions, and influence metrics. Users can explore how influence spreads, identify key influencers, and analyze engagement patterns across a network.

## Features

### Part A: Core Implementation

#### Web Interface (3 Marks)
- **Engaging Front-End**: Built with HTML, CSS, and JavaScript
- **Input Fields**: User handles, content posts, interactions, and influence metrics
- **File Upload**: Support for CSV and JSON files
- **Real-time Data Entry**: Add users and link them based on interactions

#### Graph Query and Visualization (3 Marks)
- **Flask Backend**: Handles user input, query processing, and response serving
- **NetworkX Integration**: Creates directed influence graphs with weighted edges
- **D3.js Visualization**: Interactive graph rendering with automatic updates
- **Query Features**: Influence chains, top influencers, mutual engagement networks

#### Integration (2 Marks)
- **Full Stack Integration**: Seamless front-end and back-end communication
- **Dual Input Methods**: Real-time entry and bulk uploads

### Part B: Enhancement Plan (2 Marks)
- **Performance Improvements**: Parallel processing, caching, PageRank algorithms
- **Advanced Visualization**: Heatmaps, filters, timeline evolution

## Project Structure

```
social-media-influence-graph/
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   ├── js/
│   │   ├── main.js       # Main JavaScript functionality
│   │   ├── graph.js      # D3.js graph visualization
│   │   └── upload.js     # File upload handling
│   └── data/
│       ├── sample.csv    # Sample CSV data
│       └── sample.json   # Sample JSON data
├── templates/
│   ├── index.html        # Main interface
│   ├── graph.html        # Graph visualization page
│   └── analytics.html    # Analytics dashboard
├── utils/
│   ├── graph_utils.py    # Graph processing utilities
│   ├── data_processor.py # Data processing functions
│   └── influence_calc.py # Influence calculation algorithms
└── tests/
    ├── test_app.py       # Backend tests
    └── test_data.py      # Data processing tests
```

## Installation

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run the application: `python app.py`
4. Open browser to `http://localhost:5000`

## Usage

1. **Add Users**: Enter user handles and their metrics
2. **Define Relationships**: Create connections between users
3. **Upload Data**: Bulk import via CSV/JSON files
4. **Visualize**: View interactive influence graphs
5. **Analyze**: Query influence chains and identify top influencers

## Technologies Used

- **Backend**: Flask, NetworkX, Python
- **Frontend**: HTML5, CSS3, JavaScript, D3.js
- **Data Processing**: Pandas, NumPy
- **Visualization**: D3.js, Chart.js
- **Testing**: pytest, unittest 