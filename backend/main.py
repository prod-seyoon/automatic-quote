from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="3D Print CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import inquiry, estimate, payment, partner, settings
from database import init_db

# Initialize database
init_db()

app.include_router(inquiry.router, prefix="/api/v1")
app.include_router(estimate.router, prefix="/api/v1")
app.include_router(payment.router, prefix="/api/v1")
app.include_router(partner.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to 3D Print CRM API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
