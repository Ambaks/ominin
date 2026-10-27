"""Recherche Google Places de l'espace commercial (5.2 du cahier). La route
Next.js /api/commercial/places compte le quota du commercial puis appelle
ici, avec le secret partagé : la requête et le masque de champs restent ceux
de la découverte de Léa (app/clients/places.py), en un seul endroit."""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.clients import places
from app.config import settings
from app.deps import require_trigger_secret

router = APIRouter(prefix="/places", dependencies=[Depends(require_trigger_secret)])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)


@router.post("/search")
def search(body: SearchRequest) -> dict:
    if not settings.google_places_api_key:
        raise HTTPException(status_code=503, detail="google places not configured")
    try:
        data = places.search_text(body.query)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="google places unavailable") from error
    return {
        "places": [
            {
                "external_id": place["id"],
                "name": place.get("displayName", {}).get("text", ""),
                "address": place.get("formattedAddress"),
                "city": places.address_component(place, "locality"),
                "postal_code": places.address_component(place, "postal_code"),
                "latitude": place.get("location", {}).get("latitude"),
                "longitude": place.get("location", {}).get("longitude"),
                "phone": place.get("nationalPhoneNumber"),
                "website": place.get("websiteUri"),
                "google_maps_url": place.get("googleMapsUri"),
            }
            for place in data.get("places", [])
        ]
    }
