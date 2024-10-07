import asyncio
from time import sleep

from asset_processing_service.api_client import fetch_jobs, update_job_details
from asset_processing_service.config import config

async def job_fetcher(job_queue: asyncio.Queue, jobs_pending_or_in_progress: set):
    while True:
        print("Fetching jobs...")
        jobs = await fetch_jobs()

        for job in jobs:
            current_time = asyncio.get_running_loop().time()            
            if job.status == "in_progress":
                last_heartbeat_time = job.lastHeartBeat.timestamp()
                time_since_last_heartbeat = abs(current_time - last_heartbeat_time)
                print(f"Time since last heartbeat for job {job.id}: {time_since_last_heartbeat}")

                if time_since_last_heartbeat > config.STUCK_JOB_THRESHOLD_SECONDS:
                    print(f"Job {job.id} is stuck. Failing job.")
                    await update_job_details(job.id, {
                        "status": "failed",
                        "errorMessage": "Job is stuck - no heartbeat received recently",
                        "attempts": job.attempts + 1
                    })
                    if job.id in jobs_pending_or_in_progress:
                        jobs_pending_or_in_progress.remove(job.id)
            
            elif job.status in ["created", "failed"]:
                if job.attempts >= config.MAX_JOB_ATTEMPTS:
                    print(f"Job {job.id} has exceeded max attempts. Failing job.")
                    await update_job_details(job.id, {
                        "status": "max_attempts_exceeded",
                        "errorMessage": "Max attempts exceeded"
                    })

                elif job.id not in jobs_pending_or_in_progress:
                    print("Adding job to queue: ", job.id)
                    jobs_pending_or_in_progress.add(job.id)
                    await job_queue.put(job)

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
