from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import transactions, upload, categories, analytics, users, updates

app = FastAPI(title="Budget Tracker API")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(updates.router, prefix="/api/updates", tags=["updates"])

@app.get("/")
async def root():
    return {"message": "Budget Tracker API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
