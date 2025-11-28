import { useCallback } from "react";
import { triggerEffect } from "../lib/bridgeApi";
import { VestEffect } from "../types";

export function useGameHaptics() {
  const triggerCell = useCallback(
    async (cell: number, speed: number = 5) => {
      await triggerEffect({ label: `Game Cell ${cell}`, cell, speed });
    },
    []
  );

  const triggerCells = useCallback(
    async (cells: number[], speed: number = 5) => {
      // Trigger all cells simultaneously
      await Promise.all(
        cells.map((cell) =>
          triggerEffect({ label: `Game Cell ${cell}`, cell, speed })
        )
      );
    },
    []
  );

  const triggerPreset = useCallback(
    async (
      preset: "front" | "back" | "all",
      speed: number = 5
    ) => {
      const cellMap = {
        front: [2, 5, 3, 4], // Front cells: Upper Left, Upper Right, Lower Left, Lower Right
        back: [1, 6, 0, 7], // Back cells: Upper Left, Upper Right, Lower Left, Lower Right
        all: [0, 1, 2, 3, 4, 5, 6, 7],
      };
      await triggerCells(cellMap[preset], speed);
    },
    [triggerCells]
  );

  return {
    triggerCell,
    triggerCells,
    triggerPreset,
  };
}

