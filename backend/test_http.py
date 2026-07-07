import urllib.request
import urllib.error

url = "http://127.0.0.1:8000/auth/audit"
req = urllib.request.Request(url)
# Let's send a fake X-Session-Id to see if we get 401 or 404 or what
req.add_header("X-Session-Id", "some-invalid-session-id")

try:
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode())
except Exception as e:
    print("ERROR:", e)
