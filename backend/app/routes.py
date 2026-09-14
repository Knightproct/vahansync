import json
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import get_db
from .dependencies import get_current_user, require_roles
from .models import AuditLog, ComplianceDocument, DocumentAsset, Expense, FuelTransaction, InventoryMovement, InventoryTransaction, MaintenancePlan, OperationalNotification, Organization, Part, PurchaseOrder, PurchaseOrderLine, StockLocation, TelematicsDevice, TelemetryReading, TollTransaction, User, Vehicle, VehicleComponent, Vendor, WorkOrder, utc_now
from .schemas import (
    ComponentCreate,
    ComponentRead,
    DocumentCreate,
    DocumentAssetRead,
    DocumentRead,
    DocumentUpdate,
    ExpenseCreate,
    ExpenseRead,
    ExpenseStatusUpdate,
    FinanceSummaryRead,
    FuelTransactionCreate,
    FuelTransactionRead,
    IdentityProviderMetadata,
    InventoryTransactionCreate,
    InventoryTransactionRead,
    InventoryMovementCreate,
    InventoryMovementRead,
    LoginRequest,
    MaintenancePlanCreate,
    MaintenancePlanRead,
    NotificationRead,
    NotificationStatusUpdate,
    PartCreate,
    PartRead,
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderStatusUpdate,
    StockLocationCreate,
    StockLocationRead,
    TollTransactionCreate,
    TollTransactionRead,
    TelematicsDeviceCreate,
    TelematicsDeviceRead,
    TelemetryReadingCreate,
    TelemetryReadingRead,
    Token,
    UserRead,
    VehicleCreate,
    VehicleRead,
    VendorCreate,
    VendorRead,
    WorkOrderCreate,
    WorkOrderRead,
    WorkOrderUpdate,
)
from .security import create_access_token, hash_password, verify_password
from .storage import resolve_object, save_upload

router = APIRouter(prefix="/api/v1")


@router.post("/auth/login", response_model=Token)
def login(payload: LoginRequest, database: Session = Depends(get_db)) -> Token:
    user = database.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    return Token(access_token=create_access_token(str(user.id), user.token_version))


@router.get("/auth/identity-provider", response_model=IdentityProviderMetadata)
def identity_provider_metadata() -> IdentityProviderMetadata:
    settings = get_settings()
    return IdentityProviderMetadata(
        enabled=settings.identity_provider_enabled,
        issuer=settings.identity_provider_issuer,
        client_id=settings.identity_provider_client_id,
    )


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> None:
    user.token_version += 1
    database.commit()


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


@router.patch("/work-orders/{work_order_id}", response_model=WorkOrderRead)
def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> WorkOrder:
    work_order = database.scalar(select(WorkOrder).where(WorkOrder.id == work_order_id, WorkOrder.organization_id == user.organization_id))
    if work_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(work_order, key, value)
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="work_order.updated",
        entity_type="work_order",
        entity_id=str(work_order.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps(changes),
    ))
    database.commit()
    database.refresh(work_order)
    return work_order


@router.get("/maintenance-plans", response_model=list[MaintenancePlanRead])
def list_maintenance_plans(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[MaintenancePlan]:
    return list(database.scalars(select(MaintenancePlan).where(MaintenancePlan.organization_id == user.organization_id).order_by(MaintenancePlan.id.desc())).all())


@router.post("/maintenance-plans", response_model=MaintenancePlanRead, status_code=status.HTTP_201_CREATED)
def create_maintenance_plan(
    payload: MaintenancePlanCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> MaintenancePlan:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    if payload.interval_km is None and payload.interval_days is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="An interval in kilometres or days is required")
    plan = MaintenancePlan(organization_id=user.organization_id, **payload.model_dump())
    database.add(plan)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="maintenance_plan.created",
        entity_type="maintenance_plan",
        entity_id=str(plan.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "name": plan.name}),
    ))
    database.commit()
    database.refresh(plan)
    return plan


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


@router.get("/inventory/transactions", response_model=list[InventoryTransactionRead])
def list_inventory_transactions(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[InventoryTransaction]:
    return list(database.scalars(select(InventoryTransaction).where(InventoryTransaction.organization_id == user.organization_id).order_by(InventoryTransaction.id.desc())).all())


@router.get("/stock-locations", response_model=list[StockLocationRead])
def list_stock_locations(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[StockLocation]:
    return list(database.scalars(select(StockLocation).where(StockLocation.organization_id == user.organization_id).order_by(StockLocation.name.asc())).all())


@router.post("/stock-locations", response_model=StockLocationRead, status_code=status.HTTP_201_CREATED)
def create_stock_location(
    payload: StockLocationCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> StockLocation:
    code = payload.code.strip().upper()
    existing = database.scalar(select(StockLocation).where(StockLocation.organization_id == user.organization_id, StockLocation.code == code))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A stock location with this code already exists")
    location = StockLocation(organization_id=user.organization_id, code=code, **{key: value for key, value in payload.model_dump().items() if key != "code"})
    database.add(location)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="stock_location.created",
        entity_type="stock_location",
        entity_id=str(location.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"code": location.code}),
    ))
    database.commit()
    database.refresh(location)
    return location


@router.get("/inventory/movements", response_model=list[InventoryMovementRead])
def list_inventory_movements(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[InventoryMovement]:
    return list(database.scalars(select(InventoryMovement).where(InventoryMovement.organization_id == user.organization_id).order_by(InventoryMovement.id.desc())).all())


@router.post("/inventory/movements", response_model=InventoryMovementRead, status_code=status.HTTP_201_CREATED)
def create_inventory_movement(
    payload: InventoryMovementCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> InventoryMovement:
    part = database.scalar(select(Part).where(Part.id == payload.part_id, Part.organization_id == user.organization_id))
    location = database.scalar(select(StockLocation).where(StockLocation.id == payload.location_id, StockLocation.organization_id == user.organization_id))
    if part is None or location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Part or stock location not found in this organization")
    delta = payload.quantity if payload.transaction_type == "receipt" else -payload.quantity
    if payload.transaction_type == "adjustment":
        delta = payload.quantity
    if part.quantity_on_hand + delta < 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock for this issue")
    part.quantity_on_hand += delta
    movement = InventoryMovement(organization_id=user.organization_id, created_by=user.id, **payload.model_dump())
    database.add(movement)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action=f"inventory_movement.{payload.transaction_type}",
        entity_type="inventory_movement",
        entity_id=str(movement.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"part_id": part.id, "location_id": location.id, "delta": delta}),
    ))
    database.commit()
    database.refresh(movement)
    return movement


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[ComplianceDocument]:
    documents = list(database.scalars(select(ComplianceDocument).where(ComplianceDocument.organization_id == user.organization_id).order_by(ComplianceDocument.expires_on.asc())).all())
    today = date.today().isoformat()
    for document in documents:
        if document.expires_on < today:
            document.status = "Expired"
    return documents


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


@router.patch("/documents/{document_id}", response_model=DocumentRead)
def update_document(
    document_id: int,
    payload: DocumentUpdate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> ComplianceDocument:
    document = database.scalar(select(ComplianceDocument).where(ComplianceDocument.id == document_id, ComplianceDocument.organization_id == user.organization_id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(document, key, value)
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="document.updated",
        entity_type="compliance_document",
        entity_id=str(document.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps(changes),
    ))
    database.commit()
    database.refresh(document)
    return document


@router.post("/documents/{document_id}/file", response_model=DocumentAssetRead, status_code=status.HTTP_201_CREATED)
def upload_document_file(
    document_id: int,
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> DocumentAsset:
    document = database.scalar(select(ComplianceDocument).where(ComplianceDocument.id == document_id, ComplianceDocument.organization_id == user.organization_id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A file name is required")
    try:
        object_key, size_bytes, checksum = save_upload(file)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(error)) from error
    asset = DocumentAsset(
        organization_id=user.organization_id,
        document_id=document.id,
        object_key=object_key,
        file_name=file.filename[:255],
        content_type=file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        checksum_sha256=checksum,
        uploaded_by=user.id,
    )
    document.file_key = object_key
    database.add(asset)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="document.file_uploaded",
        entity_type="compliance_document",
        entity_id=str(document.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"asset_id": asset.id, "object_key": object_key, "size_bytes": size_bytes}),
    ))
    database.commit()
    database.refresh(asset)
    return asset


@router.get("/documents/{document_id}/file")
def download_document_file(
    document_id: int,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> FileResponse:
    asset = database.scalar(
        select(DocumentAsset)
        .where(DocumentAsset.document_id == document_id, DocumentAsset.organization_id == user.organization_id)
        .order_by(DocumentAsset.id.desc())
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found")
    try:
        path = resolve_object(asset.object_key)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found")
    return FileResponse(path, media_type=asset.content_type, filename=asset.file_name)


def build_alerts(user: User, database: Session) -> list[dict[str, str | int]]:
    today = date.today()
    alerts: list[dict[str, str | int]] = []
    documents = database.scalars(select(ComplianceDocument).where(ComplianceDocument.organization_id == user.organization_id)).all()
    for document in documents:
        expires_on = date.fromisoformat(document.expires_on)
        days_until_expiry = (expires_on - today).days
        if days_until_expiry <= 30:
            alerts.append({
                "type": "document_expiry",
                "severity": "danger" if days_until_expiry < 0 else "warning",
                "entity_id": document.id,
                "title": f"{document.name} {'expired' if days_until_expiry < 0 else 'expires soon'}",
                "detail": f"{abs(days_until_expiry)} days {'overdue' if days_until_expiry < 0 else 'remaining'}",
            })
    parts = database.scalars(select(Part).where(Part.organization_id == user.organization_id)).all()
    for part in parts:
        if part.quantity_on_hand <= part.reorder_level:
            alerts.append({
                "type": "stock_reorder",
                "severity": "warning",
                "entity_id": part.id,
                "title": f"Reorder {part.name}",
                "detail": f"{part.quantity_on_hand} on hand, minimum {part.reorder_level}",
            })
    return alerts


@router.get("/alerts")
def list_alerts(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[dict[str, str | int]]:
    return build_alerts(user, database)


def sync_notifications(user: User, database: Session) -> None:
    for alert in build_alerts(user, database):
        if alert["type"] == "document_expiry":
            entity_type = "compliance_document"
        else:
            entity_type = "part"
        entity_id = str(alert["entity_id"])
        dedupe_key = f"{alert['type']}:{entity_id}:{alert['detail']}"
        existing = database.scalar(
            select(OperationalNotification).where(
                OperationalNotification.organization_id == user.organization_id,
                OperationalNotification.dedupe_key == dedupe_key,
            )
        )
        if existing is not None:
            if existing.status == "dismissed":
                continue
            existing.title = str(alert["title"])
            existing.detail = str(alert["detail"])
            existing.severity = str(alert["severity"])
            continue
        database.add(OperationalNotification(
            organization_id=user.organization_id,
            notification_type=str(alert["type"]),
            severity=str(alert["severity"]),
            title=str(alert["title"]),
            detail=str(alert["detail"]),
            entity_type=entity_type,
            entity_id=entity_id,
            dedupe_key=dedupe_key,
            status="unread",
        ))
    database.commit()


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[OperationalNotification]:
    sync_notifications(user, database)
    return list(database.scalars(
        select(OperationalNotification)
        .where(OperationalNotification.organization_id == user.organization_id)
        .order_by(OperationalNotification.id.desc())
    ).all())


@router.patch("/notifications/{notification_id}", response_model=NotificationRead)
def update_notification(
    notification_id: int,
    payload: NotificationStatusUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> OperationalNotification:
    notification = database.scalar(select(OperationalNotification).where(
        OperationalNotification.id == notification_id,
        OperationalNotification.organization_id == user.organization_id,
    ))
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.status = payload.status
    notification.resolved_at = utc_now() if payload.status == "dismissed" else None
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="notification.status_updated",
        entity_type="operational_notification",
        entity_id=str(notification.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"status": notification.status}),
    ))
    database.commit()
    database.refresh(notification)
    return notification


@router.get("/expenses", response_model=list[ExpenseRead])
def list_expenses(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[Expense]:
    return list(database.scalars(select(Expense).where(Expense.organization_id == user.organization_id).order_by(Expense.incurred_on.desc(), Expense.id.desc())).all())


@router.post("/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> Expense:
    if payload.vehicle_id is not None:
        vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
        if vehicle is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    expense = Expense(organization_id=user.organization_id, **payload.model_dump())
    if expense.status == "Approved":
        expense.approved_by = user.id
        expense.approved_at = utc_now()
    database.add(expense)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="expense.created",
        entity_type="expense",
        entity_id=str(expense.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"category": expense.category, "amount_paise": expense.amount_paise}),
    ))
    database.commit()
    database.refresh(expense)
    return expense


@router.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense_status(
    expense_id: int,
    payload: ExpenseStatusUpdate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> Expense:
    expense = database.scalar(select(Expense).where(
        Expense.id == expense_id,
        Expense.organization_id == user.organization_id,
    ))
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    expense.status = payload.status
    expense.approved_by = user.id if payload.status == "Approved" else None
    expense.approved_at = utc_now() if payload.status == "Approved" else None
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="expense.status_updated",
        entity_type="expense",
        entity_id=str(expense.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"status": expense.status}),
    ))
    database.commit()
    database.refresh(expense)
    return expense


@router.get("/finance/summary", response_model=list[FinanceSummaryRead])
def finance_summary(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[FinanceSummaryRead]:
    totals: dict[str, dict[str, int]] = {}
    expenses = database.scalars(select(Expense).where(Expense.organization_id == user.organization_id)).all()
    for expense in expenses:
        period = expense.incurred_on[:7]
        bucket = totals.setdefault(period, {"expense": 0, "fuel": 0, "toll": 0, "gst": 0})
        bucket["expense"] += expense.amount_paise
        bucket["gst"] += expense.gst_amount_paise
    fuels = database.scalars(select(FuelTransaction).where(FuelTransaction.organization_id == user.organization_id)).all()
    for fuel in fuels:
        totals.setdefault(fuel.incurred_on[:7], {"expense": 0, "fuel": 0, "toll": 0, "gst": 0})["fuel"] += fuel.total_amount_paise
    tolls = database.scalars(select(TollTransaction).where(TollTransaction.organization_id == user.organization_id)).all()
    for toll in tolls:
        totals.setdefault(toll.incurred_on[:7], {"expense": 0, "fuel": 0, "toll": 0, "gst": 0})["toll"] += toll.amount_paise
    return [
        FinanceSummaryRead(
            period=period,
            expense_amount_paise=values["expense"],
            fuel_amount_paise=values["fuel"],
            toll_amount_paise=values["toll"],
            total_amount_paise=values["expense"] + values["fuel"] + values["toll"],
            gst_amount_paise=values["gst"],
        )
        for period, values in sorted(totals.items(), reverse=True)
    ]


@router.get("/fuel-transactions", response_model=list[FuelTransactionRead])
def list_fuel_transactions(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[FuelTransaction]:
    return list(database.scalars(
        select(FuelTransaction)
        .where(FuelTransaction.organization_id == user.organization_id)
        .order_by(FuelTransaction.incurred_on.desc(), FuelTransaction.id.desc())
    ).all())


@router.post("/fuel-transactions", response_model=FuelTransactionRead, status_code=status.HTTP_201_CREATED)
def create_fuel_transaction(
    payload: FuelTransactionCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> FuelTransaction:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    total_amount_paise = (payload.litres_milli * payload.price_per_litre_paise) // 1000
    fuel = FuelTransaction(
        organization_id=user.organization_id,
        total_amount_paise=total_amount_paise,
        created_by=user.id,
        **payload.model_dump(),
    )
    database.add(fuel)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="fuel_transaction.created",
        entity_type="fuel_transaction",
        entity_id=str(fuel.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "total_amount_paise": total_amount_paise}),
    ))
    database.commit()
    database.refresh(fuel)
    return fuel


@router.get("/toll-transactions", response_model=list[TollTransactionRead])
def list_toll_transactions(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[TollTransaction]:
    return list(database.scalars(
        select(TollTransaction)
        .where(TollTransaction.organization_id == user.organization_id)
        .order_by(TollTransaction.incurred_on.desc(), TollTransaction.id.desc())
    ).all())


@router.post("/toll-transactions", response_model=TollTransactionRead, status_code=status.HTTP_201_CREATED)
def create_toll_transaction(
    payload: TollTransactionCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> TollTransaction:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    toll = TollTransaction(organization_id=user.organization_id, created_by=user.id, **payload.model_dump())
    database.add(toll)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="toll_transaction.created",
        entity_type="toll_transaction",
        entity_id=str(toll.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "amount_paise": toll.amount_paise}),
    ))
    database.commit()
    database.refresh(toll)
    return toll


@router.get("/telematics/devices", response_model=list[TelematicsDeviceRead])
def list_telematics_devices(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[TelematicsDevice]:
    return list(database.scalars(
        select(TelematicsDevice)
        .where(TelematicsDevice.organization_id == user.organization_id)
        .order_by(TelematicsDevice.id.desc())
    ).all())


@router.post("/telematics/devices", response_model=TelematicsDeviceRead, status_code=status.HTTP_201_CREATED)
def create_telematics_device(
    payload: TelematicsDeviceCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> TelematicsDevice:
    vehicle = database.scalar(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.organization_id == user.organization_id))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found in this organization")
    existing = database.scalar(select(TelematicsDevice).where(
        TelematicsDevice.organization_id == user.organization_id,
        TelematicsDevice.device_identifier == payload.device_identifier,
    ))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A telematics device with this identifier already exists")
    device = TelematicsDevice(organization_id=user.organization_id, **payload.model_dump())
    database.add(device)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="telematics_device.created",
        entity_type="telematics_device",
        entity_id=str(device.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vehicle_id": vehicle.id, "provider": device.provider}),
    ))
    database.commit()
    database.refresh(device)
    return device


@router.post("/telematics/devices/{device_id}/readings", response_model=TelemetryReadingRead, status_code=status.HTTP_201_CREATED)
def ingest_telemetry(
    device_id: int,
    payload: TelemetryReadingCreate,
    request: Request,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> TelemetryReading:
    device = database.scalar(select(TelematicsDevice).where(
        TelematicsDevice.id == device_id,
        TelematicsDevice.organization_id == user.organization_id,
        TelematicsDevice.active.is_(True),
    ))
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active telematics device not found")
    reading = TelemetryReading(
        organization_id=user.organization_id,
        vehicle_id=device.vehicle_id,
        device_id=device.id,
        **payload.model_dump(),
    )
    device.last_seen_at = payload.recorded_at
    database.add(reading)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="telemetry_reading.ingested",
        entity_type="telemetry_reading",
        entity_id=str(reading.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"device_id": device.id, "vehicle_id": device.vehicle_id}),
    ))
    database.commit()
    database.refresh(reading)
    return reading


@router.get("/telematics/vehicles/{vehicle_id}/latest", response_model=TelemetryReadingRead)
def latest_vehicle_telemetry(
    vehicle_id: int,
    user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
) -> TelemetryReading:
    reading = database.scalar(
        select(TelemetryReading)
        .where(TelemetryReading.vehicle_id == vehicle_id, TelemetryReading.organization_id == user.organization_id)
        .order_by(TelemetryReading.recorded_at.desc(), TelemetryReading.id.desc())
    )
    if reading is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No telemetry available for this vehicle")
    return reading


@router.get("/vendors", response_model=list[VendorRead])
def list_vendors(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[Vendor]:
    return list(database.scalars(select(Vendor).where(Vendor.organization_id == user.organization_id).order_by(Vendor.name.asc())).all())


@router.post("/vendors", response_model=VendorRead, status_code=status.HTTP_201_CREATED)
def create_vendor(
    payload: VendorCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> Vendor:
    vendor = Vendor(organization_id=user.organization_id, **payload.model_dump())
    database.add(vendor)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="vendor.created",
        entity_type="vendor",
        entity_id=str(vendor.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"name": vendor.name, "vendor_type": vendor.vendor_type}),
    ))
    database.commit()
    database.refresh(vendor)
    return vendor


@router.get("/purchase-orders", response_model=list[PurchaseOrderRead])
def list_purchase_orders(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[PurchaseOrder]:
    statement = select(PurchaseOrder).options(selectinload(PurchaseOrder.lines)).where(PurchaseOrder.organization_id == user.organization_id).order_by(PurchaseOrder.id.desc())
    return list(database.scalars(statement).unique().all())


@router.post("/purchase-orders", response_model=PurchaseOrderRead, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> PurchaseOrder:
    vendor = database.scalar(select(Vendor).where(Vendor.id == payload.vendor_id, Vendor.organization_id == user.organization_id, Vendor.active.is_(True)))
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active vendor not found in this organization")
    part_ids = [line.part_id for line in payload.lines]
    parts = list(database.scalars(select(Part).where(Part.id.in_(part_ids), Part.organization_id == user.organization_id)).all())
    parts_by_id = {part.id: part for part in parts}
    if len(parts_by_id) != len(set(part_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more parts were not found in this organization")
    total_paise = sum(line.quantity * line.unit_cost_paise for line in payload.lines)
    order = PurchaseOrder(
        organization_id=user.organization_id,
        vendor_id=vendor.id,
        order_number=f"PO-{date.today().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}",
        expected_on=payload.expected_on,
        notes=payload.notes,
        total_paise=total_paise,
        created_by=user.id,
    )
    order.lines = [
        PurchaseOrderLine(
            organization_id=user.organization_id,
            part_id=line.part_id,
            quantity=line.quantity,
            unit_cost_paise=line.unit_cost_paise,
            line_total_paise=line.quantity * line.unit_cost_paise,
        )
        for line in payload.lines
    ]
    database.add(order)
    database.flush()
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="purchase_order.created",
        entity_type="purchase_order",
        entity_id=str(order.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"vendor_id": vendor.id, "total_paise": total_paise}),
    ))
    database.commit()
    statement = select(PurchaseOrder).options(selectinload(PurchaseOrder.lines)).where(PurchaseOrder.id == order.id)
    return database.scalar(statement)


@router.patch("/purchase-orders/{purchase_order_id}", response_model=PurchaseOrderRead)
def update_purchase_order_status(
    purchase_order_id: int,
    payload: PurchaseOrderStatusUpdate,
    request: Request,
    user: User = Depends(require_roles("owner", "admin", "manager")),
    database: Session = Depends(get_db),
) -> PurchaseOrder:
    order = database.scalar(select(PurchaseOrder).where(PurchaseOrder.id == purchase_order_id, PurchaseOrder.organization_id == user.organization_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    order.status = payload.status
    database.add(AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="purchase_order.status_updated",
        entity_type="purchase_order",
        entity_id=str(order.id),
        request_id=request.headers.get("x-request-id", str(uuid4())),
        changes=json.dumps({"status": order.status}),
    ))
    database.commit()
    statement = select(PurchaseOrder).options(selectinload(PurchaseOrder.lines)).where(PurchaseOrder.id == order.id)
    return database.scalar(statement)


def seed_database() -> None:
    from .database import Base, engine

    settings = get_settings()
    if settings.environment.lower() == "development":
        Base.metadata.create_all(bind=engine)
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
