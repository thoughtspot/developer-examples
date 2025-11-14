#!/usr/bin/env python3
"""
Example usage of the trusted-auth-server integration.

This script demonstrates how to use the TrustedAuthServer class
to interact with the trusted authentication server.
"""

import os
import sys
from dotenv import load_dotenv

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from trusted_auth_server import TrustedAuthServer, create_trusted_auth_client

def main():
    """Main example function."""
    print("Trusted Auth Server Integration Example")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Method 1: Create client using factory function
    print("\n1. Creating client using factory function...")
    client1 = create_trusted_auth_client()
    
    # Method 2: Create client directly
    print("\n2. Creating client directly...")
    server_url = os.getenv('TRUSTED_AUTH_SERVER_URL', 'http://localhost:3000')
    client2 = TrustedAuthServer(server_url)
    
    # Get server information
    print("\n3. Getting server information...")
    info = client1.get_server_info()
    for key, value in info.items():
        print(f"   {key}: {value}")
    
    # Test connection
    print("\n4. Testing connection...")
    if client1.test_connection():
        print("   ✓ Connection successful!")
        
        # Test token generation
        print("\n5. Testing token generation...")
        test_users = [
            ("admin_user", ["admin", "users"]),
            ("regular_user", ["users"]),
            ("guest_user", [])
        ]
        
        for username, groups in test_users:
            print(f"   Testing {username} with groups: {groups}")
            token = client1.get_token(username, groups)
            if token:
                print(f"     ✓ Token generated: {token[:30]}...")
            else:
                print(f"     ✗ Token generation failed")
                
    else:
        print("   ✗ Connection failed!")
        print("   Make sure the trusted auth server is running at:", server_url)
        print("   You can start it by running:")
        print("   cd rest-api/trusted-auth-server-python")
        print("   python app.py")
    
    print("\n" + "=" * 50)
    print("Example completed!")

if __name__ == "__main__":
    main()
