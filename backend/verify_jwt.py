"""Verify the full JWT flow end-to-end: correct creds, wrong creds, token validity."""
import sys, os, json
sys.path.insert(0, os.getcwd())
import urllib.request, urllib.error

BASE = "http://127.0.0.1:8000"

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                  headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get_auth(path, token):
    req = urllib.request.Request(BASE + path,
                                  headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print("=" * 55)
print("TEST 1: Correct credentials (CFO001 / Perfmetric@123)")
status, body = post("/auth/login-json", {"emp_id": "CFO001", "password": "Perfmetric@123"})
if status == 200:
    tok = body["access_token"]
    parts = tok.split(".")
    print(f"  ✅ Status: {status}")
    print(f"  ✅ JWT parts: {len(parts)} (3 = real JWT)")
    print(f"  ✅ Token: {tok[:55]}...")
    u = body["user"]
    print(f"  ✅ User: {u['id']} | {u['role']} | {u['name']}")

    print()
    print("TEST 2: Token works on /auth/me")
    s2, b2 = get_auth("/auth/me", tok)
    print(f"  {'✅' if s2==200 else '❌'} Status: {s2}, id={b2.get('id')}, role={b2.get('role')}")
else:
    print(f"  ❌ Got {status}: {body}")

print()
print("TEST 3: Wrong password → 401")
s3, b3 = post("/auth/login-json", {"emp_id": "CFO001", "password": "wrongpass"})
print(f"  {'✅' if s3==401 else '❌'} Status: {s3}, detail={b3.get('detail')}")

print()
print("TEST 4: Unknown user → 401")
s4, b4 = post("/auth/login-json", {"emp_id": "NOBODY", "password": "Perfmetric@123"})
print(f"  {'✅' if s4==401 else '❌'} Status: {s4}, detail={b4.get('detail')}")
print("=" * 55)
