from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import SessionDep
from app.models import (
    Club,
    ClubPublic,
    ContactRequest,
    ContactRequestCreate,
    ContactRequestPublic,
    ServerTime,
    ServiceCatalog,
    ServiceCatalogPublic,
    Trainer,
    TrainerPublic,
    TrainersPublic,
)

router = APIRouter(tags=["club"])


@router.get("/club", response_model=ClubPublic)
def read_club(session: SessionDep) -> Any:
    club = session.exec(select(Club)).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.get("/trainer", response_model=TrainersPublic)
def read_trainers(
    session: SessionDep,
    gender: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 50,
) -> Any:
    statement = select(Trainer).where(Trainer.is_active == True)  # noqa: E712
    if gender:
        statement = statement.where(Trainer.gender == gender)
    count = session.exec(select(func.count()).select_from(statement.subquery())).one()
    rows = session.exec(
        statement.order_by(col(Trainer.sort), col(Trainer.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return TrainersPublic(
        data=[TrainerPublic.model_validate(r) for r in rows], count=count
    )


@router.get("/trainer/{id}", response_model=TrainerPublic)
def read_trainer(session: SessionDep, id: int) -> Any:
    trainer = session.get(Trainer, id)
    if not trainer or not trainer.is_active:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer


@router.get("/catalog/service", response_model=list[ServiceCatalogPublic])
def read_catalog(session: SessionDep, category: str | None = None) -> Any:
    statement = select(ServiceCatalog).where(ServiceCatalog.is_active == True)  # noqa: E712
    if category:
        statement = statement.where(ServiceCatalog.category == category)
    return session.exec(
        statement.order_by(col(ServiceCatalog.sort), col(ServiceCatalog.id))
    ).all()


@router.get("/catalog/service/category", response_model=list[str])
def read_catalog_categories(session: SessionDep) -> Any:
    return session.exec(
        select(ServiceCatalog.category)
        .where(ServiceCatalog.is_active == True)  # noqa: E712
        .distinct()
    ).all()


@router.get("/catalog/service/{id}", response_model=ServiceCatalogPublic)
def read_catalog_item(session: SessionDep, id: int) -> Any:
    item = session.get(ServiceCatalog, id)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    return item


@router.get("/setting/server-time", response_model=ServerTime)
def server_time() -> Any:
    return ServerTime(timestamp=int(datetime.now(UTC).timestamp()))


@router.post("/requests", response_model=ContactRequestPublic)
def create_request(session: SessionDep, body: ContactRequestCreate) -> Any:
    obj = ContactRequest.model_validate(body)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj
