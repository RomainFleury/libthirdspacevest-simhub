"""
Tests for VestControllerRegistry.

These tests verify that the registry can manage multiple vest controllers
and maintain backward compatibility with the main device pattern.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from modern_third_space.server.vest_registry import VestControllerRegistry


class TestVestControllerRegistry:
    """Test suite for VestControllerRegistry."""
    
    def test_init(self):
        """Test registry initialization."""
        registry = VestControllerRegistry()
        assert registry.count() == 0
        assert registry.get_main_device_id() is None
        assert registry.list_devices() == []
    
    def test_generate_device_id(self):
        """Test device ID generation."""
        registry = VestControllerRegistry()
        device_id1 = registry.generate_device_id()
        device_id2 = registry.generate_device_id()
        
        assert device_id1.startswith("device_")
        assert device_id2.startswith("device_")
        assert device_id1 != device_id2
        assert len(device_id1) > 10  # Should have some length
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_add_device_success(self, mock_controller_class):
        """Test adding a device successfully."""
        registry = VestControllerRegistry()
        
        # Mock controller
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5, "serial_number": "TEST123"}
        device_id, controller = registry.add_device(None, device_info)
        
        assert device_id is not None
        assert device_id.startswith("device_")
        assert controller == mock_controller
        assert registry.count() == 1
        assert registry.get_main_device_id() == device_id
        assert registry.has_device(device_id)
        
        # Verify controller was called correctly
        mock_controller_class.assert_called_once()
        mock_controller.connect_to_device.assert_called_once_with(device_info)
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_add_device_with_existing_id(self, mock_controller_class):
        """Test adding a device with a specific device_id."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5}
        custom_id = "custom_device_123"
        device_id, controller = registry.add_device(custom_id, device_info)
        
        assert device_id == custom_id
        assert registry.has_device(custom_id)
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_add_device_connection_failure(self, mock_controller_class):
        """Test adding a device that fails to connect."""
        registry = VestControllerRegistry()
        
        # Mock controller that fails to connect
        mock_controller = Mock()
        mock_status = Mock()
        mock_status.connected = False
        mock_status.last_error = "Device not found"
        mock_controller.status.return_value = mock_status
        mock_controller.connect_to_device.return_value = mock_status
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5}
        
        with pytest.raises(ValueError, match="Failed to connect"):
            registry.add_device(None, device_info)
        
        assert registry.count() == 0
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_add_duplicate_device(self, mock_controller_class):
        """Test adding the same device twice (should return existing)."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5, "serial_number": "TEST123"}
        
        # Add first time
        device_id1, controller1 = registry.add_device(None, device_info)
        
        # Add second time (same device)
        device_id2, controller2 = registry.add_device(None, device_info)
        
        # Should return the same device_id and controller
        assert device_id1 == device_id2
        assert controller1 == controller2
        assert registry.count() == 1  # Still only one device
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_get_controller_main_device(self, mock_controller_class):
        """Test getting main device controller when device_id is None."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5}
        device_id, _ = registry.add_device(None, device_info)
        
        # Get controller without device_id (should get main)
        controller = registry.get_controller()
        assert controller == mock_controller
        
        # Get controller with device_id
        controller2 = registry.get_controller(device_id)
        assert controller2 == mock_controller
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_get_controller_nonexistent(self, mock_controller_class):
        """Test getting controller for non-existent device."""
        registry = VestControllerRegistry()
        
        controller = registry.get_controller("nonexistent_device")
        assert controller is None
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_remove_device(self, mock_controller_class):
        """Test removing a device."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5}
        device_id, _ = registry.add_device(None, device_info)
        
        assert registry.count() == 1
        
        # Remove device
        result = registry.remove_device(device_id)
        assert result is True
        assert registry.count() == 0
        assert not registry.has_device(device_id)
        mock_controller.disconnect.assert_called_once()
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_remove_main_device_sets_new_main(self, mock_controller_class):
        """Test that removing main device sets a new main device."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        # Add two devices
        device_info1 = {"bus": 1, "address": 5}
        device_id1, _ = registry.add_device(None, device_info1)
        
        device_info2 = {"bus": 1, "address": 6}
        device_id2, _ = registry.add_device(None, device_info2)
        
        assert registry.get_main_device_id() == device_id1
        
        # Remove main device
        registry.remove_device(device_id1)
        
        # Should set device_id2 as new main
        assert registry.get_main_device_id() == device_id2
        assert registry.count() == 1
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_set_main_device(self, mock_controller_class):
        """Test setting main device."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        # Add two devices
        device_info1 = {"bus": 1, "address": 5}
        device_id1, _ = registry.add_device(None, device_info1)
        
        device_info2 = {"bus": 1, "address": 6}
        device_id2, _ = registry.add_device(None, device_info2)
        
        assert registry.get_main_device_id() == device_id1
        
        # Set device_id2 as main
        result = registry.set_main_device(device_id2)
        assert result is True
        assert registry.get_main_device_id() == device_id2
    
    def test_set_main_device_nonexistent(self):
        """Test setting non-existent device as main."""
        registry = VestControllerRegistry()
        
        result = registry.set_main_device("nonexistent")
        assert result is False
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_list_devices(self, mock_controller_class):
        """Test listing all devices."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info1 = {"bus": 1, "address": 5, "serial_number": "TEST1"}
        device_id1, _ = registry.add_device(None, device_info1)
        
        device_info2 = {"bus": 1, "address": 6, "serial_number": "TEST2"}
        device_id2, _ = registry.add_device(None, device_info2)
        
        devices = registry.list_devices()
        assert len(devices) == 2
        
        # Check first device
        assert devices[0]["device_id"] == device_id1
        assert devices[0]["is_main"] is True
        assert devices[0]["bus"] == 1
        assert devices[0]["address"] == 5
        
        # Check second device
        assert devices[1]["device_id"] == device_id2
        assert devices[1]["is_main"] is False
    
    @patch('modern_third_space.server.vest_registry.VestController')
    def test_get_device_info(self, mock_controller_class):
        """Test getting device info."""
        registry = VestControllerRegistry()
        
        mock_controller = Mock()
        mock_controller.status.return_value.connected = True
        mock_controller_class.return_value = mock_controller
        
        device_info = {"bus": 1, "address": 5, "serial_number": "TEST123"}
        device_id, _ = registry.add_device(None, device_info)
        
        info = registry.get_device_info(device_id)
        assert info == device_info
    
    def test_get_device_info_nonexistent(self):
        """Test getting info for non-existent device."""
        registry = VestControllerRegistry()
        
        info = registry.get_device_info("nonexistent")
        assert info is None

