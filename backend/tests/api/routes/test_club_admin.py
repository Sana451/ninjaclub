from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.booking import club_now
from app.core.config import settings
from app.models import Trainer, User
from tests.api.routes.test_booking import _make_item
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import random_email

API = settings.API_V1_STR


def _new_user(
    client: TestClient, db: Session, admin: dict[str, str]
) -> tuple[dict[str, str], str]:
    email = random_email()
    headers = authentication_token_from_email(client=client, email=email, db=db)
    user = db.exec(select(User).where(User.email == email)).one()
    group = client.get(f"{API}/catalog/service", params={"category": "group"}).json()
    r = client.post(
        f"{API}/admin/user-services/",
        headers=admin,
        json={"user_id": str(user.id), "catalog_id": group[0]["id"]},
    )
    assert r.status_code == 200, r.text
    return headers, email


def test_public_club_endpoints(client: TestClient) -> None:
    trainers = client.get(f"{API}/trainer").json()["data"]
    gender = trainers[0]["gender"]
    filtered = client.get(f"{API}/trainer", params={"gender": gender}).json()
    assert 0 < filtered["count"] <= len(trainers)
    assert client.get(f"{API}/trainer/{trainers[0]['id']}").status_code == 200
    assert client.get(f"{API}/trainer/999999").status_code == 404

    catalog = client.get(f"{API}/catalog/service").json()
    category = catalog[0]["category"]
    by_category = client.get(
        f"{API}/catalog/service", params={"category": category}
    ).json()
    assert by_category
    assert category in client.get(f"{API}/catalog/service/category").json()
    assert client.get(f"{API}/catalog/service/{catalog[0]['id']}").status_code == 200
    assert client.get(f"{API}/catalog/service/999999").status_code == 404

    assert client.get(f"{API}/schedule/trainings").status_code == 200
    assert client.get(f"{API}/schedule/personal/trainers").status_code == 200
    r = client.get(f"{API}/schedule/personal/services", params={"trainer_id": 1})
    assert r.status_code == 200


def test_schedule_filters_and_errors(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    trainer = client.get(f"{API}/trainer").json()["data"][0]
    training = client.get(f"{API}/schedule/trainings").json()[0]
    r = client.get(
        f"{API}/schedule",
        params={
            "trainer[]": [trainer["id"]],
            "training[]": [training["id"]],
            "ageType": training["age_group"],
            "level": training["level"],
        },
    )
    assert r.status_code == 200
    assert client.get(f"{API}/schedule/999999").status_code == 404
    h = normal_user_token_headers
    r = client.post(
        f"{API}/schedule/registration-check", headers=h, json={"schedule_id": 999999}
    )
    assert r.status_code == 404
    assert client.get(f"{API}/schedule/catalog/999999", headers=h).status_code == 404
    assert client.delete(f"{API}/schedule/999999", headers=h).status_code == 400
    too_wide = client.get(
        f"{API}/schedule/personal/dates",
        params={"trainer_id": 1, "date_from": "2030-01-01", "date_to": "2031-01-01"},
    )
    assert too_wide.status_code == 400


def test_account_flow(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    admin = superuser_token_headers
    headers, _ = _new_user(client, db, admin)
    item_id = _make_item(client, admin, db, days=2, minute=40, limit=5)

    services = client.get(f"{API}/service", headers=headers).json()
    assert services["count"] == 1
    service_id = services["data"][0]["id"]
    assert client.get(f"{API}/service/{service_id}", headers=headers).status_code == 200
    assert client.get(f"{API}/service/999999", headers=headers).status_code == 404
    assert client.get(
        f"{API}/service", headers=headers, params={"closed": True}
    ).json()["count"]

    usable = client.get(f"{API}/schedule/catalog/{item_id}", headers=headers).json()
    assert [s["id"] for s in usable] == [service_id]

    r = client.post(f"{API}/schedule", headers=headers, params={"training": item_id})
    assert r.json()["status"] == "success"
    reg_id = r.json()["registration_id"]

    upcoming = client.get(f"{API}/user/registrations", headers=headers).json()
    assert upcoming["count"] == 1
    past = client.get(
        f"{API}/user/registrations", headers=headers, params={"upcoming": False}
    ).json()
    assert past["count"] == 0

    listed = client.get(
        f"{API}/admin/schedule/{item_id}/registrations", headers=admin
    ).json()
    assert [x["id"] for x in listed] == [reg_id]
    r = client.post(
        f"{API}/admin/schedule/registrations/{reg_id}/attended", headers=admin
    )
    assert r.status_code == 200
    r = client.post(
        f"{API}/admin/schedule/registrations/999999/attended", headers=admin
    )
    assert r.status_code == 404
    visits = client.get(f"{API}/visits", headers=headers).json()
    assert visits["count"] == 1


def test_purchase_discount_and_errors(client: TestClient, db: Session) -> None:
    email = random_email()
    headers = authentication_token_from_email(client=client, email=email, db=db)
    catalog = client.get(f"{API}/catalog/service").json()
    single = next((c for c in catalog if c["visits_count"] == 1), None)
    if single:
        r = client.post(f"{API}/service", headers=headers, json={"id": single["id"]})
        assert r.json()["price"] < single["price"]
    r = client.post(f"{API}/service", headers=headers, json={"id": 999999})
    assert r.status_code == 404


def test_admin_crud(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    admin = superuser_token_headers
    created = client.post(
        f"{API}/admin/trainers/",
        headers=admin,
        json={"name": "Тест", "surname": "Тренер", "gender": "M"},
    )
    assert created.status_code == 200, created.text
    trainer_id = created.json()["id"]
    r = client.put(
        f"{API}/admin/trainers/{trainer_id}", headers=admin, json={"is_active": False}
    )
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert (
        client.put(f"{API}/admin/trainers/999999", headers=admin, json={}).status_code
        == 404
    )
    assert client.get(f"{API}/admin/trainers/", headers=admin).status_code == 200
    assert (
        client.delete(f"{API}/admin/trainers/{trainer_id}", headers=admin).status_code
        == 200
    )
    assert (
        client.delete(f"{API}/admin/trainers/{trainer_id}", headers=admin).status_code
        == 404
    )


def test_admin_schedule_management(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    admin = superuser_token_headers
    item_id = _make_item(client, admin, db, days=8, minute=41)
    today = club_now().date()
    listed = client.get(
        f"{API}/admin/schedule/",
        headers=admin,
        params={"date_from": today, "date_to": today + timedelta(days=30)},
    ).json()
    assert any(i["id"] == item_id for i in listed)
    assert client.get(f"{API}/admin/schedule/", headers=admin).status_code == 200

    r = client.put(
        f"{API}/admin/schedule/{item_id}", headers=admin, json={"records_limit": 7}
    )
    assert r.status_code == 200 and r.json()["records_limit"] == 7
    assert (
        client.put(f"{API}/admin/schedule/999999", headers=admin, json={}).status_code
        == 404
    )
    r = client.post(
        f"{API}/admin/schedule/generate", headers=admin, params={"weeks": 1}
    )
    assert r.status_code == 200
    assert (
        client.delete(f"{API}/admin/schedule/{item_id}", headers=admin).status_code
        == 200
    )
    assert (
        client.delete(f"{API}/admin/schedule/{item_id}", headers=admin).status_code
        == 404
    )


def test_admin_services_and_requests(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    admin = superuser_token_headers
    email = random_email()
    headers = authentication_token_from_email(client=client, email=email, db=db)
    catalog = client.get(f"{API}/catalog/service").json()[1]
    pending = client.post(
        f"{API}/service", headers=headers, json={"id": catalog["id"]}
    ).json()
    assert pending["status"] == "pending"

    listed = client.get(
        f"{API}/admin/user-services/", headers=admin, params={"status": "pending"}
    ).json()
    assert any(s["id"] == pending["id"] for s in listed)
    r = client.post(
        f"{API}/admin/user-services/{pending['id']}/activate", headers=admin
    )
    assert r.status_code == 200 and r.json()["status"] == "active"
    r = client.post(
        f"{API}/admin/user-services/{pending['id']}/activate", headers=admin
    )
    assert r.status_code == 404
    r = client.post(
        f"{API}/admin/user-services/",
        headers=admin,
        json={"user_id": "00000000-0000-0000-0000-000000000000", "catalog_id": 1},
    )
    assert r.status_code == 404

    created = client.post(
        f"{API}/requests", json={"name": "Пётр", "phone": "+79991112233"}
    ).json()
    listed = client.get(f"{API}/admin/requests/", headers=admin).json()
    assert any(x["id"] == created["id"] for x in listed["data"])
    only_new = client.get(
        f"{API}/admin/requests/", headers=admin, params={"status": "new"}
    )
    assert only_new.status_code == 200
    r = client.put(
        f"{API}/admin/requests/{created['id']}",
        headers=admin,
        json={"status": "processed"},
    )
    assert r.json()["status"] == "processed"
    r = client.put(
        f"{API}/admin/requests/999999", headers=admin, json={"status": "processed"}
    )
    assert r.status_code == 404


def test_personal_failures(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    trainer = db.exec(select(Trainer)).first()
    assert trainer
    target = club_now().date() + timedelta(days=4)
    payload = {
        "trainer_id": trainer.id,
        "user_service_id": 999999,
        "date": target.isoformat(),
        "time": "03:00:00",
    }
    r = client.post(
        f"{API}/schedule/personal/registration",
        headers=normal_user_token_headers,
        json=payload,
    ).json()
    assert r["status"] == "fail"
