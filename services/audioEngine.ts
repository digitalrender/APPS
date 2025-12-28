
import { Step, ADSR, FilterSettings, EQSettings, ModSettings, ArpMode } from '../types';

export class AudioEngine {
  private ctx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private masterGain: GainNode;
  public analyser: AnalyserNode;
  
  // Effect Nodes
  private filterLP: BiquadFilterNode;
  private filterHP: BiquadFilterNode;
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;
  
  // Modulation Nodes
  private chorusDelay: DelayNode;
  private chorusLFO: OscillatorNode;
  private chorusDepthNode: GainNode;
  private chorusMixNode: GainNode;

  private flangerDelay: DelayNode;
  private flangerLFO: OscillatorNode;
  private flangerDepthNode: GainNode;
  private flangerFeedback: GainNode;
  private flangerMixNode: GainNode;
  
  public currentStep = 0;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private bpm = 120;
  private steps: Step[] = [];
  
  private adsr: ADSR = { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
  private gate = 0.8;
  private arpMode: ArpMode = 'Manual';
  private internalSequenceCounter = 0;
  private isGoingUp = true;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    // EQ & Filters
    this.filterLP = this.ctx.createBiquadFilter(); this.filterLP.type = 'lowpass';
    this.filterHP = this.ctx.createBiquadFilter(); this.filterHP.type = 'highpass';
    this.eqLow = this.ctx.createBiquadFilter(); this.eqLow.type = 'lowshelf';
    this.eqMid = this.ctx.createBiquadFilter(); this.eqMid.type = 'peaking';
    this.eqHigh = this.ctx.createBiquadFilter(); this.eqHigh.type = 'highshelf';

    // Chorus Implementation
    this.chorusDelay = this.ctx.createDelay();
    this.chorusLFO = this.ctx.createOscillator();
    this.chorusDepthNode = this.ctx.createGain();
    this.chorusMixNode = this.ctx.createGain();
    this.chorusLFO.connect(this.chorusDepthNode);
    this.chorusDepthNode.connect(this.chorusDelay.delayTime);
    this.chorusLFO.start();

    // Flanger Implementation
    this.flangerDelay = this.ctx.createDelay();
    this.flangerLFO = this.ctx.createOscillator();
    this.flangerDepthNode = this.ctx.createGain();
    this.flangerFeedback = this.ctx.createGain();
    this.flangerMixNode = this.ctx.createGain();
    this.flangerLFO.connect(this.flangerDepthNode);
    this.flangerDepthNode.connect(this.flangerDelay.delayTime);
    this.flangerDelay.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerDelay);
    this.flangerLFO.start();

    // Routing
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.filterLP);
    this.filterLP.connect(this.filterHP);
    this.filterHP.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusMixNode);
    this.chorusMixNode.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerMixNode);
    this.filterHP.connect(this.masterGain);
    this.chorusMixNode.connect(this.masterGain);
    this.flangerMixNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public async setAudioFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  public setVolume(value: number) {
    this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  public setBPM(value: number) { this.bpm = value; }
  public setSteps(steps: Step[]) { this.steps = steps; }
  public setADSR(adsr: ADSR) { this.adsr = adsr; }
  public setGate(gate: number) { this.gate = gate; }
  public setArpMode(mode: ArpMode) { this.arpMode = mode; }

  public setFilter(settings: FilterSettings) {
    this.filterLP.frequency.setTargetAtTime(settings.lpFreq, this.ctx.currentTime, 0.05);
    this.filterHP.frequency.setTargetAtTime(settings.hpFreq, this.ctx.currentTime, 0.05);
    this.filterLP.Q.setTargetAtTime(settings.q, this.ctx.currentTime, 0.05);
  }

  public setEQ(settings: EQSettings) {
    this.eqLow.gain.setTargetAtTime(settings.low, this.ctx.currentTime, 0.05);
    this.eqMid.gain.setTargetAtTime(settings.mid, this.ctx.currentTime, 0.05);
    this.eqHigh.gain.setTargetAtTime(settings.high, this.ctx.currentTime, 0.05);
  }

  public setModulation(settings: ModSettings) {
    this.chorusMixNode.gain.setTargetAtTime(settings.chorusMix, this.ctx.currentTime, 0.05);
    this.chorusLFO.frequency.setTargetAtTime(settings.chorusRate, this.ctx.currentTime, 0.05);
    this.chorusDepthNode.gain.setTargetAtTime(settings.chorusDepth / 1000, this.ctx.currentTime, 0.05);

    this.flangerMixNode.gain.setTargetAtTime(settings.flangerMix, this.ctx.currentTime, 0.05);
    this.flangerLFO.frequency.setTargetAtTime(settings.flangerRate, this.ctx.currentTime, 0.05);
    this.flangerDepthNode.gain.setTargetAtTime(settings.flangerDepth / 2000, this.ctx.currentTime, 0.05);
    this.flangerFeedback.gain.setTargetAtTime(0.7 * settings.flangerMix, this.ctx.currentTime, 0.05);
  }

  private playStep(time: number, step: Step) {
    if (!this.buffer || !step.active) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    const envGain = this.ctx.createGain();
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPerSixteenth = secondsPerBeat / 4;
    const noteDuration = secondsPerSixteenth * this.gate;

    const now = time;
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(step.velocity, now + this.adsr.attack);
    envGain.gain.linearRampToValueAtTime(step.velocity * this.adsr.sustain, now + this.adsr.attack + this.adsr.decay);
    envGain.gain.setValueAtTime(step.velocity * this.adsr.sustain, now + noteDuration);
    envGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration + this.adsr.release);

    source.playbackRate.value = Math.pow(2, step.pitch / 12);
    source.connect(envGain);
    envGain.connect(this.eqLow);
    source.start(time);
    source.stop(time + noteDuration + this.adsr.release + 0.1);
  }

  private scheduler = () => {
    while (this.nextStepTime < this.ctx.currentTime + 0.1) {
      let targetIndex = this.currentStep;

      // Arpeggiator Logic
      const activeIndices = this.steps
        .map((s, i) => (s.active ? i : -1))
        .filter((i) => i !== -1);

      if (this.arpMode === 'Manual') {
        targetIndex = this.internalSequenceCounter % 16;
        this.currentStep = targetIndex;
      } else if (activeIndices.length > 0) {
        // Sort active steps by pitch
        const sortedByPitch = [...activeIndices].sort((a, b) => this.steps[a].pitch - this.steps[b].pitch);
        
        if (this.arpMode === 'Up') {
          const idx = this.internalSequenceCounter % sortedByPitch.length;
          targetIndex = sortedByPitch[idx];
        } else if (this.arpMode === 'Down') {
          const idx = this.internalSequenceCounter % sortedByPitch.length;
          targetIndex = sortedByPitch[sortedByPitch.length - 1 - idx];
        } else if (this.arpMode === 'Random') {
          targetIndex = activeIndices[Math.floor(Math.random() * activeIndices.length)];
        } else if (this.arpMode === 'UpDown') {
          const doubleLen = (sortedByPitch.length * 2) - 2;
          const safeDoubleLen = Math.max(1, doubleLen);
          const idx = this.internalSequenceCounter % safeDoubleLen;
          if (idx < sortedByPitch.length) {
            targetIndex = sortedByPitch[idx];
          } else {
            targetIndex = sortedByPitch[doubleLen - idx];
          }
        }
        this.currentStep = targetIndex;
      }

      const step = this.steps[targetIndex];
      // Note: In Manual mode, we play the step if it's active. 
      // In Arp modes, we only picked active steps, so we play.
      if (step && (this.arpMode !== 'Manual' || step.active)) {
        this.playStep(this.nextStepTime, step);
      }
      
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextStepTime += (secondsPerBeat / 4);
      this.internalSequenceCounter++;
    }
    this.schedulerTimer = window.setTimeout(this.scheduler, 25);
  };

  public start() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.nextStepTime = this.ctx.currentTime;
    this.internalSequenceCounter = 0;
    this.scheduler();
  }

  public stop() {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.internalSequenceCounter = 0;
    this.currentStep = 0;
  }
}
