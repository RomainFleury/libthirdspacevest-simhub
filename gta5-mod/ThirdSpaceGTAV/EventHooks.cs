using System;
using System.Collections.Generic;
using GTA;
using GTA.Native;

namespace ThirdSpaceGTAV
{
    /// <summary>
    /// Event hooks for detecting player damage, death, and other game events.
    /// </summary>
    public class EventHooks
    {
        private readonly DaemonClient _daemon;
        private Ped _player;
        private float _lastHealth;
        private bool _wasDead;
        private Vector3 _lastDamagePosition;

        public EventHooks(DaemonClient daemon)
        {
            _daemon = daemon;
        }

        /// <summary>
        /// Initialize hooks - call this in the main script's tick loop.
        /// </summary>
        public void Initialize()
        {
            _player = Game.Player.Character;
            if (_player != null)
            {
                _lastHealth = _player.Health;
                _wasDead = _player.IsDead;
            }
        }

        /// <summary>
        /// Update hooks - call this every frame in the main script's tick loop.
        /// </summary>
        public void Update()
        {
            if (_player == null || !_player.Exists())
            {
                _player = Game.Player.Character;
                if (_player == null) return;
                Initialize();
                return;
            }

            // Check for player death
            if (_player.IsDead && !_wasDead)
            {
                OnPlayerDeath();
                _wasDead = true;
            }
            else if (!_player.IsDead)
            {
                _wasDead = false;
            }

            // Check for damage (health decrease)
            float currentHealth = _player.Health;
            if (currentHealth < _lastHealth && !_player.IsDead)
            {
                float damage = _lastHealth - currentHealth;
                OnPlayerDamage(damage);
            }
            _lastHealth = currentHealth;
        }

        /// <summary>
        /// Handle player taking damage.
        /// </summary>
        private void OnPlayerDamage(float damageAmount)
        {
            if (!_daemon.IsConnected) return;

            // Try to get damage source position
            Vector3 damageSource = GetDamageSourcePosition();
            float angle = CalculateAngleToSource(damageSource);

            var parameters = new Dictionary<string, object>
            {
                { "angle", angle },
                { "damage", damageAmount },
                { "health_remaining", _player.Health }
            };

            _daemon.SendEvent("player_damage", parameters);
        }

        /// <summary>
        /// Handle player death.
        /// </summary>
        private void OnPlayerDeath()
        {
            if (!_daemon.IsConnected) return;

            var parameters = new Dictionary<string, object>
            {
                { "cause", "unknown" } // Could be enhanced to detect cause
            };

            _daemon.SendEvent("player_death", parameters);
        }

        /// <summary>
        /// Try to get the position of the damage source.
        /// This is a simplified version - GTA V doesn't directly provide this.
        /// </summary>
        private Vector3 GetDamageSourcePosition()
        {
            // Try to get last attacker
            Ped attacker = _player.GetLastAttacker();
            if (attacker != null && attacker.Exists())
            {
                return attacker.Position;
            }

            // Fallback: use player's forward direction (not ideal, but better than nothing)
            return _player.Position + _player.ForwardVector * 5.0f;
        }

        /// <summary>
        /// Calculate angle from player to damage source.
        /// Returns angle in degrees (0 = front, 90 = right, 180 = back, 270 = left).
        /// </summary>
        private float CalculateAngleToSource(Vector3 sourcePosition)
        {
            Vector3 playerPos = _player.Position;
            Vector3 playerForward = _player.ForwardVector;
            
            // Vector from player to damage source
            Vector3 toSource = (sourcePosition - playerPos);
            toSource.Normalize();

            // Calculate angle using dot product
            float dot = Vector3.Dot(playerForward, toSource);
            float angle = (float)(Math.Acos(Math.Max(-1, Math.Min(1, dot))) * 180.0 / Math.PI);

            // Determine if source is to the left or right
            Vector3 right = Vector3.Cross(playerForward, new Vector3(0, 0, 1));
            float rightDot = Vector3.Dot(right, toSource);
            
            if (rightDot < 0)
                angle = 360 - angle;

            return angle;
        }
    }
}

