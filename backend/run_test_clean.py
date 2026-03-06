import sys
import traceback

print("Trying to import routers...")
try:
    from routers import inquiry
    print("Inquiry OK")
    from routers import payment
    print("Payment OK")
    from routers import partner
    print("Partner OK")
    from routers import settings
    print("Settings OK")
    from routers import estimate
    print("Estimate OK")
    
    import main
    print("Main OK")
except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()

import time
time.sleep(2)
