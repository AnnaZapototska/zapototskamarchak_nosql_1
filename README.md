# Spotify Tracks — MongoDB Project

## 1. Project Overview

This project uses MongoDB to store and analyze Spotify track data.

The main goals are:
- Load data from a CSV file into MongoDB.
- Transform flat data into nested documents.
- Write queries and aggregation pipelines.
- Create indexes and compare query performance.

## 2. Technologies

- Python 3.12
- MongoDB Atlas
- MongoDB Shell (`mongosh`)
- PyMongo
- Pandas
- JavaScript

## 3. Project Structure

```text
project/
├── scripts/
│   ├── 01_load_data.py
│   └── 02_transform.js
├── queries/
│   └── part2_queries.js
├── part3_indexes.js
├── dataset.csv
├── requirements.txt
└── .env
```

## 4. Environment Setup

1. Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root:

```text
MONGO_URI=your_mongodb_connection_string
```

Replace the example value with your MongoDB Atlas connection string.

4. Load the environment variables in the terminal:

```bash
set -a
source .env
set +a
```

5. Run the scripts in this order:

Load the CSV data:

```bash
python scripts/01_load_data.py
```

Transform the documents:

```bash
mongosh "$MONGO_URI" --file scripts/02_transform.js
```

Run Part 2 queries:

```bash
mongosh "$MONGO_URI" --file queries/part2_queries.js
```

Run Part 3 index tests:

```bash
mongosh "$MONGO_URI" --file part3_indexes.js
```

## 5. Data Schema

The `tracks` collection stores one document for each music track.

The main fields are:

- `track_id`, `track_name`, `album_name` — track information.
- `popularity` — track popularity score.
- `duration_ms` — duration in milliseconds.
- `duration_sec` — calculated duration in seconds.
- `explicit` — indicates explicit content.
- `track_genre` — music genre.
- `artists` — array of artist names.
- `audio_features` — nested object with audio characteristics.
- `popularity_tier` — popularity category.

Example document:

```json
{
  "_id": "ObjectId",
  "track_id": "2xGjteMU3E1tkEPVFBO08U",
  "album_name": "This Is Me",
  "track_name": "This Is Me",
  "popularity": 66,
  "duration_ms": 234706,
  "explicit": false,
  "track_genre": "show-tunes",
  "artists": [
    "Keala Settle",
    "The Greatest Showman Ensemble"
  ],
  "audio_features": {
    "danceability": 0.284,
    "energy": 0.704,
    "loudness": -7.276,
    "speechiness": 0.186,
    "acousticness": 0.00583,
    "instrumentalness": 0.000115,
    "liveness": 0.0424,
    "valence": 0.1,
    "tempo": 191.702,
    "key": 2,
    "mode": 1,
    "time_signature": 4
  },
  "duration_sec": 234.7,
  "popularity_tier": "medium"
}
```

## 6. Part 1 — Data Modeling

### Why are audio features stored in a nested object?

Audio features are stored in the `audio_features` object because they describe the same thing: the sound characteristics of a track.

This structure keeps related data together and makes the document easier to read and understand. It also allows us to use dot notation in queries, for example:

```javascript
{ "audio_features.danceability": { $gt: 0.7 } }
```

Embedding is useful when related data is usually accessed together and belongs to the same document.

However, it can become problematic if the nested data is very large, changes independently, or needs to be shared between many documents.

### Why are artists stored as an array?

The `artists` field is an array because one track can have multiple artists.

For example, the track "This Is Me" has two artists. An array allows us to store both names in one document instead of keeping them in a single text string.

It also makes queries easier. We can find tracks by a specific artist:

```javascript
{ artists: "Keala Settle" }
```

MongoDB can search array elements directly. We can also use `$unwind` to create separate records for each artist in aggregation pipelines.

## 7. Part 2 — Queries and Aggregations

Four queries were created:

1. **Party tracks:** finds tracks with high danceability and energy, and a duration between 180 and 300 seconds.
2. **Popular artists:** finds artists with at least three tracks and minimum popularity of 60. Results are sorted by average popularity.
3. **Unusual tempo:** calculates average tempo and population standard deviation for each genre. It finds tracks with tempo higher than the average plus two standard deviations.
4. **Work tracks:** finds tracks with low loudness, low speechiness, high instrumentalness, and no explicit content.

The party tracks query returned **7,311 tracks**.

## 8. Part 3 — Indexes and Performance

### Task 1: Query by genre and danceability

The query searches for pop tracks with danceability greater than or equal to 0.7 and sorts them by popularity.

Index created:

```javascript
db.tracks.createIndex({
  track_genre: 1,
  popularity: -1,
  "audio_features.danceability": 1
});
```

**Results before the index:**

- Execution time: 77 ms
- Documents examined: 113,999
- Keys examined: 0
- Execution plan: `COLLSCAN` and `SORT`

**Results after the index:**

- Execution time: 2 ms
- Documents examined: 354
- Keys examined: 412
- Execution plan: `IXSCAN` and `FETCH`

The index reduced the number of documents examined and improved query performance. The separate `SORT` stage was no longer needed because the index also supports sorting by popularity.

### Task 2: Query for work tracks

The query searches for tracks with high instrumentalness, low speechiness, and `explicit: false`.

Index created:

```javascript
db.tracks.createIndex({
  explicit: 1,
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
});
```

**Results before the index:**

- Execution time: 147 ms
- Documents examined: 113,999
- Keys examined: 0
- Execution plan: `COLLSCAN`

**Results after the index:**

- Execution time: 43 ms
- Documents examined: 16,141
- Keys examined: 16,602
- Execution plan: `IXSCAN` and `FETCH`

The index helped MongoDB find matching documents without scanning the entire collection.

Execution times can change between runs, but the execution plan and number of examined documents show how the index helps.

### Covered Query

A covered query can be answered using only index data, without reading full documents.

The original query is not covered because it returns complete documents by default.

A projection can return only fields included in the existing index:

```javascript
db.tracks.find(
  {
    track_genre: "pop",
    popularity: { $gte: 70 }
  },
  {
    _id: 0,
    track_genre: 1,
    popularity: 1
  }
);
```

This query can be covered by the Task 1 index because all requested fields are included in it. The query can be checked with `explain("executionStats")`. A covered query should have no `FETCH` stage and should examine zero documents.

## 9. Conclusion

This project helped me practice MongoDB data modeling, document transformation, queries, aggregation pipelines, and indexing.

I learned how nested objects and arrays make data easier to organize and query. I also compared query performance before and after creating indexes using `explain("executionStats")`.