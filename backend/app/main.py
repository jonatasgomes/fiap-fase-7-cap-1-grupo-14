import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .config import get_settings
from .database import create_db_and_tables, engine
from .routers import auth, chat, emulador, telemetry
from .services.predictor import train
from .services.seed import seed_patients

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cardioia")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_patients(session)
    train()  # treina o modelo preditivo (Fase 6) no startup
    logger.info("CardioIA backend pronto (modelo treinado, pacientes semeados).")
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Núcleo integrador da CardioIA (Fase 7): ingestão IoT, motor preditivo "
        "(Fase 6) e assistente conversacional Gemini (Fase 5)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(telemetry.router)
app.include_router(chat.router)
app.include_router(emulador.router)


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.get("/", tags=["infra"])
def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs"}
