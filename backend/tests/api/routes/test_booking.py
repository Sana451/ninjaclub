from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.booking import club_now
from app.core.config import settings
from app.models import Trainer, Training, User

API = settings.API_V1_STR


def _make_item(
    client: TestClient,
    admin: dict[str, str],
    db: Session,
    *,
    level: str = "any",
    limit: int = 1,
    days: int = 5,
    minute: int = 0,
) -> int:
    training = db.exec(
        select(Training).where(Training.level == level, Training.is_personal == False)  # noqa: E712
    ).first()
    trainer = db.exec(select(Trainer)).first()
    assert training and trainer
    day = club_now().date() + timedelta(days=days)
    r = client.post(
        f"{API}/admin/schedule/",
        headers=admin,
        json={
            "training_id": training.id,
            "trainer_id": trainer.id,
            "date": day.isoformat(),
            "time_start": f"23:{minute:02d}:00",
            "time_end": f"23:{minute + 1:02d}:00",
            "records_limit": limit,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _grant(
    client: TestClient, admin: dict[str, str], db: Session, email: str
) -> tuple[int, str]:
    user = db.exec(select(User).where(User.email == email)).one()
    catalog = client.get(f"{API}/catalog/service").json()[0]
    r = client.post(
        f"{API}/admin/user-services/",
        headers=admin,
        json={"user_id": str(user.id), "catalog_id": catalog["id"]},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"], str(user.id)


def test_public_read(client: TestClient) -> None:
    assert client.get(f"{API}/club").json()["name"] == "Ninja Club"
    assert client.get(f"{API}/trainer").json()["count"] == 4
    assert client.get(f"{API}/setting/server-time").json()["timestamp"] > 0
    prices = [s["price"] for s in client.get(f"{API}/catalog/service").json()]
    assert prices == [5000, 9000, 12000]
    schedule = client.get(f"{API}/schedule", params={"pageSize": 200}).json()
    assert schedule["count"] > 0


def test_request_form(client: TestClient) -> None:
    r = client.post(
        f"{API}/requests",
        json={"name": "Иван", "phone": "+79990000000", "kind": "kids"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "new"


def test_booking_requires_auth(client: TestClient) -> None:
    r = client.post(f"{API}/schedule/registration-v2", json={"schedule_id": 1})
    assert r.status_code == 401


def test_admin_endpoints_forbidden_for_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.get(f"{API}/admin/trainers/", headers=normal_user_token_headers)
    assert r.status_code == 403


def test_register_cancel_refund(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    item_id = _make_item(client, superuser_token_headers, db, minute=10)
    body = {"schedule_id": item_id}

    no_service = client.post(
        f"{API}/schedule/registration-v2", headers=normal_user_token_headers, json=body
    ).json()
    assert no_service["status"] == "fail"

    _grant(client, superuser_token_headers, db, settings.EMAIL_TEST_USER)
    ok = client.post(
        f"{API}/schedule/registration-v2", headers=normal_user_token_headers, json=body
    ).json()
    assert ok["status"] == "success"
    assert (
        client.get(f"{API}/balance", headers=normal_user_token_headers).json()[
            "visits_left"
        ]
        == 3
    )

    dup = client.post(
        f"{API}/schedule/registration-v2", headers=normal_user_token_headers, json=body
    ).json()
    assert dup["status"] == "fail"

    item = client.get(
        f"{API}/schedule/{item_id}", headers=normal_user_token_headers
    ).json()
    assert item["records_current"] == 1 and item["sign_status"] == "active"

    r = client.delete(f"{API}/schedule/{item_id}", headers=normal_user_token_headers)
    assert r.status_code == 200
    assert (
        client.get(f"{API}/balance", headers=normal_user_token_headers).json()[
            "visits_left"
        ]
        == 4
    )


def test_waiting_list_promotion(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    from tests.utils.user import authentication_token_from_email
    from tests.utils.utils import random_email

    item_id = _make_item(client, superuser_token_headers, db, minute=20)
    second_email = random_email()
    second = authentication_token_from_email(client=client, email=second_email, db=db)
    _grant(client, superuser_token_headers, db, second_email)
    _grant(client, superuser_token_headers, db, settings.EMAIL_TEST_USER)

    body = {"schedule_id": item_id}
    first = client.post(
        f"{API}/schedule/registration-v2", headers=normal_user_token_headers, json=body
    ).json()
    waiting = client.post(
        f"{API}/schedule/registration-v2", headers=second, json=body
    ).json()
    assert first["status"] == "success"
    assert waiting["status"] == "waiting"

    client.delete(f"{API}/schedule/{item_id}", headers=normal_user_token_headers)
    item = client.get(f"{API}/schedule/{item_id}", headers=second).json()
    assert item["records_current"] == 1 and item["sign_status"] == "active"


def test_pro_group_open_for_everyone(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    from tests.utils.user import authentication_token_from_email
    from tests.utils.utils import random_email

    item_id = _make_item(client, superuser_token_headers, db, level="pro", minute=30)
    email = random_email()
    headers = authentication_token_from_email(client=client, email=email, db=db)
    _grant(client, superuser_token_headers, db, email)
    r = client.post(
        f"{API}/schedule/registration-check",
        headers=headers,
        json={"schedule_id": item_id},
    ).json()
    assert r["allowed"] is True


def test_purchase_creates_pending_service(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    catalog = client.get(f"{API}/catalog/service").json()[1]
    r = client.post(
        f"{API}/service", headers=normal_user_token_headers, json={"id": catalog["id"]}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_personal_flow(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    trainer = db.exec(select(Trainer)).first()
    assert trainer
    training = client.post(
        f"{API}/admin/trainings/",
        headers=superuser_token_headers,
        json={"name": "Персональная", "is_personal": True},
    )
    assert training.status_code == 200
    target = club_now().date() + timedelta(days=3)
    client.post(
        f"{API}/admin/personal-availability/",
        headers=superuser_token_headers,
        json={
            "trainer_id": trainer.id,
            "weekday": target.weekday(),
            "time_from": "10:00:00",
            "time_to": "12:00:00",
            "slot_minutes": 60,
        },
    )
    dates = client.get(
        f"{API}/schedule/personal/dates",
        params={"trainer_id": trainer.id, "date_from": target, "date_to": target},
    ).json()["dates"]
    assert dates[target.isoformat()] == ["10:00", "11:00"]

    catalog = client.post(
        f"{API}/admin/catalog/",
        headers=superuser_token_headers,
        json={"category": "personal", "name": "Персональная", "price": 3400},
    ).json()
    user = db.exec(select(User).where(User.email == settings.EMAIL_TEST_USER)).one()
    service = client.post(
        f"{API}/admin/user-services/",
        headers=superuser_token_headers,
        json={"user_id": str(user.id), "catalog_id": catalog["id"]},
    ).json()
    payload = {
        "trainer_id": trainer.id,
        "user_service_id": service["id"],
        "date": target.isoformat(),
        "time": "10:00:00",
    }
    r = client.post(
        f"{API}/schedule/personal/registration",
        headers=normal_user_token_headers,
        json=payload,
    ).json()
    assert r["status"] == "success"
    dates = client.get(
        f"{API}/schedule/personal/dates",
        params={"trainer_id": trainer.id, "date_from": target, "date_to": target},
    ).json()["dates"]
    assert dates[target.isoformat()] == ["11:00"]


def test_admin_adjusts_user_service(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    service_id, _ = _grant(
        client, superuser_token_headers, db, settings.EMAIL_TEST_USER
    )
    url = f"{API}/admin/user-services/{service_id}"
    r = client.patch(
        url,
        headers=superuser_token_headers,
        json={"visits_left": 3, "end_date": "2030-01-01", "status": "closed"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["visits_left"] == 3
    assert body["end_date"] == "2030-01-01"
    assert body["status"] == "closed"
    assert body["user_email"] == settings.EMAIL_TEST_USER

    r = client.patch(url, headers=superuser_token_headers, json={"visits_left": -1})
    assert r.status_code == 422

    r = client.patch(
        f"{API}/admin/user-services/999999",
        headers=superuser_token_headers,
        json={"status": "active"},
    )
    assert r.status_code == 404


def test_request_rejects_invalid_phone(client: TestClient) -> None:
    for phone in ["+792100000000", "+7921000000", "abc12345", "12345"]:
        r = client.post(f"{API}/requests", json={"name": "Иван", "phone": phone})
        assert r.status_code == 422, phone
    r = client.post(
        f"{API}/requests", json={"name": "Иван", "phone": "8 (921) 000-00-00"}
    )
    assert r.status_code == 200
    assert r.json()["phone"] == "+79210000000"
