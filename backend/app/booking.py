from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlmodel import Session, col, func, select

from app.core.config import settings
from app.models import (
    PersonalAvailability,
    Registration,
    RegistrationCheck,
    ScheduleItem,
    ScheduleItemPublic,
    ServiceCatalog,
    Trainer,
    TrainerPublic,
    Training,
    User,
    UserService,
    WeeklySlot,
)

CLUB_TZ = ZoneInfo(settings.CLUB_TIMEZONE)


def club_now() -> datetime:
    return datetime.now(CLUB_TZ).replace(tzinfo=None)


def item_start(item: ScheduleItem) -> datetime:
    return datetime.combine(item.date, item.time_start)


def item_end(item: ScheduleItem) -> datetime:
    return datetime.combine(item.date, item.time_end)


def count_registrations(session: Session, item_id: int, status: str) -> int:
    return session.exec(
        select(func.count())
        .select_from(Registration)
        .where(Registration.schedule_item_id == item_id, Registration.status == status)
    ).one()


def build_public_item(
    session: Session, item: ScheduleItem, user: User | None = None
) -> ScheduleItemPublic:
    training = session.get(Training, item.training_id)
    trainer = session.get(Trainer, item.trainer_id)
    assert training and trainer
    sign = None
    if user:
        sign = session.exec(
            select(Registration).where(
                Registration.schedule_item_id == item.id,
                Registration.user_id == user.id,
                Registration.status != "cancelled",
            )
        ).first()
    return ScheduleItemPublic(
        id=item.id,  # type: ignore[arg-type]
        training_id=training.id,  # type: ignore[arg-type]
        name=training.name,
        level=training.level,
        age_group=training.age_group,
        color=training.color,
        text_color=training.text_color,
        date=item.date,
        time_start=item.time_start,
        time_end=item.time_end,
        records_limit=item.records_limit,
        records_current=count_registrations(session, item.id, "active"),  # type: ignore[arg-type]
        waiting_current=count_registrations(session, item.id, "waiting"),  # type: ignore[arg-type]
        status=item.status,
        description=item.description or training.description,
        trainer=TrainerPublic.model_validate(trainer),
        sign_id=sign.id if sign else None,
        sign_status=sign.status if sign else None,
    )


def usable_services(
    session: Session, user: User, item: ScheduleItem
) -> list[UserService]:
    training = session.get(Training, item.training_id)
    category = "personal" if training and training.is_personal else "group"
    rows = session.exec(
        select(UserService, ServiceCatalog)
        .join(ServiceCatalog, col(ServiceCatalog.id) == col(UserService.catalog_id))
        .where(
            UserService.user_id == user.id,
            UserService.status == "active",
            ServiceCatalog.category == category,
        )
        .order_by(col(UserService.end_date))
    ).all()
    result = []
    for service, _catalog in rows:
        if service.visits_left is not None and service.visits_left <= 0:
            continue
        if service.start_date and item.date < service.start_date:
            continue
        if service.end_date and item.date > service.end_date:
            continue
        result.append(service)
    return result


def check_registration(
    session: Session,
    user: User,
    item: ScheduleItem,
    user_service_id: int | None = None,
) -> RegistrationCheck:
    def fail(reason: str) -> RegistrationCheck:
        return RegistrationCheck(allowed=False, status="fail", reason=reason)

    if item.status != "open":
        return fail("Запись на занятие закрыта")
    if item_start(item) <= club_now():
        return fail("Занятие уже началось")
    existing = session.exec(
        select(Registration).where(
            Registration.schedule_item_id == item.id,
            Registration.user_id == user.id,
            Registration.status != "cancelled",
        )
    ).first()
    if existing:
        return fail("Вы уже записаны на это занятие")

    services = usable_services(session, user, item)
    if user_service_id is not None:
        services = [s for s in services if s.id == user_service_id]
    if not services:
        return fail("Нет подходящего абонемента или услуги")

    full = count_registrations(session, item.id, "active") >= item.records_limit  # type: ignore[arg-type]
    return RegistrationCheck(
        allowed=True,
        status="waiting" if full else "success",
        user_service_id=services[0].id,
    )


def debit(service: UserService) -> None:
    if service.visits_left is not None:
        service.visits_left -= 1
        if service.visits_left <= 0:
            service.status = "closed"


def refund(service: UserService) -> None:
    if service.visits_left is not None:
        service.visits_left += 1
        if service.status == "closed":
            service.status = "active"


def register(
    session: Session,
    user: User,
    item_id: int,
    user_service_id: int | None = None,
) -> tuple[str, str, Registration | None]:
    item = session.exec(
        select(ScheduleItem).where(ScheduleItem.id == item_id).with_for_update()
    ).first()
    if not item:
        return "fail", "Занятие не найдено", None
    result = check_registration(session, user, item, user_service_id)
    if not result.allowed:
        return "fail", result.reason or "Запись невозможна", None
    service = session.get(UserService, result.user_service_id)
    assert service
    registration = Registration(
        user_id=user.id,
        schedule_item_id=item.id,  # type: ignore[arg-type]
        status="active" if result.status == "success" else "waiting",
        user_service_id=service.id,
    )
    if result.status == "success":
        debit(service)
        session.add(service)
    session.add(registration)
    session.commit()
    session.refresh(registration)
    if result.status == "success":
        return "success", "Вы записаны на занятие", registration
    return "waiting", "Мест нет — вы добавлены в лист ожидания", registration


def promote_waiting(session: Session, item: ScheduleItem) -> None:
    while count_registrations(session, item.id, "active") < item.records_limit:  # type: ignore[arg-type]
        waiting = session.exec(
            select(Registration)
            .where(
                Registration.schedule_item_id == item.id,
                Registration.status == "waiting",
            )
            .order_by(col(Registration.created_at))
        ).all()
        promoted = False
        for reg in waiting:
            service = session.get(UserService, reg.user_service_id)
            if (
                service
                and service.status == "active"
                and (service.visits_left is None or service.visits_left > 0)
            ):
                debit(service)
                reg.status = "active"
                session.add(service)
                session.add(reg)
                promoted = True
                break
            reg.status = "cancelled"
            reg.cancelled_at = datetime.now(UTC)
            session.add(reg)
        session.commit()
        if not promoted:
            return


def cancel(session: Session, user: User, item_id: int) -> tuple[bool, str]:
    item = session.exec(
        select(ScheduleItem).where(ScheduleItem.id == item_id).with_for_update()
    ).first()
    if not item:
        return False, "Занятие не найдено"
    reg = session.exec(
        select(Registration).where(
            Registration.schedule_item_id == item_id,
            Registration.user_id == user.id,
            Registration.status != "cancelled",
        )
    ).first()
    if not reg:
        return False, "Запись не найдена"
    deadline = item_start(item) - timedelta(hours=settings.CANCEL_BEFORE_HOURS)
    if club_now() > item_start(item):
        return False, "Занятие уже началось"
    was_active = reg.status == "active"
    # Late cancellation of an active booking keeps the visit debited.
    refundable = club_now() <= deadline
    reg.status = "cancelled"
    reg.cancelled_at = datetime.now(UTC)
    if was_active and refundable and reg.user_service_id:
        service = session.get(UserService, reg.user_service_id)
        if service:
            refund(service)
            session.add(service)
    session.add(reg)
    session.commit()
    if was_active:
        promote_waiting(session, item)
    return True, (
        "Запись отменена"
        if refundable or not was_active
        else "Запись отменена, занятие списано (отмена менее чем за "
        f"{settings.CANCEL_BEFORE_HOURS} ч.)"
    )


def personal_dates(
    session: Session, trainer_id: int, date_from: date, date_to: date
) -> dict[str, list[str]]:
    availability = session.exec(
        select(PersonalAvailability).where(
            PersonalAvailability.trainer_id == trainer_id
        )
    ).all()
    busy = {
        (i.date, i.time_start)
        for i in session.exec(
            select(ScheduleItem).where(
                ScheduleItem.trainer_id == trainer_id,
                ScheduleItem.date >= date_from,
                ScheduleItem.date <= date_to,
                ScheduleItem.status != "cancelled",
            )
        ).all()
    }
    now = club_now()
    result: dict[str, list[str]] = {}
    day = date_from
    while day <= date_to:
        slots: list[str] = []
        for av in availability:
            if av.weekday != day.weekday():
                continue
            cur = datetime.combine(day, av.time_from)
            end = datetime.combine(day, av.time_to)
            step = timedelta(minutes=av.slot_minutes)
            while cur + step <= end:
                if cur > now and (day, cur.time()) not in busy:
                    slots.append(cur.strftime("%H:%M"))
                cur += step
        if slots:
            result[day.isoformat()] = sorted(set(slots))
        day += timedelta(days=1)
    return result


def generate_schedule(session: Session, weeks: int, start: date | None = None) -> int:
    start = start or club_now().date()
    slots = session.exec(select(WeeklySlot).where(WeeklySlot.is_active == True)).all()  # noqa: E712
    created = 0
    for offset in range(weeks * 7):
        day = start + timedelta(days=offset)
        for slot in slots:
            if slot.weekday != day.weekday():
                continue
            exists = session.exec(
                select(ScheduleItem).where(
                    ScheduleItem.trainer_id == slot.trainer_id,
                    ScheduleItem.date == day,
                    ScheduleItem.time_start == slot.time_start,
                )
            ).first()
            if exists:
                continue
            session.add(
                ScheduleItem(
                    training_id=slot.training_id,
                    trainer_id=slot.trainer_id,
                    date=day,
                    time_start=slot.time_start,
                    time_end=slot.time_end,
                    records_limit=slot.records_limit,
                    weekly_slot_id=slot.id,
                )
            )
            created += 1
    session.commit()
    return created


def t(hour: int, minute: int = 0) -> time:
    return time(hour, minute)
