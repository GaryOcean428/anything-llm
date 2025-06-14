#!/bin/bash

# Send a request to the specified URL with timeout
response=$(curl --write-out '%{http_code}' --silent --output /dev/null --max-time 10 --connect-timeout 5 http://localhost:3001/api/ping)

# Check if curl command succeeded
curl_exit_code=$?

# If curl failed, exit with error
if [ $curl_exit_code -ne 0 ]; then
  echo "Health check failed - curl error code: $curl_exit_code"
  exit 1
fi

# If the HTTP response code is 200 (OK), the server is up
if [ "$response" -eq 200 ]; then
  echo "Server is up - HTTP $response"
  exit 0
else
  echo "Server is down - HTTP $response"
  exit 1
fi
