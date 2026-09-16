#!/usr/bin/env python3
"""
==============================================================================
GOINFI-HR: Biometric Machine Punch Simulator
==============================================================================
Description:
    Generates realistic check-in and check-out punches for 32 staff members
    for today's date and posts them to Goinfi-HR API.
    Use this for development, demonstrations, or when the physical machine is off.
"""

import os
import random
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

load_dotenv()

API_ENDPOINT = os.getenv("HR_API_URL", "http://localhost:3000/api/biometric/sync")
API_SECRET = os.getenv("BIOMETRIC_API_SECRET", "goinfi_secure_zk_secret_2026")

# Pins 101 to 132 for staff
STAFF_PINS = [str(i) for i in range(101, 133)]

def generate_sample_punches(target_date=None):
    if target_date is None:
        target_date = datetime.now().date()

    print(f"Generating realistic punches for {len(STAFF_PINS)} staff members for {target_date}...")
    logs = []

    # 1. On time staff (PINS 101 to 122) - Punch in 8:45 AM to 9:14 AM
    for pin in STAFF_PINS[:22]:
        in_hour = 8
        in_min = random.randint(45, 59)
        if random.random() > 0.5:
            in_hour = 9
            in_min = random.randint(0, 14)
        
        in_time = datetime(target_date.year, target_date.month, target_date.day, in_hour, in_min, random.randint(0, 59))
        out_time = in_time + timedelta(hours=8, minutes=random.randint(5, 45))

        logs.append({
            "biometric_pin": pin,
            "punch_time": in_time.isoformat(),
            "punch_type": 0,
            "verify_type": 1,
            "device_ip": "192.168.1.201"
        })
        # If today has passed shift end, also add out punch
        if datetime.now() > out_time:
            logs.append({
                "biometric_pin": pin,
                "punch_time": out_time.isoformat(),
                "punch_type": 1,
                "verify_type": 1,
                "device_ip": "192.168.1.201"
            })

    # 2. Late arrivals (PINS 123 to 127) - Punch in 9:25 AM to 9:55 AM
    for pin in STAFF_PINS[22:27]:
        in_time = datetime(target_date.year, target_date.month, target_date.day, 9, random.randint(25, 55), random.randint(0, 59))
        logs.append({
            "biometric_pin": pin,
            "punch_time": in_time.isoformat(),
            "punch_type": 0,
            "verify_type": 1,
            "device_ip": "192.168.1.201"
        })

    # 3. Half day / extreme late (PIN 128) - Punch in 11:30 AM
    logs.append({
        "biometric_pin": STAFF_PINS[27],
        "punch_time": datetime(target_date.year, target_date.month, target_date.day, 11, 30, 0).isoformat(),
        "punch_type": 0,
        "verify_type": 1,
        "device_ip": "192.168.1.201"
    })

    # 4. Absent / No punch: PINS 129, 130, 131, 132 (simulate absent or on leave)
    print(f"Generated {len(logs)} simulated punches.")
    return logs

def send_punches_to_api(logs):
    headers = {
        "Content-Type": "application/json",
        "x-biometric-secret": API_SECRET
    }
    payload = {
        "logs": logs,
        "device_ip": "192.168.1.201 (Simulator)"
    }
    try:
        print(f"Sending payload to {API_ENDPOINT}...")
        res = requests.post(API_ENDPOINT, json=payload, headers=headers, timeout=15)
        if res.status_code == 200:
            print("Successfully synced simulated attendance logs!")
            print(f"Response: {res.json()}")
        else:
            print(f"Error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Failed to post to API: {e}")

if __name__ == "__main__":
    punches = generate_sample_punches()
    send_punches_to_api(punches)
