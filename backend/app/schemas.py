from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class IdentityProviderMetadata(BaseModel):
    enabled: bool
    issuer: str | None
    client_id: str | None
    local_login_available: bool = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    organization_id: int


class VehicleCreate(BaseModel):
    registration_number: str = Field(min_length=3, max_length=32)
    model: str = Field(min_length=2, max_length=160)
    vehicle_type: str = Field(min_length=2, max_length=80)
    depot: str = Field(min_length=2, max_length=120)
    status: str = "Idle / parked"
    health: int = Field(default=100, ge=0, le=100)
    odometer_km: int = Field(default=0, ge=0)
    driver_name: str | None = None


class VehicleRead(VehicleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class ComponentCreate(BaseModel):
    vehicle_id: int
    name: str = Field(min_length=2, max_length=160)
    component_type: str = Field(min_length=2, max_length=80)
    serial_number: str | None = None
    installed_at_km: int = Field(default=0, ge=0)
    next_service_km: int | None = Field(default=None, ge=0)
    status: str = "Healthy"


class ComponentRead(ComponentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class WorkOrderCreate(BaseModel):
    vehicle_id: int
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    priority: str = "Medium"
    status: str = "Open"
    due_date: str | None = None
    assigned_to: str | None = None


class WorkOrderRead(WorkOrderCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class WorkOrderUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None
    assigned_to: str | None = None
    description: str | None = None


class MaintenancePlanCreate(BaseModel):
    vehicle_id: int
    name: str = Field(min_length=2, max_length=200)
    interval_km: int | None = Field(default=None, gt=0)
    interval_days: int | None = Field(default=None, gt=0)
    next_due_km: int | None = Field(default=None, ge=0)
    next_due_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    active: bool = True


class MaintenancePlanRead(MaintenancePlanCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class PartCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=200)
    category: str = Field(min_length=2, max_length=80)
    quantity_on_hand: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=0, ge=0)
    unit_cost_paise: int = Field(default=0, ge=0)
    supplier: str | None = None


class PartRead(PartCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class InventoryTransactionCreate(BaseModel):
    part_id: int
    transaction_type: str = Field(pattern="^(receipt|issue|adjustment)$")
    quantity: int = Field(gt=0)
    reference: str | None = None


class InventoryTransactionRead(InventoryTransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_by: int
    created_at: datetime


class StockLocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=2, max_length=40)
    address: str | None = None
    active: bool = True


class StockLocationRead(StockLocationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class InventoryMovementCreate(InventoryTransactionCreate):
    location_id: int


class InventoryMovementRead(InventoryMovementCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_by: int
    created_at: datetime


class DocumentCreate(BaseModel):
    vehicle_id: int | None = None
    name: str = Field(min_length=2, max_length=200)
    document_type: str = Field(min_length=2, max_length=80)
    issued_by: str | None = None
    expires_on: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    file_key: str | None = None
    status: str = "Valid"


class DocumentRead(DocumentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class DocumentAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    document_id: int
    object_key: str
    file_name: str
    content_type: str
    size_bytes: int
    checksum_sha256: str
    uploaded_by: int
    created_at: datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    notification_type: str
    severity: str
    title: str
    detail: str
    entity_type: str
    entity_id: str
    dedupe_key: str
    status: str
    created_at: datetime
    resolved_at: datetime | None


class NotificationStatusUpdate(BaseModel):
    status: str = Field(pattern="^(unread|read|dismissed)$")


class ExpenseCreate(BaseModel):
    vehicle_id: int | None = None
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=2, max_length=240)
    amount_paise: int = Field(gt=0)
    gst_amount_paise: int = Field(default=0, ge=0)
    incurred_on: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    vendor: str | None = None
    gstin: str | None = Field(default=None, max_length=20)
    cost_center: str | None = Field(default=None, max_length=120)
    payment_mode: str | None = Field(default=None, max_length=40)
    status: str = Field(default="Pending", pattern="^(Pending|Approved|Rejected)$")


class ExpenseRead(ExpenseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    approved_by: int | None
    approved_at: datetime | None
    created_at: datetime


class ExpenseStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Pending|Approved|Rejected)$")


class FinanceSummaryRead(BaseModel):
    period: str
    expense_amount_paise: int
    fuel_amount_paise: int
    toll_amount_paise: int
    total_amount_paise: int
    gst_amount_paise: int


class FuelTransactionCreate(BaseModel):
    vehicle_id: int
    station: str | None = None
    fuel_type: str = Field(min_length=2, max_length=40)
    litres_milli: int = Field(gt=0)
    price_per_litre_paise: int = Field(gt=0)
    odometer_km: int = Field(ge=0)
    incurred_on: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    reference: str | None = None


class FuelTransactionRead(FuelTransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    total_amount_paise: int
    created_by: int
    created_at: datetime


class TollTransactionCreate(BaseModel):
    vehicle_id: int
    toll_operator: str | None = None
    plaza: str = Field(min_length=2, max_length=160)
    amount_paise: int = Field(gt=0)
    incurred_on: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    tag_reference: str | None = None
    status: str = Field(default="Approved", pattern="^(Pending|Approved|Rejected)$")


class TollTransactionRead(TollTransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_by: int
    created_at: datetime


class TelematicsDeviceCreate(BaseModel):
    vehicle_id: int
    provider: str = Field(min_length=2, max_length=80)
    device_identifier: str = Field(min_length=2, max_length=160)
    active: bool = True


class TelematicsDeviceRead(TelematicsDeviceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    last_seen_at: datetime | None
    created_at: datetime


class TelemetryReadingCreate(BaseModel):
    recorded_at: datetime
    odometer_km: int | None = Field(default=None, ge=0)
    latitude_e6: int | None = Field(default=None, ge=-90_000_000, le=90_000_000)
    longitude_e6: int | None = Field(default=None, ge=-180_000_000, le=180_000_000)
    speed_kph: int | None = Field(default=None, ge=0, le=300)
    fuel_level_percent: int | None = Field(default=None, ge=0, le=100)
    engine_on: bool | None = None


class TelemetryReadingRead(TelemetryReadingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    vehicle_id: int
    device_id: int
    created_at: datetime


class VendorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    vendor_type: str = Field(min_length=2, max_length=80)
    gstin: str | None = Field(default=None, max_length=20)
    contact_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    active: bool = True


class VendorRead(VendorCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


class PurchaseOrderLineCreate(BaseModel):
    part_id: int
    quantity: int = Field(gt=0)
    unit_cost_paise: int = Field(gt=0)


class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    expected_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    notes: str | None = None
    lines: list[PurchaseOrderLineCreate] = Field(min_length=1)


class PurchaseOrderLineRead(PurchaseOrderLineCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    line_total_paise: int


class PurchaseOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    vendor_id: int
    order_number: str
    status: str
    expected_on: str | None
    notes: str | None
    total_paise: int
    created_by: int
    created_at: datetime
    lines: list[PurchaseOrderLineRead] = Field(default_factory=list)


class PurchaseOrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Draft|Submitted|Approved|Partially received|Received|Cancelled)$")


class DocumentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    document_type: str | None = Field(default=None, min_length=2, max_length=80)
    issued_by: str | None = None
    expires_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    file_key: str | None = None
    status: str | None = None
