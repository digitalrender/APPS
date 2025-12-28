
export interface Step {
  active: boolean;
  velocity: number;
  pitch: number; // Semitone offset
}

export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FilterSettings {
  lpFreq: number;
  hpFreq: number;
  q: number;
}

export interface EQSettings {
  low: number;
  mid: number;
  high: number;
}

export interface ModSettings {
  chorusMix: number;
  chorusRate: number;
  chorusDepth: number;
  flangerMix: number;
  flangerRate: number;
  flangerDepth: number;
}

export type ArpMode = 'Manual' | 'Up' | 'Down' | 'UpDown' | 'Random';

export interface ArpSettings {
  mode: ArpMode;
  octaveRange: number;
  gate: number; // 0 to 1
}

export enum PlayState {
  PLAYING = 'playing',
  STOPPED = 'stopped',
}
