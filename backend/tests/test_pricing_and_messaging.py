import os
from pathlib import Path
import sys

os.environ["VAHANA_DATABASE_URL"] = "sqlite:///./test-pricing-and-messaging.db"
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from backend.app.database import Base, engine
from backend.app.main import app


def test_fleetops_pricing_catalog_and_mobile_normalization(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as client:
        plans = client.get("/api/v1/subscription/plans")
        assert plans.status_code == 200
        catalog = {plan["code"]: plan for plan in plans.json()}
        assert catalog["starter"]["monthly_price_paise"] == 299900
        assert catalog["starter"]["included_vehicles"] == 3
        assert catalog["starter"]["overage_vehicle_fee_paise"] == 50000
        assert catalog["growth"]["monthly_price_paise"] == 999900
        assert catalog["scale"]["monthly_price_paise"] == 2499900
        assert catalog["enterprise"]["min_vehicles"] == 100

        signup = client.post("/api/v1/auth/signup", json={
            "organization_name": "Mobile Ready Fleet",
            "full_name": "Owner One",
            "email": "owner@mobile-ready.example",
            "mobile_phone": "9876543210",
            "password": "OwnerPassword!123",
        })
        assert signup.status_code == 201
        assert signup.json()["user"]["mobile_phone"] == "+919876543210"
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        invalid = client.patch(
            "/api/v1/users/me/contact",
            headers=headers,
            json={"mobile_phone": "not-a-number"},
        )
        assert invalid.status_code == 422
