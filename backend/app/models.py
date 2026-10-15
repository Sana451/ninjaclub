import re
import uuid
from datetime import UTC, datetime, time
from datetime import date as date_type
from typing import Literal

from pydantic import EmailStr, field_validator
from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


def normalize_phone(value: str | None) -> str | None:
    """Validate a phone number; Russian numbers are normalized to +7XXXXXXXXXX."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not re.fullmatch(r"\+?[\d\s()-]+", value):
        raise ValueError("Некорректный номер телефона")
    digits = re.sub(r"\D", "", value)
    plus = value.startswith("+")
    if (plus and digits.startswith("7")) or (not plus and digits[:1] in ("7", "8")):
        if len(digits) != 11:
            raise ValueError("Некорректный номер телефона")
        return "+7" + digits[1:]
    if not 10 <= len(digits) <= 15:
        raise ValueError("Некорректный номер телефона")
    return ("+" if plus else "") + digits


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        return normalize_phone(v)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        return normalize_phone(v)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        return normalize_phone(v)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = Field(default=None, max_length=255)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        return normalize_phone(v)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    items: list[Item] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# ---------------------------------------------------------------------------
# Club booking domain
# ---------------------------------------------------------------------------
class Club(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    address: str = Field(max_length=500)
    phone: str = Field(max_length=32)
    email: str | None = Field(default=None, max_length=255)
    club_time_from: str = Field(default="10:00", max_length=5)
    club_time_to: str = Field(default="22:00", max_length=5)
    work_days: str = Field(default="пн.–вскр.", max_length=64)
    description: str | None = None
    social: dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))


class ClubPublic(SQLModel):
    id: int
    name: str
    address: str
    phone: str
    email: str | None = None
    club_time_from: str
    club_time_to: str
    work_days: str
    description: str | None = None
    social: dict[str, str] = {}


class TrainerBase(SQLModel):
    surname: str = Field(max_length=100)
    name: str = Field(max_length=100)
    patronymic: str | None = Field(default=None, max_length=100)
    photo: str | None = Field(default=None, max_length=500)
    description: str | None = None
    function: str | None = Field(default=None, max_length=255)
    gender: str | None = Field(default=None, max_length=1)
    is_active: bool = True
    sort: int = 0


class Trainer(TrainerBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class TrainerCreate(TrainerBase):
    pass


class TrainerUpdate(SQLModel):
    surname: str | None = None
    name: str | None = None
    patronymic: str | None = None
    photo: str | None = None
    description: str | None = None
    function: str | None = None
    gender: str | None = None
    is_active: bool | None = None
    sort: int | None = None


class TrainerPublic(TrainerBase):
    id: int


class TrainersPublic(SQLModel):
    data: list[TrainerPublic]
    count: int


class TrainingBase(SQLModel):
    name: str = Field(max_length=255)
    description: str | None = None
    level: str = Field(default="any", max_length=16)  # beginner | pro | trial | any
    age_group: str = Field(default="any", max_length=16)
    color: str = Field(default="#d12a10", max_length=16)
    text_color: str = Field(default="#ffffff", max_length=16)
    is_personal: bool = False
    is_active: bool = True


class Training(TrainingBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class TrainingCreate(TrainingBase):
    pass


class TrainingUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    level: str | None = None
    age_group: str | None = None
    color: str | None = None
    text_color: str | None = None
    is_personal: bool | None = None
    is_active: bool | None = None


class TrainingPublic(TrainingBase):
    id: int


class WeeklySlotBase(SQLModel):
    training_id: int = Field(foreign_key="training.id", ondelete="CASCADE")
    trainer_id: int = Field(foreign_key="trainer.id", ondelete="CASCADE")
    weekday: int = Field(ge=0, le=6)
    time_start: time
    time_end: time
    records_limit: int = Field(default=12, ge=1)
    is_active: bool = True


class WeeklySlot(WeeklySlotBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class WeeklySlotCreate(WeeklySlotBase):
    pass


class WeeklySlotUpdate(SQLModel):
    training_id: int | None = None
    trainer_id: int | None = None
    weekday: int | None = Field(default=None, ge=0, le=6)
    time_start: time | None = None
    time_end: time | None = None
    records_limit: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class WeeklySlotPublic(WeeklySlotBase):
    id: int


class ScheduleItemBase(SQLModel):
    training_id: int = Field(foreign_key="training.id", ondelete="CASCADE")
    trainer_id: int = Field(foreign_key="trainer.id", ondelete="CASCADE")
    date: date_type = Field(index=True)
    time_start: time
    time_end: time
    records_limit: int = Field(default=12, ge=1)
    status: str = Field(default="open", max_length=16)  # open | closed | cancelled
    description: str | None = None


class ScheduleItem(ScheduleItemBase, table=True):
    __table_args__ = (
        UniqueConstraint("trainer_id", "date", "time_start", name="uq_schedule_slot"),
    )
    id: int | None = Field(default=None, primary_key=True)
    weekly_slot_id: int | None = Field(
        default=None, foreign_key="weeklyslot.id", ondelete="SET NULL"
    )


class ScheduleItemCreate(ScheduleItemBase):
    pass


class ScheduleItemUpdate(SQLModel):
    training_id: int | None = None
    trainer_id: int | None = None
    date: date_type | None = None
    time_start: time | None = None
    time_end: time | None = None
    records_limit: int | None = Field(default=None, ge=1)
    status: str | None = None
    description: str | None = None


class ScheduleItemPublic(SQLModel):
    id: int
    training_id: int
    name: str
    level: str
    age_group: str
    color: str
    text_color: str
    date: date_type
    time_start: time
    time_end: time
    records_limit: int
    records_current: int
    waiting_current: int = 0
    status: str
    description: str | None = None
    trainer: TrainerPublic
    sign_id: int | None = None
    sign_status: str | None = None


class ScheduleItemsPublic(SQLModel):
    data: list[ScheduleItemPublic]
    count: int


class Registration(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    schedule_item_id: int = Field(
        foreign_key="scheduleitem.id", ondelete="CASCADE", index=True
    )
    status: str = Field(default="active", max_length=16)  # active | waiting | cancelled
    user_service_id: int | None = Field(
        default=None, foreign_key="userservice.id", ondelete="SET NULL"
    )
    attended: bool = False
    created_at: datetime = Field(default_factory=get_datetime_utc)
    cancelled_at: datetime | None = None


class RegistrationPublic(SQLModel):
    id: int
    status: str
    attended: bool
    created_at: datetime
    schedule_item: ScheduleItemPublic


class RegistrationsPublic(SQLModel):
    data: list[RegistrationPublic]
    count: int


class ServiceCatalogBase(SQLModel):
    category: str = Field(max_length=32)  # group | personal | free_visit
    name: str = Field(max_length=255)
    description: str | None = None
    price: int = Field(ge=0)
    visits_count: int | None = Field(default=None, ge=1)
    valid_days: int = Field(default=30, ge=1)
    is_single: bool = False
    is_active: bool = True
    sort: int = 0


class ServiceCatalog(ServiceCatalogBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class ServiceCatalogCreate(ServiceCatalogBase):
    pass


class ServiceCatalogUpdate(SQLModel):
    category: str | None = None
    name: str | None = None
    description: str | None = None
    price: int | None = Field(default=None, ge=0)
    visits_count: int | None = Field(default=None, ge=1)
    valid_days: int | None = Field(default=None, ge=1)
    is_single: bool | None = None
    is_active: bool | None = None
    sort: int | None = None


class ServiceCatalogPublic(ServiceCatalogBase):
    id: int


class UserService(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    catalog_id: int = Field(foreign_key="servicecatalog.id", ondelete="RESTRICT")
    visits_total: int | None = None
    visits_left: int | None = None
    start_date: date_type | None = None
    end_date: date_type | None = None
    status: str = Field(
        default="pending", max_length=16
    )  # pending|active|closed|expired
    price: int = 0
    created_at: datetime = Field(default_factory=get_datetime_utc)


class UserServicePublic(SQLModel):
    id: int
    user_email: str | None = None
    user_full_name: str | None = None
    catalog: ServiceCatalogPublic
    visits_total: int | None = None
    visits_left: int | None = None
    start_date: date_type | None = None
    end_date: date_type | None = None
    status: str
    price: int
    created_at: datetime


class UserServicesPublic(SQLModel):
    data: list[UserServicePublic]
    count: int


class UserServiceGrant(SQLModel):
    user_id: uuid.UUID
    catalog_id: int
    start_date: date_type | None = None


class UserServiceUpdate(SQLModel):
    visits_left: int | None = Field(default=None, ge=0)
    end_date: date_type | None = None
    status: Literal["pending", "active", "closed", "expired"] | None = None


class ServicePurchase(SQLModel):
    id: int  # ServiceCatalog id
    promocode: str | None = None


class PersonalAvailabilityBase(SQLModel):
    trainer_id: int = Field(foreign_key="trainer.id", ondelete="CASCADE")
    weekday: int = Field(ge=0, le=6)
    time_from: time
    time_to: time
    slot_minutes: int = Field(default=60, ge=15)


class PersonalAvailability(PersonalAvailabilityBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class PersonalAvailabilityCreate(PersonalAvailabilityBase):
    pass


class PersonalAvailabilityPublic(PersonalAvailabilityBase):
    id: int


class ContactRequestBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=5, max_length=32)
    kind: str = Field(default="adults", max_length=16)  # kids | adults
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str) -> str:
        phone = normalize_phone(v)
        if phone is None:
            raise ValueError("Некорректный номер телефона")
        return phone


class ContactRequest(ContactRequestBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    status: str = Field(default="new", max_length=16)  # new | processed
    created_at: datetime = Field(default_factory=get_datetime_utc)


class ContactRequestCreate(ContactRequestBase):
    pass


class ContactRequestUpdate(SQLModel):
    status: str


class ContactRequestPublic(SQLModel):
    name: str
    phone: str
    kind: str
    comment: str | None = None
    id: int
    status: str
    created_at: datetime


class ContactRequestsPublic(SQLModel):
    data: list[ContactRequestPublic]
    count: int


class VisitPublic(SQLModel):
    id: int
    schedule_item_id: int
    name: str
    start_at: datetime
    end_at: datetime
    trainer: TrainerPublic


class VisitsPublic(SQLModel):
    data: list[VisitPublic]
    count: int


class RegistrationRequest(SQLModel):
    schedule_id: int
    user_service_id: int | None = None


class RegistrationCheck(SQLModel):
    allowed: bool
    status: str  # success | waiting | fail
    reason: str | None = None
    user_service_id: int | None = None


class RegistrationResult(SQLModel):
    status: str  # success | waiting | fail
    message: str
    registration_id: int | None = None


class PersonalRegistrationRequest(SQLModel):
    trainer_id: int
    user_service_id: int
    date: date_type
    time: time


class PersonalDates(SQLModel):
    dates: dict[str, list[str]]


class ServerTime(SQLModel):
    timestamp: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
