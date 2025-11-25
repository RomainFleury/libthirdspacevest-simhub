"""
Daemon lifecycle management - PID file handling and process control.

This module provides utilities for:
- Tracking daemon process via PID file
- Checking if daemon is running
- Stopping a running daemon
- Checking if port is in use
"""

from __future__ import annotations

import os
import signal
import socket
import sys
import tempfile
from pathlib import Path
from typing import Optional, Tuple

# Default locations
DEFAULT_PORT = 5050
DEFAULT_HOST = "127.0.0.1"


def get_pid_file_path(port: int = DEFAULT_PORT) -> Path:
    """
    Get the path to the PID file for a daemon on the given port.
    
    Uses a temp directory so it's cleaned up on reboot.
    """
    temp_dir = Path(tempfile.gettempdir())
    return temp_dir / f"vest-daemon-{port}.pid"


def write_pid_file(port: int = DEFAULT_PORT) -> Path:
    """
    Write the current process PID to the PID file.
    
    Returns the path to the PID file.
    """
    pid_file = get_pid_file_path(port)
    pid_file.write_text(str(os.getpid()))
    return pid_file


def read_pid_file(port: int = DEFAULT_PORT) -> Optional[int]:
    """
    Read the PID from the PID file.
    
    Returns None if file doesn't exist or is invalid.
    """
    pid_file = get_pid_file_path(port)
    if not pid_file.exists():
        return None
    
    try:
        pid_str = pid_file.read_text().strip()
        return int(pid_str)
    except (ValueError, OSError):
        return None


def remove_pid_file(port: int = DEFAULT_PORT) -> None:
    """
    Remove the PID file.
    """
    pid_file = get_pid_file_path(port)
    try:
        pid_file.unlink(missing_ok=True)
    except OSError:
        pass


def is_process_running(pid: int) -> bool:
    """
    Check if a process with the given PID is running.
    """
    if pid <= 0:
        return False
    
    try:
        # Send signal 0 - doesn't kill, just checks if process exists
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # Process exists but we don't have permission
        return True


def is_port_in_use(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> bool:
    """
    Check if the given port is in use.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        sock.connect((host, port))
        sock.close()
        return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        return False


def get_daemon_status(
    host: str = DEFAULT_HOST, port: int = DEFAULT_PORT
) -> Tuple[bool, Optional[int], str]:
    """
    Get the status of the daemon.
    
    Returns:
        Tuple of (is_running, pid, message)
    """
    pid = read_pid_file(port)
    port_in_use = is_port_in_use(host, port)
    
    if pid is not None and is_process_running(pid):
        if port_in_use:
            return (True, pid, f"Daemon running (PID {pid}) on {host}:{port}")
        else:
            # Process exists but port not in use - stale PID file?
            return (False, pid, f"PID file exists ({pid}) but daemon not responding")
    
    if port_in_use:
        # Something else is using the port
        return (False, None, f"Port {port} is in use by another process")
    
    # Clean up stale PID file if it exists
    if pid is not None:
        remove_pid_file(port)
    
    return (False, None, "Daemon not running")


def stop_daemon(
    host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, force: bool = False
) -> Tuple[bool, str]:
    """
    Stop a running daemon.
    
    Args:
        host: Daemon host
        port: Daemon port
        force: If True, use SIGKILL instead of SIGTERM
    
    Returns:
        Tuple of (success, message)
    """
    is_running, pid, status_msg = get_daemon_status(host, port)
    
    if not is_running:
        if pid is not None:
            # Clean up stale PID file
            remove_pid_file(port)
            return (True, "Cleaned up stale PID file")
        return (False, "Daemon is not running")
    
    if pid is None:
        return (False, "Cannot stop: PID unknown")
    
    try:
        sig = signal.SIGKILL if force else signal.SIGTERM
        os.kill(pid, sig)
        
        # Wait a moment for process to exit
        import time
        for _ in range(10):
            time.sleep(0.1)
            if not is_process_running(pid):
                remove_pid_file(port)
                return (True, f"Daemon stopped (PID {pid})")
        
        if force:
            remove_pid_file(port)
            return (False, f"Sent SIGKILL to PID {pid} but process may still be running")
        else:
            return (False, f"Sent SIGTERM to PID {pid} - process still running. Try --force")
            
    except ProcessLookupError:
        remove_pid_file(port)
        return (True, "Daemon already stopped")
    except PermissionError:
        return (False, f"Permission denied to stop PID {pid}")


def ping_daemon(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> Tuple[bool, dict]:
    """
    Ping the daemon to check if it's responsive.
    
    Returns:
        Tuple of (success, response_dict)
    """
    import json
    import time
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    
    try:
        sock.connect((host, port))
        
        # Send ping command
        sock.sendall(b'{"cmd": "ping"}\n')
        
        # Read responses (may have multiple lines - client_connected event + ping response)
        response = b""
        start_time = time.time()
        while time.time() - start_time < 3:  # 3 second timeout
            try:
                sock.settimeout(0.5)
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response += chunk
                
                # Check if we have the ping response
                lines = response.decode().strip().split("\n")
                for line in lines:
                    try:
                        data = json.loads(line)
                        if data.get("response") == "ping":
                            sock.close()
                            return (True, data)
                    except json.JSONDecodeError:
                        continue
            except socket.timeout:
                continue
        
        sock.close()
        return (False, {"error": "No ping response received"})
        
    except (ConnectionRefusedError, socket.timeout, OSError) as e:
        return (False, {"error": str(e)})
    finally:
        try:
            sock.close()
        except Exception:
            pass

