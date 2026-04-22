import httpx
import logging
from typing import Optional, Tuple

logger = logging.getLogger("mosaic")

async def check_for_updates(current_version: str, repo: str = "methil-group/mosaic") -> Optional[Tuple[str, str]]:
    """
    Checks GitHub for the latest tag.
    Returns (latest_version, update_command) if an update is available, else None.
    """
    url = f"https://api.github.com/repos/{repo}/tags"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                tags = response.json()
                if not tags:
                    return None
                
                # Get the latest tag name (assumes semantic versioning in tags)
                latest_tag = tags[0]["name"]
                # Strip 'v' prefix if present
                latest_version = latest_tag.lstrip('v')
                
                # Simple comparison: if it's different, assume update is available
                # (Ideally use packaging.version for proper comparison)
                if latest_version != current_version.lstrip('v'):
                    update_cmd = f"curl -sSL https://raw.githubusercontent.com/{repo}/main/cli/install.sh | bash"
                    return latest_version, update_cmd
    except Exception as e:
        logger.warning(f"Failed to check for updates: {e}")
    
    return None
