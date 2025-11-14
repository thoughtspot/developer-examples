import os
from dotenv import load_dotenv
import requests

load_dotenv()

TS_HOST = os.getenv("TS_HOST")
TS_SECRET_KEY = os.getenv("TS_SECRET_KEY")

def get_token(username, groups=None):
    try:
        payload = {
            "username": username,
            "secret_key": TS_SECRET_KEY,
            "auto_create": True
        }
        if groups:
            payload["group_identifiers"] = groups
        response = requests.post(f"{TS_HOST}/api/rest/2.0/auth/token/full", json=payload, verify=False)
        return response.json()["token"]
    except Exception as e:
        print(f"Error getting token: {e}")
        return None
