
import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './components/Knob';
import { PatternGrid } from './components/PatternGrid';
import { VUMeter } from './components/VUMeter';
import { AudioEngine } from './services/audioEngine';
import { generateRhythmPattern } from './services/geminiService';
import { Step, ADSR, FilterSettings, EQSettings, ModSettings, ArpSettings, ArpMode } from './types';

const INITIAL_STEPS: Step[] = Array(16).fill(0).map(() => ({
  active: false,
  velocity: 0.8,
  pitch: 0
}));

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(128);
  const [volume, setVolume] = useState(0.8);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [adsr, setAdsr] = useState<ADSR>({ attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2 });
  const [filter, setFilter] = useState<FilterSettings>({ lpFreq: 15000, hpFreq: 20, q: 1 });
  const [eq, setEq] = useState<EQSettings>({ low: 0, mid: 0, high: 0 });
  const [mod, setMod] = useState<ModSettings>({ 
    chorusMix: 0, chorusRate: 1.5, chorusDepth: 2,
    flangerMix: 0, flangerRate: 0.5, flangerDepth: 1
  });
  const [arp, setArp] = useState<ArpSettings>({ mode: 'Manual', octaveRange: 1, gate: 0.8 });
  
  const [activeTab, setActiveTab] = useState<'SEQ' | 'ARP' | 'FX' | 'MOD' | 'ENV'>('SEQ');
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => audioEngineRef.current?.stop();
  }, []);

  // Playhead update loop
  useEffect(() => {
    let animationFrameId: number;
    const updatePlayhead = () => {
      if (audioEngineRef.current && isPlaying) {
        setCurrentStepIndex(audioEngineRef.current.currentStep);
      } else {
        setCurrentStepIndex(-1);
      }
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };
    updatePlayhead();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setBPM(bpm);
      audioEngineRef.current.setVolume(volume);
      audioEngineRef.current.setSteps(steps);
      audioEngineRef.current.setADSR(adsr);
      audioEngineRef.current.setFilter(filter);
      audioEngineRef.current.setEQ(eq);
      audioEngineRef.current.setModulation(mod);
      audioEngineRef.current.setGate(arp.gate);
      audioEngineRef.current.setArpMode(arp.mode);
    }
  }, [bpm, volume, steps, adsr, filter, eq, mod, arp]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioEngineRef.current) {
      setIsLoading(true);
      try { await audioEngineRef.current.setAudioFile(file); setFileName(file.name); } 
      catch (err) { alert("Error loading audio file."); }
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioEngineRef.current) return;
    isPlaying ? audioEngineRef.current.stop() : audioEngineRef.current.start();
    setIsPlaying(!isPlaying);
  };

  const handleGenerateAI = async () => {
    setIsLoading(true);
    const newSteps = await generateRhythmPattern(`${aiPrompt} in ${arp.mode} mode`);
    setSteps(newSteps);
    setIsLoading(false);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 bg-[#080808]">
      <div className="w-full max-w-6xl bg-[#181818] rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border-4 border-[#222] overflow-hidden flex flex-col">
        
        {/* VST Top Bar */}
        <div className="bg-[#252525] p-5 flex items-center justify-between border-b border-[#111] shadow-md">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-orange-500 font-black text-xl italic tracking-tighter leading-none">ARPGEN</span>
              <span className="text-[9px] text-zinc-500 font-bold tracking-[0.2em] -mt-1 uppercase">Advanced VST Engine</span>
            </div>
            <div className="h-10 w-[1px] bg-zinc-800" />
            <div className="mono text-[11px] text-orange-400 bg-black/40 px-5 py-2 rounded-lg border border-orange-500/10 min-w-[200px] text-center shadow-inner">
              {fileName?.toUpperCase() || "EMPTY SLOT"}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="Atmospheric glitch..." 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-black/60 border border-[#444] text-[11px] px-4 py-2 rounded-full focus:outline-none focus:border-orange-500 w-56 text-zinc-200 placeholder-zinc-700 shadow-inner"
                />
             </div>
             <button 
                onClick={handleGenerateAI}
                disabled={isLoading}
                className="bg-gradient-to-b from-orange-500 to-orange-700 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg active:translate-y-px transition-all"
             >
               {isLoading ? "Thinking..." : "AI Generate"}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left: Global Master Controls */}
          <div className="lg:col-span-1 flex flex-col space-y-10 bg-[#202020] p-6 rounded-2xl border border-white/5 shadow-2xl">
             <Knob label="Tempo / RPM" value={bpm} min={30} max={300} onChange={setBpm} unit=" BPM" />
             <Knob label="Main Volume" value={volume} min={0} max={2} onChange={setVolume} />
             
             <div className="flex flex-col space-y-4 pt-6 border-t border-white/5">
                <label className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 hover:border-orange-500/50 transition-all p-4 text-center">
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-orange-500 transition-colors uppercase">Upload Audio</span>
                  <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </label>
                
                <button 
                  onClick={togglePlayback}
                  className={`py-5 rounded-2xl flex items-center justify-center transition-all ${
                    isPlaying ? 'bg-red-600 shadow-red-900/40' : 'bg-orange-600 shadow-orange-900/40'
                  } text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-xl active:scale-95`}
                >
                  {isPlaying ? "Stop" : "Play"}
                </button>
             </div>
          </div>

          {/* Right: Dynamic Workstation */}
          <div className="lg:col-span-4 flex flex-col space-y-5">
             <div className="flex space-x-3">
                {['SEQ', 'ARP', 'FX', 'MOD', 'ENV'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all border ${
                      activeTab === tab 
                        ? 'bg-orange-600 border-orange-400 text-white shadow-lg' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    {tab === 'SEQ' ? 'GRID' : tab}
                  </button>
                ))}
             </div>

             <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-6 shadow-inner relative overflow-hidden flex flex-col">
                {activeTab === 'SEQ' && (
                  <>
                    <VUMeter analyser={audioEngineRef.current?.analyser || null} active={isPlaying} />
                    <PatternGrid 
                      steps={steps} 
                      currentStepIndex={currentStepIndex}
                      onToggleStep={(i) => {
                        const s = [...steps]; s[i].active = !s[i].active; setSteps(s);
                      }} onPitchChange={(i, p) => {
                        const s = [...steps]; s[i].pitch = p; setSteps(s);
                      }} 
                    />
                  </>
                )}

                {activeTab === 'ARP' && (
                  <div className="flex flex-col space-y-10 items-center justify-center h-full">
                    <div className="flex space-x-12">
                      <Knob label="Gate Length" value={arp.gate} min={0.1} max={1} onChange={(v) => setArp({...arp, gate: v})} />
                      <Knob label="Octaves" value={arp.octaveRange} min={1} max={4} onChange={(v) => setArp({...arp, octaveRange: Math.round(v)})} />
                    </div>
                    <div className="flex space-x-2">
                      {(['Manual', 'Up', 'Down', 'UpDown', 'Random'] as ArpMode[]).map(m => (
                        <button 
                          key={m} 
                          onClick={() => setArp({...arp, mode: m})}
                          className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all ${arp.mode === m ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'FX' && (
                  <div className="grid grid-cols-2 gap-12 p-4">
                    <div className="space-y-6 bg-zinc-900/30 p-4 rounded-xl">
                      <h4 className="text-[10px] text-orange-500 uppercase font-black tracking-widest text-center border-b border-white/5 pb-2">Multimode Filter</h4>
                      <div className="flex justify-around">
                        <Knob label="Cutoff" value={filter.lpFreq} min={20} max={20000} onChange={(v) => setFilter({...filter, lpFreq: v})} />
                        <Knob label="Res" value={filter.q} min={0.1} max={15} onChange={(v) => setFilter({...filter, q: v})} />
                      </div>
                    </div>
                    <div className="space-y-6 bg-zinc-900/30 p-4 rounded-xl">
                      <h4 className="text-[10px] text-orange-500 uppercase font-black tracking-widest text-center border-b border-white/5 pb-2">3-Band EQ</h4>
                      <div className="flex justify-around">
                        <Knob label="Low" value={eq.low} min={-15} max={15} onChange={(v) => setEq({...eq, low: v})} />
                        <Knob label="Mid" value={eq.mid} min={-15} max={15} onChange={(v) => setEq({...eq, mid: v})} />
                        <Knob label="High" value={eq.high} min={-15} max={15} onChange={(v) => setEq({...eq, high: v})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'MOD' && (
                   <div className="grid grid-cols-2 gap-12 p-4">
                      <div className="space-y-6 bg-zinc-900/30 p-4 rounded-xl">
                        <h4 className="text-[10px] text-orange-500 uppercase font-black tracking-widest text-center border-b border-white/5 pb-2">Chorus</h4>
                        <div className="flex justify-around">
                          <Knob label="Rate" value={mod.chorusRate} min={0.1} max={10} onChange={(v) => setMod({...mod, chorusRate: v})} />
                          <Knob label="Depth" value={mod.chorusDepth} min={0} max={10} onChange={(v) => setMod({...mod, chorusDepth: v})} />
                          <Knob label="Mix" value={mod.chorusMix} min={0} max={1} onChange={(v) => setMod({...mod, chorusMix: v})} />
                        </div>
                      </div>
                      <div className="space-y-6 bg-zinc-900/30 p-4 rounded-xl">
                        <h4 className="text-[10px] text-orange-500 uppercase font-black tracking-widest text-center border-b border-white/5 pb-2">Flanger</h4>
                        <div className="flex justify-around">
                          <Knob label="Rate" value={mod.flangerRate} min={0.1} max={5} onChange={(v) => setMod({...mod, flangerRate: v})} />
                          <Knob label="Depth" value={mod.flangerDepth} min={0} max={5} onChange={(v) => setMod({...mod, flangerDepth: v})} />
                          <Knob label="Mix" value={mod.flangerMix} min={0} max={1} onChange={(v) => setMod({...mod, flangerMix: v})} />
                        </div>
                      </div>
                   </div>
                )}

                {activeTab === 'ENV' && (
                  <div className="flex justify-around items-center h-full">
                    <Knob label="Attack" value={adsr.attack} min={0.001} max={0.5} onChange={(v) => setAdsr({...adsr, attack: v})} />
                    <Knob label="Decay" value={adsr.decay} min={0.01} max={1} onChange={(v) => setAdsr({...adsr, decay: v})} />
                    <Knob label="Sustain" value={adsr.sustain} min={0} max={1} onChange={(v) => setAdsr({...adsr, sustain: v})} />
                    <Knob label="Release" value={adsr.release} min={0.01} max={2} onChange={(v) => setAdsr({...adsr, release: v})} />
                  </div>
                )}
             </div>

             <div className="bg-black/60 rounded-2xl h-24 border border-white/5 p-4 flex items-center justify-center relative overflow-hidden group">
                <div className="flex items-end space-x-[2px] h-full w-full">
                  {Array.from({length: 120}).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-orange-600/40 rounded-t-sm"
                      style={{ 
                        height: isPlaying ? `${Math.random() * 80 + (i % 20)}%` : '4px',
                        transition: 'height 40ms linear'
                      }} 
                    />
                  ))}
                </div>
                {!fileName && <span className="absolute text-zinc-800 text-[10px] font-black tracking-[0.5em] mono group-hover:text-orange-900 transition-colors">DRAG SAMPLES HERE</span>}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-orange-500/5 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#0f0f0f] px-8 py-3 flex justify-between items-center text-[9px] text-zinc-500 mono border-t border-white/5">
          <div className="flex space-x-8 uppercase font-bold">
            <span className="text-orange-900">ENGINE: VST-NANO 3.1</span>
            <span>LATENCY: 4.2 MS</span>
            <span className={isPlaying ? 'text-green-500' : 'text-zinc-800'}>AUDIO: {isPlaying ? 'STREAMING' : 'IDLE'}</span>
          </div>
          <div className="flex space-x-6 items-center">
             <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-zinc-900'}`} />
                <span>DAW CLOCK SYNC</span>
             </div>
             <span className="text-zinc-400 bg-zinc-900 px-3 py-1 rounded border border-white/5">ABLETON LINK READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
