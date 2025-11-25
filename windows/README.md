# Windows Setup Scripts

This directory contains Windows-specific setup and development scripts for the libthirdspacevest-simhub project.

## Scripts

- **`setup-windows.ps1`** - Initial setup script that installs Node.js, Yarn, and dependencies
- **`dev-windows.ps1`** - Development script that sets up the environment and starts the dev server
- **`dev-env.ps1`** - Quick helper script to set up the environment (can be sourced from web/ directory)

## Quick Start

From the project root directory:

```powershell
# First time setup
.\windows\setup-windows.ps1

# Start development server
.\windows\dev-windows.ps1
```

## Documentation

See [`HOW_TO_RUN_DEV.md`](./HOW_TO_RUN_DEV.md) for detailed instructions and troubleshooting.

