from typing import List

import httpx
from dotenv import load_dotenv
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import time
from collections import deque
load_dotenv()


async def fetch_page(client, urlstring, params, headers, endpoint):
    try:
        response = await client.get(urlstring, params=params, headers=headers, timeout=60)
        if response.status_code == 200:
            data = response.json()["data"]
            return {
                "results": data["results"],
                "next": data["next"],
                "success": True
            }
        elif response.status_code == 404:
            print(f"{response.status_code} {endpoint} either does not exist or cannot be found")
        else:
            print(f"[WARNING:] Cannot fetch data from endpoint {endpoint} ({response.status_code})")
        return {"success": False, "results": [], "next": None}
    except Exception as e:
        print(f"Error fetching page: {e}")
        return {"success": False, "results": [], "next": None}

async def process_batch(client, urlstring, params_list, headers, endpoint):
    tasks = [fetch_page(client, urlstring, params, headers, endpoint) for params in params_list]
    responses = await asyncio.gather(*tasks)
    
    all_results = []
    next_params = []
    
    for response in responses:
        if response["success"]:
            all_results.extend(response["results"])
            if response["next"]:
                next_params.append({"_next": response["next"]})
    
    return all_results, next_params

async def smda_get_request(access_token: str, endpoint: str, params: dict, concurrent_limit=20):
    urlstring = f"https://api.gateway.equinor.com/smda/v2.0/smda-api/{endpoint}?"
    params = params.copy() if params else {}
    params.update({"_items": 10000})
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.SMDA_SUBSCRIPTION_KEY,
    }
    timer = PerfTimer()
    all_results = []

    async with httpx.AsyncClient() as client:
        # Initial request
        first_response = await fetch_page(client, urlstring, params, headers, endpoint)
        if first_response["success"]:
            all_results.extend(first_response["results"])
            next_request = first_response["next"]
        else:
            return all_results

        # Process remaining requests in batches
        params_to_process = [{"_next": next_request}] if next_request else []
        while params_to_process:
            batch = params_to_process[:concurrent_limit]
            params_to_process = params_to_process[concurrent_limit:]
            
            # Add params to each param in batch
            batch_params = [params | next_param for next_param in batch]
            
            batch_results, new_params = await process_batch(
                client, urlstring, batch_params, headers, endpoint
            )
            all_results.extend(batch_results)
            params_to_process.extend(new_params)

    print(f"TIME fetch {endpoint} took {timer.lap_s():.2f} seconds")
    print(f"Total results fetched: {len(all_results)}")
    return all_results