# DB CONNECTION FILE THIS IS A NEW FILE BUT YOU CAN CHANGE I JUST DID AS MY WISH


import os
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('uri_mongodb')
client = MongoClient(url, server_api=ServerApi('1'))
db = client['mydatabase']

try:
    client.admin.command('ping')
    print(" Connected to MongoDB!")
except Exception as e:
    print(e)