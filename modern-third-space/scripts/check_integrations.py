#!/usr/bin/env python3
"""
Game Integration Consistency Checker

Run this script to verify all game integrations are properly configured
and the test suite passes. This should be run:
- Before creating a PR that touches game integrations
- As part of CI/CD pipeline
- When reviewing PRs

Usage:
    python3 scripts/check_integrations.py

Exit codes:
    0 - All checks passed
    1 - Tests failed or checks failed
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], cwd: Path = None) -> tuple[int, str]:
    """Run a command and return (exit_code, output)."""
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True
    )
    return result.returncode, result.stdout + result.stderr


def main():
    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print("=" * 60)
    print("Game Integration Consistency Checker")
    print("=" * 60)
    print()
    
    errors = []
    warnings = []
    
    # 1. Check if package is installed
    print("[CHECK] Checking package installation...")
    code, output = run_command([sys.executable, "-c", "import modern_third_space"])
    if code != 0:
        print("   [WARN] Package not installed, installing in dev mode...")
        code, output = run_command(
            [sys.executable, "-m", "pip", "install", "-e", "."],
            cwd=project_root
        )
        if code != 0:
            errors.append("Failed to install package")
            print(f"   [ERROR] Installation failed: {output}")
        else:
            print("   [OK] Package installed")
    else:
        print("   [OK] Package already installed")
    
    # 2. Run the game integration tests
    print()
    print("[TEST] Running game integration tests...")
    code, output = run_command(
        [sys.executable, "-m", "pytest", "tests/test_game_integrations.py", "-v", "--tb=short"],
        cwd=project_root
    )
    
    if code != 0:
        errors.append("Game integration tests failed")
        print(output)
        print("   [ERROR] Tests failed!")
    else:
        # Count passed tests
        import re
        passed_match = re.search(r"(\d+) passed", output)
        passed_count = passed_match.group(1) if passed_match else "?"
        
        # Check for warnings
        warning_match = re.search(r"(\d+) warnings?", output)
        if warning_match:
            warnings.append(f"{warning_match.group(1)} test warnings (advisory)")
        
        print(f"   [OK] All {passed_count} tests passed")
    
    # 3. Validate registry
    print()
    print("[VALIDATE] Validating integration registry...")
    try:
        from modern_third_space.integrations.registry import (
            validate_all_integrations,
            GAME_INTEGRATIONS,
        )
        
        validation_errors = validate_all_integrations()
        if validation_errors:
            for game_id, errs in validation_errors.items():
                for err in errs:
                    errors.append(f"{game_id}: {err}")
            print(f"   [ERROR] {len(validation_errors)} integrations have validation errors")
        else:
            print(f"   [OK] All {len(GAME_INTEGRATIONS)} integrations validated")
            
    except ImportError as e:
        errors.append(f"Cannot import registry: {e}")
        print(f"   [ERROR] Import error: {e}")
    
    # 4. Check for snapshot consistency
    print()
    print("[SNAPSHOT] Checking snapshot consistency...")
    try:
        from tests.test_game_integrations import TestIntegrationSnapshot
        
        snapshot = TestIntegrationSnapshot()
        expected = set(snapshot.EXPECTED_INTEGRATIONS.keys())
        actual = set(GAME_INTEGRATIONS.keys())
        
        missing = expected - actual
        extra = actual - expected
        
        if missing:
            errors.append(f"Integrations removed without updating snapshot: {missing}")
            print(f"   [ERROR] Missing from registry: {missing}")
        
        if extra:
            warnings.append(f"New integrations not in snapshot: {extra}")
            print(f"   [WARN] New integrations (need snapshot update): {extra}")
        
        if not missing and not extra:
            print("   [OK] Snapshot consistent")
            
    except Exception as e:
        warnings.append(f"Could not check snapshot: {e}")
        print(f"   [WARN] Snapshot check skipped: {e}")
    
    # Summary
    print()
    print("=" * 60)
    if errors:
        print("[FAILED] Issues found:")
        for err in errors:
            print(f"   • {err}")
        print()
        print("Please fix these issues before creating/merging a PR.")
        sys.exit(1)
    else:
        print("[PASSED] All checks passed!")
        if warnings:
            print()
            print("[WARN] Warnings (advisory):")
            for warn in warnings:
                print(f"   • {warn}")
        sys.exit(0)


if __name__ == "__main__":
    main()
