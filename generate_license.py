#!/usr/bin/env python3
"""
==============================================================================
GOINFI LABS: Enterprise Cryptographic License Key Generator
==============================================================================
Use this tool to generate official license keys for AP1 HRMS or any client.
"""

import hmac
import hashlib
import time
import sys

MASTER_SECRET = "GOINFI_ENTERPRISE_HRMS_LICENSE_SALT_2026_AP1"

TIERS = {
    "1": ("1_DAY", "1D", 1, "1 Day Trial (परीक्षण)"),
    "2": ("1_WEEK", "1W", 7, "1 Week Demo (१ हप्ता)"),
    "3": ("1_MONTH", "1M", 30, "1 Month Subscription (१ महिना)"),
    "4": ("6_MONTHS", "6M", 180, "6 Months Semi-Annual (६ महिना)"),
    "5": ("1_YEAR", "1Y", 365, "1 Year Annual License (१ वर्ष)"),
    "6": ("2_YEARS", "2Y", 730, "2 Years Enterprise (२ वर्ष)"),
    "7": ("5_YEARS", "5Y", 1825, "5 Years Long-Term (५ वर्ष)")
}

def generate_key(client_code="AP1", tier_choice="3"):
    if tier_choice not in TIERS:
        tier_choice = "3"
    
    tier_name, tier_code, days, label = TIERS[tier_choice]
    sanitized_client = client_code.strip().upper()[:5] or "AP1"
    
    now_sec = int(time.time())
    issued_hex = f"{now_sec & 0xFFFF:04X}"
    
    raw_data = f"{sanitized_client}|{tier_code}|{issued_hex}|{days}"
    sig = hmac.new(MASTER_SECRET.encode('utf-8'), raw_data.encode('utf-8'), hashlib.sha256).hexdigest().upper()
    
    sig1 = sig[0:4]
    sig2 = sig[4:8]
    sig3 = sig[8:12]
    
    key = f"GFHR-{sanitized_client}-{tier_code}-{issued_hex}-{sig1}-{sig2}-{sig3}"
    return key, tier_name, days, label

if __name__ == "__main__":
    print("=" * 65)
    print("      GOINFI LABS: OFFICIAL LICENSE KEY GENERATOR")
    print("=" * 65)
    print("\nSelect Client:")
    client = input("Client Code [Press Enter for AP1]: ").strip() or "AP1"
    
    print("\nSelect Duration Tier:")
    for num, (name, code, days, label) in TIERS.items():
        print(f"  [{num}] {label} - {days} Days")
    
    choice = input("\nChoice (1-5) [Default 3 = 1 Year]: ").strip() or "3"
    
    key, tier_name, days, label = generate_key(client, choice)
    
    print("\n" + "=" * 65)
    print(f"  CLIENT:       {client}")
    print(f"  PLAN:         {label} ({days} Days)")
    print(f"  LICENSE KEY:  {key}")
    print("=" * 65)
    print("\nCopy this key and provide it to the client (AP1 HRMS)!")
    input("\nPress Enter to exit...")
