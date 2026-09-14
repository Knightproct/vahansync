from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
