import os
from pathlib import Path
import sys
from uuid import uuid4

os.environ["VAHANA_DATABASE_URL"] = "sqlite:///./test-vahana.db"
os.environ["VAHANA_SEED_ADMIN_EMAIL"] = "test-admin@example.com"
os.environ["VAHANA_SEED_ADMIN_PASSWORD"] = "TestPassword!123"
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from backend.app.main import app


def test_health_and_vehicle_lifecycle(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        response = client.post("/api/v1/auth/login", json={"email": "test-admin@example.com", "password": "TestPassword!123"})
        assert response.status_code == 200
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        registration_number = f"DL 01 {uuid4().hex[:4].upper()}"
        created = client.post("/api/v1/vehicles", headers=headers, json={
            "registration_number": registration_number,
            "model": "Tata Signa 4825",
            "vehicle_type": "Heavy truck",
            "depot": "Delhi Hub",
        })
        assert created.status_code == 201
        assert created.json()["registration_number"] == registration_number
        vehicle_id = created.json()["id"]
        listed = client.get("/api/v1/vehicles", headers=headers)
        assert listed.status_code == 200
        assert any(vehicle["registration_number"] == registration_number for vehicle in listed.json())
        component = client.post("/api/v1/components", headers=headers, json={
            "vehicle_id": vehicle_id,
            "name": "Front axle brake pads",
            "component_type": "Brakes",
            "installed_at_km": 0,
        })
        assert component.status_code == 201
        work_order = client.post("/api/v1/work-orders", headers=headers, json={
            "vehicle_id": vehicle_id,
            "title": "Initial inspection",
            "priority": "High",
        })
        assert work_order.status_code == 201
        updated_order = client.patch(f"/api/v1/work-orders/{work_order.json()['id']}", headers=headers, json={"status": "In progress"})
        assert updated_order.status_code == 200
        assert updated_order.json()["status"] == "In progress"
        plan = client.post("/api/v1/maintenance-plans", headers=headers, json={
            "vehicle_id": vehicle_id,
            "name": "Quarterly inspection",
            "interval_km": 15000,
            "next_due_km": 15000,
        })
        assert plan.status_code == 201
        part = client.post("/api/v1/parts", headers=headers, json={
            "sku": f"TEST-{uuid4().hex[:6].upper()}",
            "name": "Test oil filter",
            "category": "Filters",
            "quantity_on_hand": 2,
            "reorder_level": 1,
            "unit_cost_paise": 125000,
        })
        assert part.status_code == 201
        transaction = client.post("/api/v1/inventory/transactions", headers=headers, json={
            "part_id": part.json()["id"],
            "transaction_type": "receipt",
            "quantity": 3,
            "reference": "GRN-001",
        })
        assert transaction.status_code == 200
        assert transaction.json()["quantity_on_hand"] == 5
        location = client.post("/api/v1/stock-locations", headers=headers, json={
            "name": "Delhi workshop",
            "code": f"DEL-{uuid4().hex[:4].upper()}",
        })
        assert location.status_code == 201
        movement = client.post("/api/v1/inventory/movements", headers=headers, json={
            "part_id": part.json()["id"],
            "location_id": location.json()["id"],
            "transaction_type": "issue",
            "quantity": 1,
            "reference": "WO-1",
        })
        assert movement.status_code == 201
        assert client.get("/api/v1/inventory/transactions", headers=headers).status_code == 200
        document = client.post("/api/v1/documents", headers=headers, json={
            "vehicle_id": vehicle_id,
            "name": "Fitness certificate",
            "document_type": "Fitness",
            "issued_by": "Transport Department",
            "expires_on": "2027-06-18",
        })
        assert document.status_code == 201
        expense = client.post("/api/v1/expenses", headers=headers, json={
            "vehicle_id": vehicle_id,
            "category": "Maintenance",
            "description": "Brake service",
            "amount_paise": 970000,
            "incurred_on": "2027-01-15",
            "vendor": "Workshop partner",
        })
        assert expense.status_code == 201
        assert client.get("/api/v1/expenses", headers=headers).json()[0]["description"] == "Brake service"
