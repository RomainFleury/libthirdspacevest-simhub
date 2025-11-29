/**
 * Sound utility for playing audio feedback.
 */

/**
 * Play a short beep sound when an effect is triggered.
 * Uses Web Audio API to generate a simple beep tone.
 */
export function playEffectSound(): void {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the beep
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure beep: short, pleasant tone
    oscillator.frequency.value = 800; // 800 Hz
    oscillator.type = 'sine';
    
    // Envelope: quick attack, short sustain, quick release
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); // Quick release
    
    // Play the beep
    oscillator.start(now);
    oscillator.stop(now + 0.1); // 100ms duration
    
    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Could not play effect sound:', error);
  }
}

/**
 * Storage key for the "play sound on effect" preference.
 */
const SOUND_PREFERENCE_KEY = 'vest_play_sound_on_effect';

/**
 * Get the "play sound on effect" preference from localStorage.
 */
export function getPlaySoundPreference(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Set the "play sound on effect" preference in localStorage.
 */
export function setPlaySoundPreference(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.warn('Could not save sound preference:', error);
  }
}

