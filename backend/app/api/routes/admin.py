from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import SQLModel, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.booking import build_public_item, generate_schedule, promote_waiting
from app.core.config import settings
from app.models import (
    Club,
    ClubPublic,
    ContactRequest,
    ContactRequestPublic,
    ContactRequestsPublic,
    ContactRequestUpdate,
    Message,
    PersonalAvailability,
    PersonalAvailabilityCreate,
    PersonalAvailabilityPublic,
    Registration,
    ScheduleItem,
    ScheduleItemCreate,
    ScheduleItemPublic,
    ScheduleItemUpdate,
    ServiceCatalog,
    ServiceCatalogCreate,
    ServiceCatalogPublic,
    ServiceCatalogUpdate,
    Trainer,
    TrainerCreate,
    TrainerPublic,
    TrainerUpdate,
    Training,
    TrainingCreate,
    TrainingPublic,
    TrainingUpdate,
    User,
    UserService,
    UserServiceGrant,
    UserServicePublic,
    UserServiceUpdate,
    WeeklySlot,
    WeeklySlotCreate,
    WeeklySlotPublic,
    WeeklySlotUpdate,
)

admin = [Depends(get_current_active_superuser)]


def crud_router(
    *,
    prefix: str,
    tag: str,
    model: type[SQLModel],
    create_schema: type[SQLModel],
    update_schema: type[SQLModel] | None,
    public_schema: type[SQLModel],
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag], dependencies=admin)

    @router.get("/", response_model=list[public_schema])  # type: ignore[valid-type]
    def read_all(session: SessionDep, skip: int = 0, limit: int = 200) -> Any:
        return session.exec(
            select(model).order_by(col(model.id)).offset(skip).limit(limit)  # type: ignore[attr-defined]
        ).all()

    @router.post("/", response_model=public_schema)
    def create(session: SessionDep, body: create_schema) -> Any:  # type: ignore[valid-type]
        obj = model.model_validate(body)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    if update_schema is not None:

        @router.put("/{id}", response_model=public_schema)
        def update(session: SessionDep, id: int, body: update_schema) -> Any:  # type: ignore[valid-type]
            obj = session.get(model, id)
            if not obj:
                raise HTTPException(status_code=404, detail="Not found")
            obj.sqlmodel_update(body.model_dump(exclude_unset=True))  # type: ignore[attr-defined]
            session.add(obj)
            session.commit()
            session.refresh(obj)
            return obj

    @router.delete("/{id}", response_model=Message)
    def delete(session: SessionDep, id: int) -> Any:
        obj = session.get(model, id)
        if not obj:
            raise HTTPException(status_code=404, detail="Not found")
        session.delete(obj)
        session.commit()
        return Message(message="Deleted")

    return router


router = APIRouter(prefix="/admin")

router.include_router(
    crud_router(
        prefix="/trainers",
        tag="admin-trainers",
        model=Trainer,
        create_schema=TrainerCreate,
        update_schema=TrainerUpdate,
        public_schema=TrainerPublic,
    )
)
router.include_router(
    crud_router(
        prefix="/trainings",
        tag="admin-trainings",
        model=Training,
        create_schema=TrainingCreate,
        update_schema=TrainingUpdate,
        public_schema=TrainingPublic,
    )
)
router.include_router(
    crud_router(
        prefix="/weekly-slots",
        tag="admin-weekly-slots",
        model=WeeklySlot,
        create_schema=WeeklySlotCreate,
        update_schema=WeeklySlotUpdate,
        public_schema=WeeklySlotPublic,
    )
)
router.include_router(
    crud_router(
        prefix="/catalog",
        tag="admin-catalog",
        model=ServiceCatalog,
        create_schema=ServiceCatalogCreate,
        update_schema=ServiceCatalogUpdate,
        public_schema=ServiceCatalogPublic,
    )
)
router.include_router(
    crud_router(
        prefix="/personal-availability",
        tag="admin-personal-availability",
        model=PersonalAvailability,
        create_schema=PersonalAvailabilityCreate,
        update_schema=None,
        public_schema=PersonalAvailabilityPublic,
    )
)

schedule_router = APIRouter(
    prefix="/schedule", tags=["admin-schedule"], dependencies=admin
)


@schedule_router.get("/", response_model=list[ScheduleItemPublic])
def admin_read_schedule(
    session: SessionDep, date_from: date | None = None, date_to: date | None = None
) -> Any:
    date_from = date_from or date.today()
    date_to = date_to or date_from + timedelta(days=13)
    rows = session.exec(
        select(ScheduleItem)
        .where(ScheduleItem.date >= date_from, ScheduleItem.date <= date_to)
        .order_by(col(ScheduleItem.date), col(ScheduleItem.time_start))
    ).all()
    return [build_public_item(session, r) for r in rows]


@schedule_router.post("/", response_model=ScheduleItemPublic)
def admin_create_schedule(session: SessionDep, body: ScheduleItemCreate) -> Any:
    item = ScheduleItem.model_validate(body)
    session.add(item)
    session.commit()
    session.refresh(item)
    return build_public_item(session, item)


@schedule_router.post("/generate", response_model=Message)
def admin_generate_schedule(session: SessionDep, weeks: int | None = None) -> Any:
    created = generate_schedule(session, weeks or settings.SCHEDULE_WEEKS_AHEAD)
    return Message(message=f"Created {created} schedule items")


@schedule_router.put("/{id}", response_model=ScheduleItemPublic)
def admin_update_schedule(
    session: SessionDep, id: int, body: ScheduleItemUpdate
) -> Any:
    item = session.get(ScheduleItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.add(item)
    session.commit()
    session.refresh(item)
    if item.status == "open":
        promote_waiting(session, item)
    return build_public_item(session, item)


@schedule_router.delete("/{id}", response_model=Message)
def admin_delete_schedule(session: SessionDep, id: int) -> Any:
    item = session.get(ScheduleItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(item)
    session.commit()
    return Message(message="Deleted")


@schedule_router.get("/{id}/registrations")
def admin_item_registrations(session: SessionDep, id: int) -> list[dict[str, Any]]:
    rows = session.exec(
        select(Registration, User)
        .join(User, col(User.id) == col(Registration.user_id))
        .where(Registration.schedule_item_id == id, Registration.status != "cancelled")
        .order_by(col(Registration.created_at))
    ).all()
    return [
        {
            "id": reg.id,
            "status": reg.status,
            "attended": reg.attended,
            "user_id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        }
        for reg, user in rows
    ]


@schedule_router.post(
    "/registrations/{registration_id}/attended", response_model=Message
)
def admin_mark_attended(
    session: SessionDep, registration_id: int, attended: bool = True
) -> Any:
    reg = session.get(Registration, registration_id)
    if not reg or reg.status != "active":
        raise HTTPException(status_code=404, detail="Registration not found")
    reg.attended = attended
    session.add(reg)
    session.commit()
    return Message(message="Updated")


router.include_router(schedule_router)

services_router = APIRouter(
    prefix="/user-services", tags=["admin-user-services"], dependencies=admin
)


def _service_public(session: SessionDep, service: UserService) -> UserServicePublic:
    catalog = session.get(ServiceCatalog, service.catalog_id)
    user = session.get(User, service.user_id)
    return UserServicePublic(
        **service.model_dump(),
        catalog=ServiceCatalogPublic.model_validate(catalog),
        user_email=user.email if user else None,
        user_full_name=user.full_name if user else None,
    )


@services_router.get("/", response_model=list[UserServicePublic])
def admin_read_user_services(
    session: SessionDep, status: str | None = None, skip: int = 0, limit: int = 200
) -> Any:
    statement = select(UserService)
    if status:
        statement = statement.where(UserService.status == status)
    rows = session.exec(
        statement.order_by(col(UserService.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return [_service_public(session, service) for service in rows]


@services_router.patch("/{id}", response_model=UserServicePublic)
def admin_update_user_service(
    session: SessionDep, id: int, body: UserServiceUpdate
) -> Any:
    service = session.get(UserService, id)
    if not service:
        raise HTTPException(status_code=404, detail="User service not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(service, key, value)
    session.add(service)
    session.commit()
    session.refresh(service)
    return _service_public(session, service)


def _activate(service: UserService, catalog: ServiceCatalog, start: date) -> None:
    service.status = "active"
    service.start_date = start
    service.end_date = start + timedelta(days=catalog.valid_days)
    service.visits_total = catalog.visits_count
    service.visits_left = (
        service.visits_left if service.visits_left is not None else catalog.visits_count
    )


@services_router.post("/", response_model=UserServicePublic)
def admin_grant_service(session: SessionDep, body: UserServiceGrant) -> Any:
    catalog = session.get(ServiceCatalog, body.catalog_id)
    if not catalog or not session.get(User, body.user_id):
        raise HTTPException(status_code=404, detail="Not found")
    service = UserService(
        user_id=body.user_id,
        catalog_id=body.catalog_id,
        visits_total=catalog.visits_count,
        visits_left=catalog.visits_count,
        price=catalog.price,
    )
    _activate(service, catalog, body.start_date or date.today())
    session.add(service)
    session.commit()
    session.refresh(service)
    return _service_public(session, service)


@services_router.post("/{id}/activate", response_model=UserServicePublic)
def admin_activate_service(session: SessionDep, id: int) -> Any:
    service = session.get(UserService, id)
    if not service or service.status != "pending":
        raise HTTPException(status_code=404, detail="Pending service not found")
    catalog = session.get(ServiceCatalog, service.catalog_id)
    assert catalog
    _activate(service, catalog, date.today())
    session.add(service)
    session.commit()
    session.refresh(service)
    return _service_public(session, service)


router.include_router(services_router)

requests_router = APIRouter(
    prefix="/requests", tags=["admin-requests"], dependencies=admin
)


@requests_router.get("/", response_model=ContactRequestsPublic)
def admin_read_requests(
    session: SessionDep, status: str | None = None, skip: int = 0, limit: int = 100
) -> Any:
    statement = select(ContactRequest)
    if status:
        statement = statement.where(ContactRequest.status == status)
    count = session.exec(select(func.count()).select_from(statement.subquery())).one()
    rows = session.exec(
        statement.order_by(col(ContactRequest.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return ContactRequestsPublic(
        data=[ContactRequestPublic.model_validate(r) for r in rows], count=count
    )


@requests_router.put("/{id}", response_model=ContactRequestPublic)
def admin_update_request(
    session: SessionDep, id: int, body: ContactRequestUpdate
) -> Any:
    obj = session.get(ContactRequest, id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    obj.status = body.status
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


router.include_router(requests_router)

club_router = APIRouter(prefix="/club", tags=["admin-club"], dependencies=admin)


@club_router.put("/", response_model=ClubPublic)
def admin_update_club(session: SessionDep, body: ClubPublic) -> Any:
    club = session.exec(select(Club)).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    club.sqlmodel_update(body.model_dump(exclude={"id"}))
    session.add(club)
    session.commit()
    session.refresh(club)
    return club


router.include_router(club_router)
