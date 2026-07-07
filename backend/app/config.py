import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "sistema_final_modulo1")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# Configuración de Servidor de Correo SMTP para 2FA
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "aldaiircg@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "yipq rnap ejkf uwun")
SMTP_SENDER = os.getenv("SMTP_SENDER", SMTP_USERNAME)