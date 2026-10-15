from datetime import date, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, OptionalUser, SessionDep
from app.booking import (
    build_public_item,
    cancel,
    check_registration,
    club_now,
    personal_dates,
    register,
    usable_services,
)
from app.models import (
    Message,
    PersonalDates,
    PersonalRegistrationRequest,
    RegistrationCheck,
    RegistrationRequest,
    RegistrationResult,
    ScheduleItem,
    ScheduleItemPublic,
    ScheduleItemsPublic,
    ServiceCatalogPublic,
    Trainer,
    TrainerPublic,
    Training,
    TrainingPublic,
    UserService,
    UserServicePublic,
)

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("/trainings", response_model=list[TrainingPublic])
def read_trainings(session: SessionDep) -> Any:
    return session.exec(
        select(Training)
        .where(Training.is_active == True, Training.is_personal == False)  # noqa: E712
        .order_by(col(Training.id))
    ).all()


@router.get("/personal/trainers", response_model=list[TrainerPublic])
def personal_trainers(session: SessionDep) -> Any:
    from app.models import PersonalAvailability

    ids = session.exec(select(PersonalAvailability.trainer_id).distinct()).all()
    if not ids:
        return []
    return session.exec(
        select(Trainer)
        .where(col(Trainer.id).in_(ids), Trainer.is_active == True)  # noqa: E712
        .order_by(col(Trainer.sort))
    ).all()


@router.get("/personal/services", response_model=list[ServiceCatalogPublic])
def personal_services(session: SessionDep, trainer_id: int) -> Any:  # noqa: ARG001
    from app.models import ServiceCatalog

    return session.exec(
        select(ServiceCatalog)
        .where(
            ServiceCatalog.category == "personal",
            ServiceCatalog.is_active == True,  # noqa: E712
        )
        .order_by(col(ServiceCatalog.sort))
    ).all()


@router.get("/personal/dates", response_model=PersonalDates)
def personal_available_dates(
    session: SessionDep,
    trainer_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Any:
    date_from = date_from or club_now().date()
    date_to = date_to or date_from + timedelta(days=14)
    if (date_to - date_from).days > 62:
        raise HTTPException(status_code=400, detail="Range too large")
    return PersonalDates(dates=personal_dates(session, trainer_id, date_from, date_to))


def _personal_item(
    session: SessionDep, body: PersonalRegistrationRequest
) -> ScheduleItem | None:
    slots = personal_dates(session, body.trainer_id, body.date, body.date)
    if body.time.strftime("%H:%M") not in slots.get(body.date.isoformat(), []):
        return None
    from datetime import datetime

    from app.models import PersonalAvailability

    av = next(
        a
        for a in session.exec(
            select(PersonalAvailability).where(
                PersonalAvailability.trainer_id == body.trainer_id
            )
        ).all()
        if a.weekday == body.date.weekday() and a.time_from <= body.time < a.time_to
    )
    training = session.exec(
        select(Training).where(Training.is_personal == True)  # noqa: E712
    ).first()
    if not training:
        return None
    end = datetime.combine(body.date, body.time) + timedelta(minutes=av.slot_minutes)
    return ScheduleItem(
        training_id=training.id,  # type: ignore[arg-type]
        trainer_id=body.trainer_id,
        date=body.date,
        time_start=body.time,
        time_end=end.time(),
        records_limit=1,
    )


@router.post("/personal/registration-check", response_model=RegistrationCheck)
def personal_check(
    session: SessionDep, user: CurrentUser, body: PersonalRegistrationRequest
) -> Any:
    item = _personal_item(session, body)
    if not item:
        return RegistrationCheck(allowed=False, status="fail", reason="Время занято")
    item.id = -1
    service = session.get(UserService, body.user_service_id)
    if not service or service.user_id != user.id:
        return RegistrationCheck(
            allowed=False, status="fail", reason="Услуга не найдена"
        )
    if not any(s.id == service.id for s in usable_services(session, user, item)):
        return RegistrationCheck(
            allowed=False, status="fail", reason="Услуга не подходит"
        )
    return RegistrationCheck(allowed=True, status="success", user_service_id=service.id)


@router.post("/personal/registration", response_model=RegistrationResult)
def personal_register(
    session: SessionDep, user: CurrentUser, body: PersonalRegistrationRequest
) -> Any:
    check = personal_check(session, user, body)
    if not check.allowed:
        return RegistrationResult(status="fail", message=check.reason or "")
    item = _personal_item(session, body)
    assert item
    session.add(item)
    session.commit()
    session.refresh(item)
    status, message, reg = register(session, user, item.id, body.user_service_id)  # type: ignore[arg-type]
    if status == "fail":
        session.delete(item)
        session.commit()
    return RegistrationResult(
        status=status, message=message, registration_id=reg.id if reg else None
    )


@router.get("", response_model=ScheduleItemsPublic)
def read_schedule(
    session: SessionDep,
    user: OptionalUser,
    date_from: Annotated[date | None, Query(alias="dateFrom")] = None,
    date_to: Annotated[date | None, Query(alias="dateTo")] = None,
    trainers: Annotated[list[int] | None, Query(alias="trainer[]")] = None,
    trainings: Annotated[list[int] | None, Query(alias="training[]")] = None,
    age_type: Annotated[str | None, Query(alias="ageType")] = None,
    level: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200, alias="pageSize")] = 100,
) -> Any:
    date_from = date_from or club_now().date()
    date_to = date_to or date_from + timedelta(days=6)
    statement = (
        select(ScheduleItem)
        .join(Training, col(Training.id) == col(ScheduleItem.training_id))
        .where(
            ScheduleItem.date >= date_from,
            ScheduleItem.date <= date_to,
            ScheduleItem.status != "cancelled",
            Training.is_personal == False,  # noqa: E712
        )
    )
    if trainers:
        statement = statement.where(col(ScheduleItem.trainer_id).in_(trainers))
    if trainings:
        statement = statement.where(col(ScheduleItem.training_id).in_(trainings))
    if age_type:
        statement = statement.where(Training.age_group == age_type)
    if level:
        statement = statement.where(Training.level == level)
    count = session.exec(select(func.count()).select_from(statement.subquery())).one()
    rows = session.exec(
        statement.order_by(col(ScheduleItem.date), col(ScheduleItem.time_start))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ScheduleItemsPublic(
        data=[build_public_item(session, r, user) for r in rows], count=count
    )


@router.post("/registration-check", response_model=RegistrationCheck)
def registration_check(
    session: SessionDep, user: CurrentUser, body: RegistrationRequest
) -> Any:
    item = session.get(ScheduleItem, body.schedule_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return check_registration(session, user, item, body.user_service_id)


@router.post("/registration-v2", response_model=RegistrationResult)
def registration_v2(
    session: SessionDep, user: CurrentUser, body: RegistrationRequest
) -> Any:
    status, message, reg = register(
        session, user, body.schedule_id, body.user_service_id
    )
    return RegistrationResult(
        status=status, message=message, registration_id=reg.id if reg else None
    )


@router.post("", response_model=RegistrationResult)
def register_simple(
    session: SessionDep, user: CurrentUser, training: Annotated[int, Query()]
) -> Any:
    return registration_v2(session, user, RegistrationRequest(schedule_id=training))


@router.get("/catalog/{schedule_id}", response_model=list[UserServicePublic])
def registration_basis(session: SessionDep, user: CurrentUser, schedule_id: int) -> Any:
    from app.models import ServiceCatalog

    item = session.get(ScheduleItem, schedule_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    result = []
    for service in usable_services(session, user, item):
        catalog = session.get(ServiceCatalog, service.catalog_id)
        result.append(
            UserServicePublic(
                **service.model_dump(),
                catalog=ServiceCatalogPublic.model_validate(catalog),
            )
        )
    return result


@router.get("/{id}", response_model=ScheduleItemPublic)
def read_schedule_item(session: SessionDep, user: OptionalUser, id: int) -> Any:
    item = session.get(ScheduleItem, id)
    if not item or item.status == "cancelled":
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return build_public_item(session, item, user)


@router.delete("/{id}", response_model=Message)
def cancel_registration(session: SessionDep, user: CurrentUser, id: int) -> Any:
    ok, message = cancel(session, user, id)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return Message(message=message)
