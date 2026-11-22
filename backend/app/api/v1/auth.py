"""
JalDrishti India — Authentication & User Profile API
Handles registration, login, role permissions, and live GPS location persistence.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import User, UserRole
from app.services.auth_service import hash_password, verify_password, create_session_token, decode_session_token

router = APIRouter(prefix="/auth", tags=["User & Admin Authentication"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "citizen"
    preferred_lat: Optional[float] = None
    preferred_lon: Optional[float] = None
    district_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class LocationUpdateRequest(BaseModel):
    lat: float
    lon: float
    district_code: Optional[str] = None

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_session_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

@router.post("/register", summary="Register Citizen, Volunteer or Admin")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
    
    role = UserRole.CITIZEN
    if req.role.lower() == "admin":
        role = UserRole.ADMIN
    elif req.role.lower() == "volunteer":
        role = UserRole.VOLUNTEER

    user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=role,
        preferred_lat=req.preferred_lat,
        preferred_lon=req.preferred_lon,
        district_code=req.district_code,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_session_token(user.id, user.email, user.role.value)
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "phone": user.phone,
            "preferred_lat": user.preferred_lat,
            "preferred_lon": user.preferred_lon,
        }
    }

@router.post("/login", summary="Login user or admin")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    token = create_session_token(user.id, user.email, user.role.value)
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "phone": user.phone,
            "preferred_lat": user.preferred_lat,
            "preferred_lon": user.preferred_lon,
        }
    }

@router.get("/me", summary="Get current logged in user details")
async def get_me(user: Optional[User] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "phone": user.phone,
        "preferred_lat": user.preferred_lat,
        "preferred_lon": user.preferred_lon,
    }

@router.patch("/location", summary="Update user's live tracked GPS position")
async def update_location(
    req: LocationUpdateRequest,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user:
        user.preferred_lat = req.lat
        user.preferred_lon = req.lon
        if req.district_code:
            user.district_code = req.district_code
        await db.commit()
    return {"status": "updated", "lat": req.lat, "lon": req.lon}
