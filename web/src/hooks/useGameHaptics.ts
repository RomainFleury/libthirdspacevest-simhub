import { useCallback } from "react";
import { triggerEffect } from "../lib/bridgeApi";
import { VestEffect } from "../types";

export interface GameHapticsOptions {
  device_id?: string;
  player_id?: string;
  game_id?: string;
  player_num?: number;
}

export function useGameHaptics(options?: GameHapticsOptions) {
  const triggerCell = useCallback(
    async (cell: number, speed: number = 5, overrideOptions?: GameHapticsOptions) => {
      const opts = overrideOptions || options;
      console.log(`[useGameHaptics] triggerCell: cell=${cell}, speed=${speed}, opts=`, opts);
      await triggerEffect({ 
        label: `Game Cell ${cell}`, 
        cell, 
        speed,
        ...opts,
      });
    },
    [options]
  );

  const triggerCells = useCallback(
    async (cells: number[], speed: number = 5, overrideOptions?: GameHapticsOptions) => {
      const opts = overrideOptions || options;
      // Trigger all cells simultaneously
      await Promise.all(
        cells.map((cell) =>
          triggerEffect({ 
            label: `Game Cell ${cell}`, 
            cell, 
            speed,
            ...opts,
          })
        )
      );
    },
    [options]
  );

  const triggerPreset = useCallback(
    async (
      preset: "front" | "back" | "all",
      speed: number = 5,
      overrideOptions?: GameHapticsOptions
    ) => {
      const cellMap = {
        front: [2, 5, 3, 4], // Front cells: Upper Left, Upper Right, Lower Left, Lower Right
        back: [1, 6, 0, 7], // Back cells: Upper Left, Upper Right, Lower Left, Lower Right
        all: [0, 1, 2, 3, 4, 5, 6, 7],
      };
      const opts = overrideOptions || options;
      await triggerCells(cellMap[preset], speed, opts);
    },
    [triggerCells, options]
  );

  return {
    triggerCell,
    triggerCells,
    triggerPreset,
  };
}

