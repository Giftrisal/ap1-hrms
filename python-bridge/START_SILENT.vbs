Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c python zk_bridge.py --daemon --interval 60", 0, False
