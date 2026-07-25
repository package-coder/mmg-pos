#!/usr/bin/env python3
"""
WebSocket test script for pos-helper-app
Tests the WebSocket connection and API responses
"""

import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:9999"

    print("=" * 60)
    print("POS Helper App - WebSocket API Test")
    print("=" * 60)
    print(f"Connecting to: {uri}\n")

    try:
        async with websockets.connect(uri) as websocket:
            print("[OK] Connected to WebSocket server\n")

            # Test 1: Get terminal info
            print("TEST 1: Get Terminal Info")
            print("-" * 60)
            test_msg = {
                "device": "terminal",
                "device_type": "info"
            }
            print(f"Sending: {json.dumps(test_msg, indent=2)}")
            await websocket.send(json.dumps(test_msg))

            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            print(f"Response: {json.dumps(response_data, indent=2)}\n")

            # Test 2: Test print
            print("TEST 2: Test Print")
            print("-" * 60)
            test_msg = {
                "device": "printer",
                "device_type": "test",
                "message": "TEST PRINT",
                "settings": {"url": "192.168.192.168"}
            }
            print(f"Sending: {json.dumps(test_msg, indent=2)}")
            await websocket.send(json.dumps(test_msg))

            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            print(f"Response: {json.dumps(response_data, indent=2)}\n")

            # Test 3: Invalid request
            print("TEST 3: Invalid Request (should get error)")
            print("-" * 60)
            test_msg = {
                "device": "invalid",
                "device_type": "invalid"
            }
            print(f"Sending: {json.dumps(test_msg, indent=2)}")
            await websocket.send(json.dumps(test_msg))

            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            print(f"Response: {json.dumps(response_data, indent=2)}\n")

            print("=" * 60)
            print("[OK] All tests completed successfully!")
            print("=" * 60)

    except ConnectionRefusedError:
        print("[ERROR] Could not connect to WebSocket server")
        print("Make sure the helper app is running on ws://localhost:9999")
        print("\nTo start the helper app, run:")
        print("  cd pos-helper-app")
        print("  .venv\\Scripts\\Activate.ps1")
        print("  cd helper")
        print("  python app.py")
    except asyncio.TimeoutError:
        print("[ERROR] Timeout waiting for response")
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
