
import React, { useEffect, useRef } from 'react';

interface VUMeterProps {
  analyser: AnalyserNode | null;
  active: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({ analyser, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient for a pro look
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#f97316'); // Orange 500
        gradient.addColorStop(0.6, '#ef4444'); // Red 500
        gradient.addColorStop(1, '#991b1b'); // Red 800

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, [analyser, active]);

  return (
    <div className="w-full bg-black/40 rounded-t-xl border-x border-t border-white/5 h-16 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" width={400} height={100} />
    </div>
  );
};
