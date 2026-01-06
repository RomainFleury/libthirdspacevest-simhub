import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useGameHaptics } from "../../hooks/useGameHaptics";
import { useMultiVest, ConnectedDevice } from "../../hooks/useMultiVest";

interface PlayerState {
  playerNum: number;
  name: string;
  deviceId: string | null;
  lastResult: number | null;
  isHit: boolean;
}

export function MultiRouletteGame() {
  const { devices } = useMultiVest();
  const { triggerPreset } = useGameHaptics();

  const [players, setPlayers] = useState<PlayerState[]>([
    { playerNum: 1, name: "Joueur 1", deviceId: null, lastResult: null, isHit: false },
    { playerNum: 2, name: "Joueur 2", deviceId: null, lastResult: null, isHit: false },
  ]);
  const [rolling, setRolling] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);
  const [hitChance, setHitChance] = useState(20); // 20% chance to get hit

  // Add a new player
  const addPlayer = () => {
    if (players.length >= 8) return;
    const newNum = players.length + 1;
    setPlayers([
      ...players,
      { playerNum: newNum, name: `Joueur ${newNum}`, deviceId: null, lastResult: null, isHit: false },
    ]);
  };

  // Remove a player
  const removePlayer = (playerNum: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((p) => p.playerNum !== playerNum).map((p, i) => ({
      ...p,
      playerNum: i + 1,
    })));
  };

  // Update player name
  const updatePlayerName = (playerNum: number, name: string) => {
    setPlayers(players.map((p) => 
      p.playerNum === playerNum ? { ...p, name } : p
    ));
  };

  // Assign device to player
  const assignDevice = (playerNum: number, deviceId: string | null) => {
    setPlayers(players.map((p) => 
      p.playerNum === playerNum ? { ...p, deviceId } : p
    ));
  };

  // Spin the roulette for all players
  const handleSpin = async () => {
    if (rolling) return;

    setRolling(true);
    setRoundNumber((r) => r + 1);

    // Reset hit states
    setPlayers(players.map((p) => ({ ...p, isHit: false, lastResult: null })));

    // Simulate rolling delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Roll for each player
    const results: PlayerState[] = [];
    const hapticPromises: Promise<void>[] = [];

    for (const player of players) {
      const roll = Math.floor(Math.random() * 100) + 1;
      const isHit = roll <= hitChance;
      
      results.push({
        ...player,
        lastResult: roll,
        isHit,
      });

      // Trigger haptic if player has a device and got hit
      if (player.deviceId && isHit) {
        console.log(`[MultiRoulette] Triggering haptic for player ${player.playerNum} on device_id: ${player.deviceId}`);
        hapticPromises.push(
          triggerPreset("front", 8, { device_id: player.deviceId })
            .catch((err) => console.error(`Haptic error for player ${player.playerNum}:`, err))
        );
      }
    }

    // Update states
    setPlayers(results);

    // Wait for all haptics to fire
    await Promise.all(hapticPromises);

    setRolling(false);
  };

  // Russian roulette mode - one random player gets hit
  const handleRussianRoulette = async () => {
    if (rolling) return;
    if (players.filter((p) => p.deviceId).length === 0) {
      alert("Au moins un joueur doit avoir une veste assignée !");
      return;
    }

    setRolling(true);
    setRoundNumber((r) => r + 1);

    // Reset hit states
    setPlayers(players.map((p) => ({ ...p, isHit: false, lastResult: null })));

    // Dramatic pause
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Pick ONE random player with a device
    const playersWithDevices = players.filter((p) => p.deviceId);
    const victimIndex = Math.floor(Math.random() * playersWithDevices.length);
    const victim = playersWithDevices[victimIndex];

    // Update all players
    const results = players.map((p) => ({
      ...p,
      lastResult: p.playerNum === victim.playerNum ? 1 : 100,
      isHit: p.playerNum === victim.playerNum,
    }));

    setPlayers(results);

    // Trigger haptic for the victim - strong hit!
    if (victim.deviceId) {
      console.log(`[MultiRoulette] Russian roulette hit! Triggering haptic for player ${victim.playerNum} on device_id: ${victim.deviceId}`);
      await triggerPreset("all", 10, { device_id: victim.deviceId })
        .catch((err) => console.error(`Haptic error:`, err));
    }

    setRolling(false);
  };

  // Get available devices (not already assigned)
  const getAvailableDevices = (currentPlayerNum: number): ConnectedDevice[] => {
    const assignedDeviceIds = players
      .filter((p) => p.playerNum !== currentPlayerNum && p.deviceId)
      .map((p) => p.deviceId);
    
    return devices.filter((d) => !assignedDeviceIds.includes(d.device_id));
  };

  const playersWithDevices = players.filter((p) => p.deviceId).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <Link
          to="/mini-games"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
        >
          ← Retour aux Jeux
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          🎰 Roulette Multi-Vestes
        </h1>
        <p className="text-slate-400">
          Jouez à plusieurs ! Chaque joueur peut être assigné à une veste différente.
        </p>
      </header>

      {/* Game Controls */}
      <div className="bg-slate-800/80 rounded-2xl p-6 shadow-lg ring-1 ring-white/5">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={handleSpin}
            disabled={rolling || playersWithDevices === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rolling ? "🎲 En cours..." : "🎲 Lancer la Roulette"}
          </button>

          <button
            onClick={handleRussianRoulette}
            disabled={rolling || playersWithDevices === 0}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rolling ? "💀 En cours..." : "💀 Roulette Russe"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-slate-400 text-sm">Chance de touche:</label>
            <input
              type="range"
              min="5"
              max="100"
              value={hitChance}
              onChange={(e) => setHitChance(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-white font-mono w-12">{hitChance}%</span>
          </div>
        </div>

        {roundNumber > 0 && (
          <div className="text-center text-slate-400 text-sm">
            Round #{roundNumber}
          </div>
        )}
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player) => (
          <PlayerCard
            key={player.playerNum}
            player={player}
            availableDevices={getAvailableDevices(player.playerNum)}
            onNameChange={(name) => updatePlayerName(player.playerNum, name)}
            onDeviceChange={(deviceId) => assignDevice(player.playerNum, deviceId)}
            onRemove={() => removePlayer(player.playerNum)}
            canRemove={players.length > 2}
            rolling={rolling}
          />
        ))}
      </div>

      {/* Add Player Button */}
      {players.length < 8 && (
        <button
          onClick={addPlayer}
          className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
        >
          + Ajouter un joueur
        </button>
      )}

      {/* Info Box */}
      <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
        <p className="font-semibold mb-2">Modes de jeu :</p>
        <ul className="space-y-1 text-left">
          <li>• <span className="text-blue-400">Roulette</span> - Chaque joueur a {hitChance}% de chance d'être touché</li>
          <li>• <span className="text-red-400">Roulette Russe</span> - UN SEUL joueur aléatoire reçoit un choc puissant</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          💡 Assignez une veste à chaque joueur pour qu'il reçoive les effets haptiques.
          Les joueurs sans veste participent mais ne ressentent rien.
        </p>
      </div>
    </div>
  );
}

// Player Card Component
interface PlayerCardProps {
  player: PlayerState;
  availableDevices: ConnectedDevice[];
  onNameChange: (name: string) => void;
  onDeviceChange: (deviceId: string | null) => void;
  onRemove: () => void;
  canRemove: boolean;
  rolling: boolean;
}

function PlayerCard({
  player,
  availableDevices,
  onNameChange,
  onDeviceChange,
  onRemove,
  canRemove,
  rolling,
}: PlayerCardProps) {
  const hasDevice = player.deviceId !== null;
  
  // Get border color based on state
  const getBorderClass = () => {
    if (rolling) return "ring-amber-500/50";
    if (player.isHit) return "ring-red-500 ring-2";
    if (player.lastResult !== null && !player.isHit) return "ring-green-500";
    return "ring-white/5";
  };

  return (
    <div
      className={`bg-slate-800/80 rounded-xl p-4 shadow-lg ring-1 transition-all duration-300 ${getBorderClass()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{hasDevice ? "🎮" : "👤"}</span>
          <input
            type="text"
            value={player.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-transparent text-white font-semibold text-lg border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Retirer le joueur"
          >
            ✕
          </button>
        )}
      </div>

      {/* Device Selector */}
      <div className="mb-3">
        <label className="text-xs text-slate-500 block mb-1">Veste assignée</label>
        <select
          value={player.deviceId || ""}
          onChange={(e) => onDeviceChange(e.target.value || null)}
          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Aucune veste</option>
          {availableDevices.map((device) => (
            <option key={device.device_id} value={device.device_id}>
              {device.is_mock ? "🧪 " : "🦺 "}
              {device.device_id.slice(0, 12)}...
              {device.is_main && " (principale)"}
            </option>
          ))}
          {/* Also show currently assigned device if any */}
          {player.deviceId && !availableDevices.find((d) => d.device_id === player.deviceId) && (
            <option value={player.deviceId}>
              {player.deviceId.slice(0, 12)}... (assignée)
            </option>
          )}
        </select>
      </div>

      {/* Result Display */}
      <div className="text-center py-2">
        {rolling ? (
          <div className="text-4xl animate-bounce">🎲</div>
        ) : player.lastResult !== null ? (
          <div>
            <div
              className={`text-3xl font-bold ${
                player.isHit ? "text-red-400" : "text-green-400"
              }`}
            >
              {player.lastResult}
            </div>
            <div className="text-sm mt-1">
              {player.isHit ? (
                <span className="text-red-400">💥 TOUCHÉ !</span>
              ) : (
                <span className="text-green-400">✓ Safe</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-sm">En attente...</div>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs">
        {hasDevice ? (
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Veste connectée
          </span>
        ) : (
          <span className="text-slate-500">Pas de veste</span>
        )}
      </div>
    </div>
  );
}
