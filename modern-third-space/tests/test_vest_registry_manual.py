"""
Manual test script for VestControllerRegistry.

Run this script to verify the registry works correctly:
    python tests/test_vest_registry_manual.py

This script uses mocks and doesn't require actual hardware.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from unittest.mock import Mock, patch
from modern_third_space.server.vest_registry import VestControllerRegistry


def test_basic_functionality():
    """Test basic registry functionality."""
    print("Testing VestControllerRegistry...")
    
    registry = VestControllerRegistry()
    
    # Test 1: Initial state
    assert registry.count() == 0, "Registry should start empty"
    assert registry.get_main_device_id() is None, "No main device initially"
    print("✓ Initial state correct")
    
    # Test 2: Add device
    with patch('modern_third_space.server.vest_registry.VestController') as MockController:
        mock_controller = Mock()
        mock_status = Mock()
        mock_status.connected = True
        mock_controller.status.return_value = mock_status
        MockController.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5, "serial_number": "TEST123"}
        device_id, controller = registry.add_device(None, device_info)
        
        assert device_id is not None, "Device ID should be generated"
        assert device_id.startswith("device_"), "Device ID should start with 'device_'"
        assert registry.count() == 1, "Should have 1 device"
        assert registry.get_main_device_id() == device_id, "First device should be main"
        assert registry.has_device(device_id), "Should have the device"
        print("✓ Add device works")
    
    # Test 3: Get controller
    controller = registry.get_controller()
    assert controller is not None, "Should get main controller"
    controller2 = registry.get_controller(device_id)
    assert controller2 == controller, "Should get same controller"
    print("✓ Get controller works")
    
    # Test 4: Add second device
    with patch('modern_third_space.server.vest_registry.VestController') as MockController:
        mock_controller2 = Mock()
        mock_status = Mock()
        mock_status.connected = True
        mock_controller2.status.return_value = mock_status
        MockController.return_value = mock_controller2
        
        device_info2 = {"bus": 1, "address": 6, "serial_number": "TEST456"}
        device_id2, controller2 = registry.add_device(None, device_info2)
        
        assert registry.count() == 2, "Should have 2 devices"
        assert registry.get_main_device_id() == device_id, "Main should still be first device"
        assert registry.has_device(device_id2), "Should have second device"
        print("✓ Add second device works")
    
    # Test 5: List devices
    devices = registry.list_devices()
    assert len(devices) == 2, "Should list 2 devices"
    assert devices[0]["is_main"] is True, "First device should be main"
    assert devices[1]["is_main"] is False, "Second device should not be main"
    print("✓ List devices works")
    
    # Test 6: Set main device
    result = registry.set_main_device(device_id2)
    assert result is True, "Should set main device"
    assert registry.get_main_device_id() == device_id2, "Main should be device_id2"
    print("✓ Set main device works")
    
    # Test 7: Remove device
    result = registry.remove_device(device_id)
    assert result is True, "Should remove device"
    assert registry.count() == 1, "Should have 1 device left"
    assert not registry.has_device(device_id), "Device should be removed"
    assert registry.get_main_device_id() == device_id2, "Main should be device_id2 now"
    print("✓ Remove device works")
    
    # Test 8: Get device info
    info = registry.get_device_info(device_id2)
    assert info == device_info2, "Should get correct device info"
    print("✓ Get device info works")
    
    print("\n[OK] All tests passed!")


if __name__ == "__main__":
    try:
        test_basic_functionality()
        print("\n[SUCCESS] VestControllerRegistry is working correctly!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[ERROR] Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

