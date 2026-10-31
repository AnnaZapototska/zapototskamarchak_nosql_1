db = db.getSiblingDB("spotify");

// ==========================================
// TASK 1. Query Analysis and Indexing
// ==========================================

const query = {
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
};

// Analyze query BEFORE index
print("\n========== TASK 1: BEFORE INDEX ==========");

const explainBefore = db.tracks.find(query)
    .sort({ popularity: -1 })
    .explain("executionStats");

printjson(explainBefore);

// Create compound index
print("\n========== CREATING INDEX ==========");

db.tracks.createIndex({
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1
});

// Analyze query AFTER index
print("\n========== TASK 1: AFTER INDEX ==========");

const explainAfter = db.tracks.find(query)
    .sort({ popularity: -1 })
    .explain("executionStats");

printjson(explainAfter);


// ==========================================
// TASK 2. Compound Index for Work Tracks
// ==========================================

const workQuery = {
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness": { $lt: 0.1 },
    explicit: false
};

// Analyze query BEFORE index
print("\n========== TASK 2: BEFORE INDEX ==========");

const workExplainBefore = db.tracks.find(workQuery)
    .explain("executionStats");

printjson(workExplainBefore);

// Create compound index
print("\n========== CREATING INDEX ==========");

db.tracks.createIndex({
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
});

// Analyze query AFTER index
print("\n========== TASK 2: AFTER INDEX ==========");

const workExplainAfter = db.tracks.find(workQuery)
    .explain("executionStats");

printjson(workExplainAfter);

