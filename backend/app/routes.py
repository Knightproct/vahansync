import json
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import get_db
from .dependencies import get_current_user, require_roles
from .models import AuditLog, ComplianceDocument, Expense, InventoryMovement, InventoryTransaction, MaintenancePlan, Organization, Part, PurchaseOrder, PurchaseOrderLine, StockLocation, User, Vehicle, VehicleComponent, Vendor, WorkOrder
from .schemas import (
    ComponentCreate,
    ComponentRead,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    ExpenseCreate,
    ExpenseRead,
    InventoryTransactionCreate,
    InventoryTransactionRead,
    InventoryMovementCreate,
    InventoryMovementRead,
    LoginRequest,
    MaintenancePlanCreate,
    MaintenancePlanRead,
    PartCreate,
    PartRead,
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderStatusUpdate,
    StockLocationCreate,
    StockLocationRead,
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


@router.get("/alerts")
def list_alerts(user: User = Depends(get_current_user), database: Session = Depends(get_db)) -> list[dict[str, str | int]]:
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
