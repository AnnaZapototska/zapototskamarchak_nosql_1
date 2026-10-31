db = db.getSiblingDB("spotify");

// ====================================================== 
// Request 1: Find all tracks that are suitable for a party. 
// A track is considered suitable for a party if it has a danceability score greater than 0.7, 
// an energy score greater than 0.7, and a duration between 3 and 5 minutes (inclusive).
// ====================================================== 

const partyTracks = db.tracks.find({
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
}).toArray();

print("Number of party tracks: " + partyTracks.length);

printjson(partyTracks.slice(0, 5));

// ======================================================
// Request 2: Find the top 20 artists with the highest average popularity among their tracks.
// An artist must have at least 3 tracks in the dataset to be considered.
// ======================================================

const popularArtists = db.tracks.aggregate([
    { $unwind: "$artists" },
    { $group: {
            _id: "$artists",
            track_count: { $sum: 1 },
            min_popularity: { $min: "$popularity" },
            avg_popularity: { $avg: "$popularity" }
        } },
    { $match: {
            track_count: { $gte: 3 },
            min_popularity: { $gte: 60 }
        } },
    { $sort: { avg_popularity: -1 } },
    { $limit: 20 },
    { $project: {
            _id: 0,
            artist: "$_id",
            track_count: 1,
            min_popularity: 1,
            avg_popularity: { $round: ["$avg_popularity", 1] }
        }
    }
]).toArray();

printjson(popularArtists);


// ======================================================
// Request 3: Find tracks that are atypical for their genre based on tempo.
// ======================================================

const atypicalTracks = db.tracks.aggregate([
    {
        $group: {
            _id: "$track_genre",
            avg_tempo: { $avg: "$audio_features.tempo" },
            std_tempo: { $stdDevPop: "$audio_features.tempo" },
            tracks: { $push: "$$ROOT" }
        }
    },

    {
        $project: {
            avg_tempo: 1,
            genre: "$_id",
            tracks: 1,
            outlier_threshold: {
                $add: [
                    "$avg_tempo",
                    { $multiply: [2, "$std_tempo"] }
                ]
            }
        }
    },

    {
        $project: {
            avg_tempo: 1,
            genre: 1,
            outlier_threshold: 1,
            outlier_tracks: {
                $filter: {
                    input: "$tracks",
                    as: "track",
                    cond: {
                        $gt: [
                            "$$track.audio_features.tempo",
                            "$outlier_threshold"
                        ]
                    }
                }
            }
        }
    },

    {
        $match: {
            "outlier_tracks.0": { $exists: true }
        }
    }
]).toArray();

print("Atypical tracks: " + atypicalTracks.length);
printjson(atypicalTracks);

const workTracks = db.tracks.find({
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
}).toArray();

print("Number of work tracks: " + workTracks.length);
printjson(workTracks.slice(0, 5));