from flask import Flask
from pymongo import MongoClient
import os

app = Flask(__name__)

# Connexion à MongoDB
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)

# Sélection de la base de données
db = client["ma_base"]

@app.route('/')
def hello():
    return "Hello World ! Mon application Flask fonctionne."

@app.route('/test-db')
def test_db():
    try:
        client.admin.command('ping')
        return "Connexion à MongoDB réussie !"
    except Exception as e:
        return f"Erreur de connexion à MongoDB : {e}"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)