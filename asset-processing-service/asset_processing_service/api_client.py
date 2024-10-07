
from typing import Any, Dict, List
import aiohttp
from asset_processing_service.config import HEADERS, config
from asset_processing_service.models import AssetProcessingJob
from datetime import datetime



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
        
