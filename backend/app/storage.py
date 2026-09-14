from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from .config import get_settings


def save_upload(upload: UploadFile) -> tuple[str, int, str]:
    settings = get_settings()
    storage_root = Path(settings.storage_path).resolve()
    storage_root.mkdir(parents=True, exist_ok=True)
    object_key = f"documents/{uuid4().hex}"
    target = storage_root / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    digest = sha256()
    size = 0
    with target.open("wb") as output:
        while chunk := upload.file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                target.unlink(missing_ok=True)
                raise ValueError("Uploaded file exceeds the maximum allowed size")
            digest.update(chunk)
            output.write(chunk)
    return object_key, size, digest.hexdigest()


def resolve_object(object_key: str) -> Path:
    storage_root = Path(get_settings().storage_path).resolve()
    candidate = (storage_root / object_key).resolve()
    if storage_root not in candidate.parents:
        raise ValueError("Invalid storage object key")
    return candidate
