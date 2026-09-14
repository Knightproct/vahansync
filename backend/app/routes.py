import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .dependencies import get_current_user
from .models import AuditLog, Organization, User, Vehicle
from .schemas import LoginRequest, Token, UserRead, VehicleCreate, VehicleRead
from .security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1")


@router.post("/auth/login", response_model=Token)
def login(payload: LoginRequest, database: Session = Depends(get_db)) -> Token:
    user = database.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/auth/me", response_model=UserRead)
def current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/vehicles", response_model=list[VehicleRead])
def list_vehicles(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[Vehicle]:
    return list(database.scalars(select(Vehicle).where(Vehicle.organization_id == user.organization_id).order_by(Vehicle.id.desc())).all())


@router.post("/vehicles", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> Vehicle:
    registration_number = payload.registration_number.strip().upper()
    existing = database.scalar(select(Vehicle).where(Vehicle.organization_id == user.organization_id, Vehicle.registration_number == registration_number))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A vehicle with this registration number already exists")

    vehicle = Vehicle(
        organization_id=user.organization_id,
        registration_number=registration_number,
        model=payload.model.strip(),
        vehicle_type=payload.vehicle_type.strip(),
        depot=payload.depot.strip(),
        status=payload.status,
        health=payload.health,
        odometer_km=payload.odometer_km,
        driver_name=payload.driver_name.strip() if payload.driver_name else None,
    )
    database.add(vehicle)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="vehicle.created",
        entity_type="vehicle",
        entity_id=str(vehicle.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"registration_number": registration_number}),
    ))
    database.commit()
    database.refresh(vehicle)
    return vehicle


def seed_database() -> None:
    from .database import Base, engine

    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    with next(get_db()) as database:
        if database.scalar(select(User).where(User.email == settings.seed_admin_email.lower())):
            return
        organization = database.scalar(select(Organization).where(Organization.slug == "rajput-logistics"))
        if organization is None:
            organization = Organization(name="Rajput Logistics", slug="rajput-logistics")
            database.add(organization)
            database.flush()
        database.add(User(
            organization_id=organization.id,
            email=settings.seed_admin_email.lower(),
            full_name="Arjun Mehta",
            password_hash=hash_password(settings.seed_admin_password),
            role="owner",
        ))
        if database.scalar(select(Vehicle).where(Vehicle.organization_id == organization.id)) is None:
            database.add_all([
                Vehicle(organization_id=organization.id, registration_number="MH 12 QX 4821", model="Ashok Leyland 3520", vehicle_type="Heavy truck", depot="Pune Central", status="On route", health=92, odometer_km=84920, driver_name="Amit Kulkarni"),
                Vehicle(organization_id=organization.id, registration_number="KA 03 MN 7712", model="Tata Prima 5530", vehicle_type="Heavy truck", depot="Bengaluru Yard", status="In workshop", health=68, odometer_km=142860),
            ])
        database.commit()
