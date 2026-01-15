#!/usr/bin/env python3
"""
Entry point for PyInstaller-built vest-daemon executable.

This script is used as the entry point when building the daemon executable
with PyInstaller. It parses command line arguments and starts the daemon.

Usage:
    vest-daemon.exe daemon --port 5050
    vest-daemon.exe daemon start --port 5050
    vest-daemon.exe daemon stop
    vest-daemon.exe daemon status
"""

import sys
from modern_third_space.cli import main

if __name__ == "__main__":
    # The CLI's main function handles all argument parsing
    # It will route "daemon" commands to the appropriate handler
    sys.exit(main())
