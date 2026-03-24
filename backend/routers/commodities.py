from fastapi import APIRouter

router = APIRouter(prefix="/api/commodities", tags=["commodities"])

COMMODITIES = [
    {"name": "Onion",  "unit": "INR/quintal", "category": "Vegetable"},
    {"name": "Tomato", "unit": "INR/quintal", "category": "Vegetable"},
    {"name": "Potato", "unit": "INR/quintal", "category": "Vegetable"},
    {"name": "Wheat",  "unit": "INR/quintal", "category": "Grain"},
    {"name": "Rice",   "unit": "INR/quintal", "category": "Grain"},
    {"name": "Maize",  "unit": "INR/quintal", "category": "Grain"},
]

MARKETS = [
    "Pune", "Nashik", "Delhi", "Bangalore",
    "Hyderabad", "Chennai", "Kolkata", "Bhopal",
]


@router.get("/")
def list_commodities():
    return {"commodities": COMMODITIES}


@router.get("/markets")
def list_markets():
    return {"markets": MARKETS}
