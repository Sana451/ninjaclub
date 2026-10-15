from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import (
    ContactRequest,
    Item,
    PersonalAvailability,
    Registration,
    ScheduleItem,
    ServiceCatalog,
    Training,
    User,
    UserService,
)
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session]:
    with Session(engine) as session:
        init_db(session)
        yield session
        for model in (Registration, UserService, PersonalAvailability, ContactRequest):
            session.execute(delete(model))
        session.execute(
            delete(ScheduleItem).where(ScheduleItem.weekly_slot_id.is_(None))
        )
        session.execute(
            delete(ScheduleItem).where(
                ScheduleItem.training_id.in_(
                    select(Training.id).where(Training.is_personal)
                )
            )
        )
        session.execute(delete(Training).where(Training.is_personal))
        session.execute(
            delete(ServiceCatalog).where(ServiceCatalog.category == "personal")
        )
        statement = delete(Item)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
