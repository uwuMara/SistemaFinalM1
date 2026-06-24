from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.perfilusuario import router as perfil_router
from app.routes.MonitoreoIntrusos import router as monitoreo_router
from app.routes.roles import router as roles_router

app = FastAPI(title="SistemaFinalM1 - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(perfil_router)
app.include_router(monitoreo_router)
app.include_router(roles_router)

@app.get("/")
def home():
    return {
        "message": "Backend del Módulo 1 funcionando"
    }