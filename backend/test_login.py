"""
Quick test for the /auth/login-json endpoint.
Run from: backend/
"""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print("=== Testing POST /auth/login-json ===")
status, body = post("/auth/login-json", {"emp_id": "CFO001", "password": "Perfmetric@123"})
print(f"Status: {status}")
if isinstance(body, dict):
    tok = body.get("access_token", "")
    print(f"Token parts (3 = JWT): {len(tok.split('.'))}")
    print(f"Token preview: {tok[:60]}...")
    u = body.get("user", {})
    print(f"User: {u.get('id')} | {u.get('role')} | {u.get('name')}")
else:
    print("Response body:", body)
