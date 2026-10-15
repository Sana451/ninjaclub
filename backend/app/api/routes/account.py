from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.booking import build_public_item, club_now
from app.core.config import settings
from app.models import (
    Registration,
    RegistrationPublic,
    RegistrationsPublic,
    ScheduleItem,
    ServiceCatalog,
    ServiceCatalogPublic,
    ServicePurchase,
    Trainer,
    TrainerPublic,
    Training,
    UserService,
    UserServicePublic,
    UserServicesPublic,
    VisitPublic,
    VisitsPublic,
)

router = APIRouter(tags=["account"])


def to_public(session: SessionDep, service: UserService) -> UserServicePublic:
    catalog = session.get(ServiceCatalog, service.catalog_id)
    return UserServicePublic(
        **service.model_dump(),
        catalog=ServiceCatalogPublic.model_validate(catalog),
    )


@router.get("/service", response_model=UserServicesPublic)
def read_my_services(
    session: SessionDep, user: CurrentUser, closed: bool = False
) -> Any:
    statement = select(UserService).where(UserService.user_id == user.id)
    if not closed:
        statement = statement.where(col(UserService.status).in_(["pending", "active"]))
    rows = session.exec(statement.order_by(col(UserService.created_at).desc())).all()
    return UserServicesPublic(
        data=[to_public(session, r) for r in rows], count=len(rows)
    )


@router.get("/service/{id}", response_model=UserServicePublic)
def read_my_service(session: SessionDep, user: CurrentUser, id: int) -> Any:
    service = session.get(UserService, id)
    if not service or service.user_id != user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    return to_public(session, service)


@router.post("/service", response_model=UserServicePublic)
def purchase_service(
    session: SessionDep, user: CurrentUser, body: ServicePurchase
) -> Any:
    catalog = session.get(ServiceCatalog, body.id)
    if not catalog or not catalog.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    price = catalog.price
    if catalog.is_single:
        had_any = session.exec(
            select(func.count())
            .select_from(UserService)
            .where(UserService.user_id == user.id)
        ).one()
        if not had_any:
            price = price * (100 - settings.FIRST_VISIT_DISCOUNT_PERCENT) // 100
    # Payment happens outside the system: the club admin activates the service.
    service = UserService(
        user_id=user.id,
        catalog_id=catalog.id,  # type: ignore[arg-type]
        visits_total=catalog.visits_count,
        visits_left=catalog.visits_count,
        status="pending",
        price=price,
    )
    session.add(service)
    session.commit()
    session.refresh(service)
    return to_public(session, service)


@router.get("/balance")
def read_balance(session: SessionDep, user: CurrentUser) -> dict[str, Any]:
    today = club_now().date()
    services = session.exec(
        select(UserService).where(
            UserService.user_id == user.id, UserService.status == "active"
        )
    ).all()
    valid = [s for s in services if not s.end_date or s.end_date >= today]
    return {
        "visits_left": sum(s.visits_left or 0 for s in valid),
        "has_unlimited": any(s.visits_left is None for s in valid),
        "active_services": len(valid),
    }


@router.get("/user/registrations", response_model=RegistrationsPublic)
def read_my_registrations(
    session: SessionDep,
    user: CurrentUser,
    upcoming: bool = True,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 50,
) -> Any:
    statement = (
        select(Registration, ScheduleItem)
        .join(ScheduleItem, col(ScheduleItem.id) == col(Registration.schedule_item_id))
        .where(Registration.user_id == user.id, Registration.status != "cancelled")
    )
    now = club_now()
    if upcoming:
        statement = statement.where(ScheduleItem.date >= now.date()).order_by(
            col(ScheduleItem.date), col(ScheduleItem.time_start)
        )
    else:
        statement = statement.where(ScheduleItem.date <= now.date()).order_by(
            col(ScheduleItem.date).desc(), col(ScheduleItem.time_start).desc()
        )
    rows = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    data = []
    for reg, item in rows:
        if upcoming and item.date == now.date() and item.time_end <= now.time():
            continue
        data.append(
            RegistrationPublic(
                id=reg.id,  # type: ignore[arg-type]
                status=reg.status,
                attended=reg.attended,
                created_at=reg.created_at,
                schedule_item=build_public_item(session, item, user),
            )
        )
    return RegistrationsPublic(data=data, count=len(data))


@router.get("/visits", response_model=VisitsPublic)
def read_visits(
    session: SessionDep,
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 50,
) -> Any:
    rows = session.exec(
        select(Registration, ScheduleItem, Training, Trainer)
        .join(ScheduleItem, col(ScheduleItem.id) == col(Registration.schedule_item_id))
        .join(Training, col(Training.id) == col(ScheduleItem.training_id))
        .join(Trainer, col(Trainer.id) == col(ScheduleItem.trainer_id))
        .where(Registration.user_id == user.id, Registration.attended == True)  # noqa: E712
        .order_by(col(ScheduleItem.date).desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    from datetime import datetime

    data = [
        VisitPublic(
            id=reg.id,  # type: ignore[arg-type]
            schedule_item_id=item.id,  # type: ignore[arg-type]
            name=training.name,
            start_at=datetime.combine(item.date, item.time_start),
            end_at=datetime.combine(item.date, item.time_end),
            trainer=TrainerPublic.model_validate(trainer),
        )
        for reg, item, training, trainer in rows
    ]
    return VisitsPublic(data=data, count=len(data))
