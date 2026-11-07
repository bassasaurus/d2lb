"""Drop the first flight-sync acknowledgment in the disposable test API."""
import json
import os
from pathlib import Path
from threading import Lock

from django.http import HttpResponse


class DropFlightSyncAcknowledgment:
    def __init__(self, get_response):
        self.get_response = get_response
        self.trace = Path(os.environ['D2LB_FLIGHT_SYNC_TRACE'])
        self.lock = Lock()
        self.dropped = False

    def __call__(self, request):
        response = self.get_response(request)
        if (request.method != 'POST' or request.path != '/api/mobile/flight-sync/'
                or response.status_code != 200):
            return response

        # Django has committed the operation by the time its response reaches here.
        result = json.loads(response.content)
        with self.lock:
            first_response = not self.dropped
            with self.trace.open('a') as trace:
                trace.write(json.dumps({
                    'dropped': first_response,
                    'operation_id': result['operation_id'],
                    'flight_id': result['flight']['id'],
                }) + '\n')
            self.dropped = True

        if first_response:
            # End the HTTP connection before delivering any of the promised body.
            return HttpResponse(headers={
                'Content-Type': 'application/json',
                'Content-Length': str(len(response.content)),
            })
        return response
