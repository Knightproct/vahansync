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
        listed = client.get("/api/v1/vehicles", headers=headers)
        assert listed.status_code == 200
        assert any(vehicle["registration_number"] == registration_number for vehicle in listed.json())
