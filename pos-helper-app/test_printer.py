#!/usr/bin/env python3
"""
Simple printer test script for MMG POS Helper
Tests if printer is reachable and can print
"""

import asyncio
import websockets
import json
import sys

async def test_printer():
    """Send a test print job to the helper"""

    uri = "ws://localhost:9876"

    print("Testing MMG POS Printer Connection")
    print("=" * 50)
    print(f"Connecting to: {uri}")
    print()

    try:
        async with websockets.connect(uri) as ws:
            print("[OK] Connected to helper")
            print()

            # Test message: simple receipt print
            test_message = {
                "device": "printer",
                "device_type": "test",
                "settings": {
                    "url": "192.168.192.168",  # Default printer IP
                    "port": 9100
                }
            }

            print("Sending test print message...")
            print(f"Message: {json.dumps(test_message, indent=2)}")
            print()

            await ws.send(json.dumps(test_message))

            # Wait for response
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=5.0)
                response_data = json.loads(response)

                print("[RESPONSE]")
                print(json.dumps(response_data, indent=2))
                print()

                if response_data.get("success"):
                    print("[OK] Printer test successful!")
                    if "message" in response_data:
                        print(f"Message: {response_data['message']}")
                else:
                    print("[ERROR] Printer test failed")
                    if "message" in response_data:
                        print(f"Error: {response_data['message']}")

            except asyncio.TimeoutError:
                print("[WARNING] No response from helper (timeout)")
                print("Helper may still be processing the print job")

    except ConnectionRefusedError:
        print("[ERROR] Could not connect to helper")
        print(f"Make sure mmg-helper.exe is running and listening on {uri}")
        print()
        print("To start the helper:")
        print("  1. Run: C:\\MMG-POS\\mmg-helper.exe")
        print("  2. Or double-click: mmg-helper.exe")
        sys.exit(1)

    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_printer())
