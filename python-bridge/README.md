# ZKTeco Biometric LAN/TCP Bridge for Goinfi-HR

This bridge connects to your office ZKTeco biometric machine (e.g. K40, UFace, IN01, etc.) over the local office network (Ethernet / WiFi LAN) and automatically synchronizes punch records with the Goinfi-HR web dashboard.

---

## 1. Physical Machine Network Setup
1. Connect the ZKTeco machine to your office router or network switch using an Ethernet (RJ45) cable or configure Wi-Fi in the machine menu.
2. In the machine's physical menu, go to:
   - **Comm. (Communication)** -> **Ethernet**
   - Set **IP Address** (e.g., `192.168.1.201`)
   - Set **Subnet Mask** (usually `255.255.255.0`)
   - Set **Gateway** (e.g., `192.168.1.1`)
   - Ensure **TCP Port** is set to `4370` (default)
3. On an office PC connected to the same Wi-Fi/LAN, test if the machine responds:
   ```cmd
   ping 192.168.1.201
   ```

---

## 2. Quick Start
1. Install Python 3.9+ if not already installed.
2. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
3. Test connectivity to the machine:
   ```cmd
   python zk_bridge.py --ip 192.168.1.201 --test-connection
   ```
4. Run a single sync:
   ```cmd
   python zk_bridge.py --ip 192.168.1.201 --sync-now
   ```
5. Run 24/7 background sync every 5 minutes:
   ```cmd
   run_bridge.bat
   ```
   Or:
   ```cmd
   python zk_bridge.py --daemon --interval 300
   ```

---

## 3. Running Without Machine (Simulator Mode)
If you are developing or testing without the physical machine:
```cmd
python zk_simulator.py
```
This generates realistic punch-in/out records for 32 staff members and sends them to your running Goinfi-HR server.

---

## 4. Automatic Startup on Windows (Windows Task Scheduler)
To start this bridge automatically when the office computer boots:
1. Press `Win + R`, type `taskschd.msc`, and press Enter.
2. Click **Create Task** (Name: `GoinfiBiometricBridge`).
3. Under **Triggers**, select **At log on** or **At startup**.
4. Under **Actions**, choose **Start a program**:
   - Program: `cmd.exe`
   - Arguments: `/c "D:\Goinfi All Files\Main Files\goinfi-hr\python-bridge\run_bridge.bat"`
5. Click **OK**.
