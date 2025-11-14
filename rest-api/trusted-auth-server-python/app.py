from flask import Flask, request, jsonify
import requests
import os
from dotenv import load_dotenv
import logging
from urllib3.exceptions import InsecureRequestWarning
import urllib3

# Disable SSL verification warnings
urllib3.disable_warnings(InsecureRequestWarning)

# Load environment variables
load_dotenv()

# Get environment variables
TS_SECRET_KEY = os.getenv('TS_SECRET_KEY')
TS_HOST = os.getenv('TS_HOST')

# Create Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api', methods=['GET'])
def hello_world():
    return "Hello World!"

@app.route('/api/token/<user>', methods=['GET', 'POST'])
def get_token(user):
    try:
        # Get groups from request body if present
        groups = request.json.get('groups') if request.is_json else None
        
        # Prepare request payload
        payload = {
            'secret_key': TS_SECRET_KEY,
            'username': user,
            'auto_create': True
        }
        
        # Add groups if provided
        if groups:
            payload['group_identifiers'] = groups

        # Make request to ThoughtSpot
        response = requests.post(
            f'{TS_HOST}/api/rest/2.0/auth/token/full',
            json=payload,
            headers={
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            verify=False  # Equivalent to rejectUnauthorized: false
        )
        
        response.raise_for_status()
        data = response.json()
        logger.debug(f"Token response: {data}")
        
        return data['token']

    except Exception as error:
        logger.error(f"Error getting token: {str(error)}")
        return "Error getting token", 500

if __name__ == '__main__':
    app.run(port=3000) 