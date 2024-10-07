import asyncio
from time import sleep

from asset_processing_service.api_client import fetch_jobs, update_job_details
from asset_processing_service.config import config

async def job_fetcher(job_queue: asyncio.Queue, jobs_pending_or_in_progress: set):
    while True:
        print("Fetching jobs...")
        jobs = await fetch_jobs()
        sleep(5)

async def async_main():
    job_queue = asyncio.Queue()
    jobs_pending_or_in_progress = set()

    job_fetcher_task = asyncio.create_task(job_fetcher(job_queue, jobs_pending_or_in_progress))


    await asyncio.gather(job_fetcher_task)

def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
