
from typing import Any, Dict, List, Optional
import aiohttp
from asset_processing_service.config import HEADERS, config
from asset_processing_service.models import Asset, AssetProcessingJob
from datetime import datetime



class ApiError(Exception):
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


async def fetch_jobs() -> List[AssetProcessingJob]:
    try:
        url = f"{config.API_BASE_URL}/asset-processing-job"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=HEADERS) as response:
                if response.status == 200:
                    data = await response.json()

                    # Parse the JSON data into AssetProcessingJob instances
                    jobs = [AssetProcessingJob(**item) for item in data]
                    return jobs
                
                else:
                    print("Error fetching jobs: ", response.status)
                    return []
    except aiohttp.ClientError as error:
        print(f"Error fetching jobs: {error}")
        return []

async def update_job_details(job_id: str, update_data: Dict[str, Any]) -> None:
    data = {**update_data, "lastHeartBeat": datetime.now().isoformat()}
    try:
        url = f"{config.API_BASE_URL}/asset-processing-job?jobId={job_id}"
        async with aiohttp.ClientSession() as session:
            async with session.patch(url, json=data, headers=HEADERS) as response:
                response.raise_for_status()
    except aiohttp.ClientError as error:
        print(f"Failed to update job details for job {job_id}: {error}")


async def update_job_heartbeat(job_id: str) -> None:
    try:
        url = f"{config.API_BASE_URL}/asset-processing-job?jobId={job_id}"
        data = {"lastHeartBeat": datetime.now().isoformat()}
        async with aiohttp.ClientSession() as session:
            async with session.patch(url, json=data, headers=HEADERS) as response:
                response.raise_for_status()
    except aiohttp.ClientError as error:
        print(f"Failed to update job heartbeat for job {job_id}: {error}")
        


async def fetch_asset(asset_id: str) -> Optional[Asset]:
    try:
        url = f"{config.API_BASE_URL}/asset?assetId={asset_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=HEADERS) as response:
                if response.status == 200:
                    data = await response.json()

                    if data:
                        return Asset(**data)
                    
                    return None
                
                else:
                    print("Error fetching asset: ", response.status)
                    return None
    except aiohttp.ClientError as error:
        print(f"Error fetching asset: {error}")
        return None


async def fetch_asset_file(file_url: str) -> bytes:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(file_url, headers=HEADERS) as response:
                response.raise_for_status()
                return await response.read()
    except aiohttp.ClientError as error:
        print(f"Error fetching asset file: {error}")
        raise ApiError("Failed to fetch asset file", status_code=500)
