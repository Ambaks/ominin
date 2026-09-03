from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Sur le boîtier, .env est omilink.env de la carte SD (voir compose.yaml).
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # URL publique du backend et jeton de l'appareil (onglet Terminaux →
    # « Ajouter un boîtier »).
    backend_url: str
    device_token: str
    # Version de l'image, gravée au build (Dockerfile) et remontée au backend.
    version: str = "dev"

    poll_interval_seconds: float = 3
    # Contrôle de joignabilité des imprimantes (connexion TCP ouverte puis
    # refermée), plus espacé que la boucle pour ne pas les solliciter en vain.
    printer_check_interval_seconds: float = 20
    # Le backend sur Render met ~30 s à se réveiller après un déploiement ;
    # l'imprimante, elle, répond en local.
    backend_timeout_seconds: float = 30
    printer_timeout_seconds: float = 10
