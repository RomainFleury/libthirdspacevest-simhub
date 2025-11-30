export interface GameMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType;
}

