import sys
sys.path.append('backend')
from app.main import app

print("REGISTERED ROUTES:")
for route in app.routes:
    if hasattr(route, "methods"):
        print(f"Path: {route.path}, Methods: {route.methods}")
    else:
        print(f"Path: {route.path}")
