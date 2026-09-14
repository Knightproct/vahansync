import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .dependencies import get_current_user
from .models import AuditLog, ComplianceDocument, InventoryTransaction, Organization, Part, User, Vehicle, VehicleComponent, WorkOrder
from .schemas import (
    ComponentCreate,
    ComponentRead,
    DocumentCreate,
    DocumentRead,
    InventoryTransactionCreate,
    LoginRequest,
    PartCreate,
    PartRead,
    Token,
    UserRead,
    VehicleCreate,
    VehicleRead,
    WorkOrderCreate,
    WorkOrderRead,
)
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


@router.get("/components", response_model=list[ComponentRead])
def list_components(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[VehicleComponent]:
    return list(database.scalars(select(VehicleComponent).where(VehicleComponent.organization_id == user.organization_id).order_by(VehicleComponent.id.desc())).all())


@router.post("/components", response_model=ComponentRead, status_code=status.HTTP_201_CREATED)
def create_component(
    payload: ComponentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> VehicleComponent:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    component = VehicleComponent(organization_id=user.organization_id, **payload.model_dump())
    database.add(component)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="component.created",
        entity_type="vehicle_component",
        entity_id=str(component.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "name": component.name}),
    ))
    database.commit()
    database.refresh(component)
    return component


@router.get("/work-orders", response_model=list[WorkOrderRead])
def list_work_orders(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[WorkOrder]:
    return list(database.scalars(select(WorkOrder).where(WorkOrder.organization_id == user.organization_id).order_by(WorkOrder.id.desc())).all())


@router.post("/work-orders", response_model=WorkOrderRead, status_code=status.HTTP_201_CREATED)
def create_work_order(
    payload: WorkOrderCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> WorkOrder:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    work_order = WorkOrder(organization_id=user.organization_id, **payload.model_dump())
    database.add(work_order)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="work_order.created",
        entity_type="work_order",
        entity_id=str(work_order.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "title": work_order.title}),
    ))
    database.commit()
    database.refresh(work_order)
    return work_order


@router.get("/parts", response_model=list[PartRead])
def list_parts(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[Part]:
    return list(database.scalars(select(Part).where(Part.organization_id == user.organization_id).order_by(Part.id.desc())).all())


@router.post("/parts", response_model=PartRead, status_code=status.HTTP_201_CREATED)
def create_part(
    payload: PartCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> Part:
    existing = database.scalar(select(Part).where(Part.organization_id == user.organization_id, Part.sku == payload.sku.strip().upper()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A part with this SKU already exists")
    part = Part(organization_id=user.organization_id, sku=payload.sku.strip().upper(), **{key: value for key, value in payload.model_dump().items() if key != "sku"})
    database.add(part)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="part.created",
        entity_type="part",
        entity_id=str(part.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"sku": part.sku, "quantity_on_hand": part.quantity_on_hand}),
    ))
    database.commit()
    database.refresh(part)
    return part


@router.post("/inventory/transactions", response_model=PartRead)
def create_inventory_transaction(
    payload: InventoryTransactionCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> Part:
    part = database.scalar(select(Part).where(Part.id == payload.part_id, Part.organization_id == user.organization_id))
    if part is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part not found in this organization")
    delta = payload.quantity if payload.transaction_type == "receipt" else -payload.quantity
    if payload.transaction_type == "adjustment":
        delta = payload.quantity
    if part.quantity_on_hand + delta < 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock for this issue")
    part.quantity_on_hand += delta
    database.add(InventoryTransaction(organization_id=user.organization_id, created_by=user.id, **payload.model_dump()))
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action=f"inventory.{payload.transaction_type}",
        entity_type="part",
        entity_id=str(part.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"delta": delta, "quantity_on_hand": part.quantity_on_hand}),
    ))
    database.commit()
    database.refresh(part)
    return part


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[ComplianceDocument]:
    return list(database.scalars(select(ComplianceDocument).where(ComplianceDocument.organization_id == user.organization_id).order_by(ComplianceDocument.expires_on.asc())).all())


@router.post("/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> ComplianceDocument:
    if payload.vehicle_id is not None:
        vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
        if vehicle is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    document = ComplianceDocument(organization_id=user.organization_id, **payload.model_dump())
    database.add(document)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="document.created",
        entity_type="compliance_document",
        entity_id=str(document.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"name": document.name, "expires_on": document.expires_on}),
    ))
    database.commit()
    database.refresh(document)
    return document


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
        if database.scalar(select(Part).where(Part.organization_id == organization.id)) is None:
            database.add_all([
                Part(organization_id=organization.id, sku="BP-AL-3520-F", name="Brake pad set · Front axle", category="Brakes", quantity_on_hand=8, reorder_level=5, unit_cost_paise=485000, supplier="TVS Autoparts"),
                Part(organization_id=organization.id, sku="OIL-15W40-20L", name="15W40 Diesel engine oil", category="Lubricants", quantity_on_hand=12, reorder_level=10, unit_cost_paise=326000, supplier="Castrol India"),
            ])
        database.commit()
