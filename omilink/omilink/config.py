from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Sur le boîtier, .env est omilink.env de la carte SD (voir compose.yaml) ;
    # le pont y écrit lui-même DEVICE_TOKEN et DEVICE_SERIAL au premier
    # démarrage.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # URL publique du backend — seule ligne à renseigner.
    backend_url: str
    # Jeton et numéro de série de la machine pour laquelle il a été généré :
    # vides sur une carte neuve, régénérés si la carte a été clonée.
    device_token: str = ""
    device_serial: str = ""
    # Version de l'image, gravée au build (Dockerfile) et remontée au backend.
    version: str = "dev"

    # Numéro de série de la carte ; à défaut (portable), le nom d'hôte.
    serial_file: str = "/proc/cpuinfo"
    # Derniers caractères du numéro de série imprimés sur l'étiquette du
    # boîtier (miroir de SERIAL_CODE_LENGTH côté frontend).
    serial_code_length: int = 6

    poll_interval_seconds: float = 3
    # Contrôle de joignabilité des imprimantes (connexion TCP ouverte puis
    # refermée), plus espacé que la boucle pour ne pas les solliciter en vain.
    printer_check_interval_seconds: float = 20
    # Le backend sur Render met ~30 s à se réveiller après un déploiement ;
    # l'imprimante, elle, répond en local.
    backend_timeout_seconds: float = 30
    printer_timeout_seconds: float = 10

    # Balayage du réseau local à la demande du gérant : port raw ESC/POS
    # (miroir du défaut SQL printers.port), taille de réseau supposée, et
    # bornes du balayage (254 hôtes × 0,5 s / 64 ≈ 2 s au pire).
    scan_port: int = 9100
    scan_prefix_length: int = 24
    scan_timeout_seconds: float = 0.5
    scan_workers: int = 64
