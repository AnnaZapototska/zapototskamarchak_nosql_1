import os
import ast
import certifi
import pandas as pd
from pymongo import MongoClient
from tqdm import tqdm
from dotenv import load_dotenv


load_dotenv()


MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "spotify"
CSV_PATH = "dataset.csv"
BATCH_SIZE = 1000


client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where()
)
db = client[DB_NAME]


db["tracks_raw"].drop()


df = pd.read_csv(CSV_PATH)
print(f"Downloading {len(df)} tracks...")


# Change to DataFrame types to match MongoDB types
df["explicit"] = df["explicit"].astype(bool)


# numbers without floating point
int_cols = ["popularity", "duration_ms", "key", "mode", "time_signature"]
for col in int_cols:
    df[col] = df[col].astype(int)


# numbers with floating point
float_cols = [
    "danceability", "energy", "loudness", "speechiness",
    "acousticness", "instrumentalness", "liveness",
    "valence", "tempo"
]
for col in float_cols:
    df[col] = df[col].astype(float)


# remove rows with missing values in "artists" or "track_name" columns
query = df["artists"].isna() | df["track_name"].isna()
records = df[~query].to_dict("records")


# load data into MongoDB in batches
for i in tqdm(range(0, len(records), BATCH_SIZE)):
    db["tracks_raw"].insert_many(records[i : i + BATCH_SIZE])


print(f"Downloading {db['tracks_raw'].count_documents({})} tracks...")
print(f"Example track:")
print(db["tracks_raw"].find_one())