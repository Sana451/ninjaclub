from fastapi import APIRouter

from app.api.routes import (
    account,
    admin,
    club,
    items,
    login,
    private,
    schedule,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(club.router)
api_router.include_router(schedule.router)
api_router.include_router(account.router)
api_router.include_router(admin.router)


if settings.FASTAPI_ENV == "development":
    api_router.include_router(private.router)
