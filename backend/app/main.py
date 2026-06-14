from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.MonitoreoIntrusos import router as monitoreo_router

app = FastAPI(title="SistemaFinalM1 - Backend")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Permite los orígenes definidos arriba
    allow_credentials=True,      # Permite el envío de cookies/credenciales
    allow_methods=["*"],         # Permite todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],         # Permite todos los headers
)
app.include_router(auth_router)
app.include_router(monitoreo_router)

@app.get("/")
def home():
    return {
        "message": "Backend del Módulo 1 funcionando"
    }