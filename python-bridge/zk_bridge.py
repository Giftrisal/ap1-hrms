#!/usr/bin/env python3
"""
==============================================================================
GOINFI-HR: ZKTeco Biometric Machine LAN/TCP Bridge
==============================================================================
Author: Goinfi Technologies
Description: 
    Connects to ZKTeco biometric machine via TCP/IP port 4370 using pyzk.
    Fetches real-time attendance punches and syncs them directly to the
    Goinfi-HR Web API / Supabase database.

Usage:
    python zk_bridge.py --help
    python zk_bridge.py --sync-now
    python zk_bridge.py --daemon --interval 300
    python zk_bridge.py --test-connection
"""

import os
import sys
import time
import argparse
import logging
from datetime import datetime
import requests
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("ZKTecoBridge")

# Configuration (from .env or Defaults)
DEFAULT_DEVICE_IP = os.getenv("ZK_DEVICE_IP", "192.168.1.201")
DEFAULT_DEVICE_PORT = int(os.getenv("ZK_DEVICE_PORT", 4370))
API_ENDPOINT = os.getenv("HR_API_URL", "http://localhost:3000/api/biometric/sync")
API_SECRET = os.getenv("BIOMETRIC_API_SECRET", "goinfi_secure_zk_secret_2026")
DEFAULT_INTERVAL = int(os.getenv("ZK_SYNC_INTERVAL", 300)) # 5 minutes

def test_machine_connection(ip, port):
    """Test connection to ZKTeco biometric machine"""
    logger.info(f"Attempting connection to ZKTeco machine at {ip}:{port}...")
    try:
        from zk import ZK
        zk = ZK(ip, port=port, timeout=5, password=0, force_udp=False, verbose=False)
        conn = zk.connect()
        logger.info("Connection SUCCESSFUL!")
        try:
            device_name = conn.get_device_name()
            serial_number = conn.get_serialnumber()
            firmware_version = conn.get_firmware_version()
            users_count = len(conn.get_users())
            records_count = len(conn.get_attendance())
            logger.info(f"  Device Name: {device_name}")
            logger.info(f"  Serial Number: {serial_number}")
            logger.info(f"  Firmware: {firmware_version}")
            logger.info(f"  Registered Users: {users_count}")
            logger.info(f"  Attendance Records in Machine: {records_count}")
        except Exception as e:
            logger.warning(f"Connected, but failed reading extended stats: {e}")
        finally:
            conn.disconnect()
            logger.info("Disconnected cleanly.")
        return True
    except ImportError:
        logger.error("`pyzk` library is not installed. Please run: pip install pyzk")
        return False
    except Exception as e:
        logger.error(f"Failed to connect to machine at {ip}:{port}: {e}")
        logger.info("Tip: Ensure the device is powered on, connected to the same LAN, and port 4370 is open.")
        return False

def pull_and_sync_attendance(ip, port, api_url, api_secret):
    """Pull logs from device and send to Goinfi-HR API"""
    logger.info(f"Initiating attendance pull from {ip}:{port}...")
    try:
        from zk import ZK
        zk = ZK(ip, port=port, timeout=8, password=0, force_udp=False, verbose=False)
        conn = zk.connect()
        conn.disable_device() # Temporarily disable to prevent state change during sync

        try:
            attendance_records = conn.get_attendance()
            logger.info(f"Retrieved {len(attendance_records)} total records from machine.")
            
            if not attendance_records:
                logger.info("No attendance records to sync.")
                return True

            # Prepare payload for Next.js API
            payload = []
            for record in attendance_records:
                payload.append({
                    "biometric_pin": str(record.user_id),
                    "punch_time": record.timestamp.isoformat(),
                    "punch_type": record.punch, # 0=CheckIn, 1=CheckOut
                    "verify_type": record.status,
                    "device_ip": ip
                })

            logger.info(f"Pushing {len(payload)} punch logs to Goinfi-HR API: {api_url}...")
            headers = {
                "Content-Type": "application/json",
                "x-biometric-secret": api_secret
            }

            response = requests.post(api_url, json={"logs": payload, "device_ip": ip}, headers=headers, timeout=20)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Sync complete! Processed: {result.get('processed_count', len(payload))}, New: {result.get('inserted_count', 0)}")
                return True
            else:
                logger.error(f"API rejected punch payload with status {response.status_code}: {response.text}")
                return False

        finally:
            conn.enable_device()
            conn.disconnect()
            logger.info("Device re-enabled and connection closed.")

    except ImportError:
        logger.error("`pyzk` library is not installed. Please install via: pip install pyzk requests")
        return False
    except Exception as e:
        logger.error(f"Error during attendance pull & sync: {e}")
        return False

def run_daemon(ip, port, api_url, api_secret, interval):
    """Run continuously in the background syncing every interval seconds"""
    logger.info(f"==================================================")
    logger.info(f"Starting Goinfi-HR Biometric Daemon")
    logger.info(f"  Device: {ip}:{port}")
    logger.info(f"  Target API: {api_url}")
    logger.info(f"  Sync Interval: {interval} seconds ({interval // 60} mins)")
    logger.info(f"==================================================")

    while True:
        try:
            logger.info("Running scheduled sync cycle...")
            pull_and_sync_attendance(ip, port, api_url, api_secret)
        except Exception as e:
            logger.error(f"Unexpected error in daemon cycle: {e}")

        logger.info(f"Sleeping for {interval} seconds until next sync...")
        time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Goinfi-HR ZKTeco Biometric Machine Bridge")
    parser.add_argument("--ip", default=DEFAULT_DEVICE_IP, help=f"Machine LAN IP address (default: {DEFAULT_DEVICE_IP})")
    parser.add_argument("--port", type=int, default=DEFAULT_DEVICE_PORT, help=f"Machine TCP port (default: {DEFAULT_DEVICE_PORT})")
    parser.add_argument("--api-url", default=API_ENDPOINT, help="Goinfi-HR API URL")
    parser.add_argument("--secret", default=API_SECRET, help="Biometric API Secret Key")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Sync interval in seconds (daemon mode)")
    parser.add_argument("--test-connection", action="store_true", help="Test connection to machine and exit")
    parser.add_argument("--sync-now", action="store_true", help="Pull logs immediately once and exit")
    parser.add_argument("--daemon", action="store_true", help="Run in continuous background sync mode")

    args = parser.parse_args()

    if args.test_connection:
        test_machine_connection(args.ip, args.port)
    elif args.sync_now:
        pull_and_sync_attendance(args.ip, args.port, args.api_url, args.secret)
    elif args.daemon:
        run_daemon(args.ip, args.port, args.api_url, args.secret, args.interval)
    else:
        # Default behavior if no flags: prompt and run sync once
        logger.info("No flags provided. Defaulting to single sync. Use --daemon for 24/7 background sync.")
        pull_and_sync_attendance(args.ip, args.port, args.api_url, args.secret)

if __name__ == "__main__":
    main()
