export interface MapLine {
  id: string;
  color: string;
  points: [number, number][];
  dashed?: boolean;
  label?: string;
}

export type MapCommand =
  | { type: 'render'; lines: MapLine[]; fit?: boolean }
  | { type: 'append'; id: string; lat: number; lng: number; color: string }
  | { type: 'center'; lat: number; lng: number; zoom?: number }
  | { type: 'theme'; dark: boolean };

export type MapEvent =
  | { type: 'ready' }
  | { type: 'click'; lat: number; lng: number }
  | { type: 'error'; message: string };

export interface MapSurfaceHandle {
  send: (cmd: MapCommand) => void;
}
