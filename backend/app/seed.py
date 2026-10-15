# ruff: noqa: C408
from datetime import time

from sqlmodel import Session, select

from app.booking import generate_schedule
from app.core.config import settings
from app.models import (
    Club,
    ServiceCatalog,
    Trainer,
    Training,
    WeeklySlot,
)

CLUB = dict(
    name="Ninja Club",
    address="Санкт-Петербург, ул. Народная, д. 55, лит. Т, второй этаж",
    phone="+7 993 072 52 57",
    email="silkina.90@bk.ru",
    club_time_from="10:00",
    club_time_to="22:00",
    work_days="пн.–вскр.",
    description="Лучший ниндзя зал в СПб",
    social={
        "vk": "https://m.vk.ru/club242067147",
        "telegram": "https://t.me/+EXXdi7wTYQwxMWM6",
        "max": "https://max.ru/join/e61lzny5T2N6B5q653GeFRtZgrhuABaKNPUy2gYghG4",
    },
)

TRAINERS = [
    dict(
        key="romanov",
        surname="Романов",
        name="Семен",
        function="Главный тренер сборной СПб",
        gender="M",
        sort=1,
        photo=None,
        description=(
            "Сертифицированный тренер по гонкам с препятствиями. "
            "Главный тренер сборной Санкт-Петербурга по гонкам с препятствиями. "
            "Президент федерации гонок с препятствиями в Санкт-Петербурге."
        ),
    ),
    dict(
        key="nadezhdin",
        surname="Надеждин",
        name="Алексей",
        function="Тренер",
        gender="M",
        sort=2,
        photo=None,
        description=(
            "Сертифицированный тренер колледжа фитнеса и бодибилдинга им. Бена Вейдера. "
            "Каскадер кино. Победитель и призер соревнований по брейк-дансу, паркуру и "
            "черлидингу. Мастер спорта по пауэрлифтингу и становой тяге. "
            "1-й разряд по арт-фехтованию. Участник шоу «Русский ниндзя». "
            "Общий тренерский стаж с 2010 года, с детьми — с 2013."
        ),
    ),
    dict(
        key="silkina",
        surname="Силкина",
        name="Анастасия",
        function="Детский тренер команды Sila Ninja",
        gender="F",
        sort=3,
        photo=None,
        description=(
            "Действующий член сборной Санкт-Петербурга по гонкам с препятствиями. "
            "Золотой призер сборной лиги ГТО Приморского района. "
            "Участница и тестировщик двух сезонов шоу «Суперниндзя» (2023 и 2024). "
            "Многократный победитель и призер российских и международных соревнований: "
            "Гонка героев, Nord race, Bear race, Bison race, Урбан и другие. "
            "Организатор и судья спортивных коммерческих мероприятий в Санкт-Петербурге."
        ),
    ),
    dict(
        key="korolev",
        surname="Королев",
        name="Александр",
        function="Детский тренер",
        gender="M",
        sort=4,
        photo=None,
        description=(
            "Дипломированный тренер в области физической культуры и спорта. "
            "Закончил Колледж физической культуры и спорта при СПбГУ. "
            "Опыт работы с детьми 4 года, возрастные группы от 3 лет. "
            "Воспитанники выступают в соревнованиях по гонкам с препятствиями."
        ),
    ),
]

# key: (name, level, age_group, color)
TRAININGS = {
    "pro": ("Группа PRO", "pro", "pro", "#a11414"),
    "trial": ("Просмотр", "trial", "pro", "#bababa"),
    "5_6": ("Группа 5–6 лет", "beginner", "5_6", "#f73613"),
    "7_9": ("Группа 7–9 лет", "beginner", "7_9", "#d12a10"),
    "10_14": ("Группа 10–14 лет", "any", "10_14", "#333333"),
    "10_15": ("Группа 10–15 лет", "any", "10_15", "#333333"),
    "adults": ("Взрослые", "any", "adults", "#0f0f0f"),
    "team": ("Команда SilaNinja", "any", "team", "#a11414"),
    "personal": ("Персональная тренировка", "any", "any", "#d12a10"),
}

# Source: schedule/*.png. weekday: 0 = Monday
_S = [
    # Романов
    ("romanov", [0, 2], "19:00", "20:30", "pro"),
    ("romanov", [1, 3], "18:00", "19:00", "trial"),
    ("romanov", [1, 3], "19:00", "20:30", "pro"),
    # Надеждин
    ("nadezhdin", [0, 2, 4], "17:00", "18:00", "7_9"),
    ("nadezhdin", [0, 2, 4], "18:00", "19:00", "10_15"),
    ("nadezhdin", [0, 2, 4], "20:00", "21:30", "adults"),
    # Силкина
    ("silkina", [2, 4], "16:30", "17:30", "5_6"),
    ("silkina", [2, 4], "17:30", "18:30", "7_9"),
    ("silkina", [2, 4], "18:30", "20:00", "team"),
    ("silkina", [6], "12:00", "13:00", "5_6"),
    ("silkina", [6], "13:00", "14:00", "7_9"),
    ("silkina", [6], "14:00", "15:30", "team"),
    # Королев
    ("korolev", [0], "17:30", "18:30", "5_6"),
    ("korolev", [0], "18:30", "19:30", "10_14"),
    ("korolev", [1, 3], "17:30", "18:30", "5_6"),
    ("korolev", [1, 3], "18:30", "19:30", "7_9"),
    ("korolev", [1, 3], "19:30", "20:30", "10_14"),
    ("korolev", [5], "12:00", "13:00", "5_6"),
    ("korolev", [5], "13:00", "14:00", "7_9"),
    ("korolev", [5], "14:00", "15:00", "10_14"),
]

CATALOG = [
    dict(
        category="group",
        name="4 тренировки",
        price=5000,
        visits_count=4,
        valid_days=30,
        sort=1,
        description="4 групповых тренировки, срок действия 1 месяц",
    ),
    dict(
        category="group",
        name="8 тренировок",
        price=9000,
        visits_count=8,
        valid_days=30,
        sort=2,
        description="8 групповых тренировок, срок действия 1 месяц",
    ),
    dict(
        category="group",
        name="12 тренировок",
        price=12000,
        visits_count=12,
        valid_days=30,
        sort=3,
        description="12 групповых тренировок, срок действия 1 месяц",
    ),
]


def _parse(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def seed_club_data(session: Session) -> None:
    if session.exec(select(Club)).first():
        return
    session.add(Club(**CLUB))
    trainers: dict[str, Trainer] = {}
    for data in TRAINERS:
        key = data["key"]
        trainer = Trainer(**{k: v for k, v in data.items() if k != "key"})
        session.add(trainer)
        trainers[key] = trainer  # type: ignore[index]
    trainings: dict[str, Training] = {}
    for key, (name, level, age_group, color) in TRAININGS.items():
        training = Training(
            name=name,
            level=level,
            age_group=age_group,
            color=color,
            is_personal=key == "personal",
        )
        session.add(training)
        trainings[key] = training
    session.flush()
    for trainer_key, weekdays, start, end, training_key in _S:
        for weekday in weekdays:
            session.add(
                WeeklySlot(
                    training_id=trainings[training_key].id,  # type: ignore[arg-type]
                    trainer_id=trainers[trainer_key].id,  # type: ignore[arg-type]
                    weekday=weekday,
                    time_start=_parse(start),
                    time_end=_parse(end),
                )
            )
    for item in CATALOG:
        session.add(ServiceCatalog(**item))
    session.commit()
    generate_schedule(session, settings.SCHEDULE_WEEKS_AHEAD)
