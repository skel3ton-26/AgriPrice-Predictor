from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import predict, commodities, historical

app = FastAPI(
    title="AgriPrice Predictor API",
    description="AI/ML-based price prediction for agri-horticultural commodities",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(commodities.router)
app.include_router(historical.router)


@app.get("/")
def root():
    return {"message": "AgriPrice Predictor API", "docs": "/docs"}
