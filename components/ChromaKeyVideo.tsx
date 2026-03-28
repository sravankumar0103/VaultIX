"use client";

import React, { useEffect, useRef, useState } from "react";
import LoadingLogo from "@/components/LoadingLogo";

interface ChromaKeyVideoProps {
  src: string;
  className?: string;
  colorToReplace?: [number, number, number]; // [r, g, b]
  tolerance?: number;
  softness?: number; 
  spillSuppression?: number;
  loopFadeDuration?: number; 
}

export const ChromaKeyVideo: React.FC<ChromaKeyVideoProps> = ({
  src,
  className,
  colorToReplace = [0, 255, 0],
  tolerance = 82, 
  softness = 18,
  spillSuppression = 0.9, 
  loopFadeDuration = 0.5, 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOpacity, setCurrentOpacity] = useState(1);

  const [tX, tG, tB] = colorToReplace;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const processFrame = () => {
      if (!video.paused && !video.ended) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
        }

        if (canvas.width > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;
          
          // Fast pixel processing using Buffer + Uint32Array
          const buf = data.buffer;
          const data32 = new Uint32Array(buf);

          for (let i = 0; i < data32.length; i++) {
            const pixel = data32[i];
            const r = pixel & 0xff;
            const g = (pixel >> 8) & 0xff;
            const b = (pixel >> 16) & 0xff;

            // distance calculation
            const diff = Math.sqrt(
              Math.pow(r - tX, 2) +
              Math.pow(g - tG, 2) +
              Math.pow(b - tB, 2)
            );

            let alpha = 255;
            if (diff < tolerance) {
              alpha = 0;
            } else if (diff < tolerance + softness) {
              alpha = ((diff - tolerance) / softness) * 255;
            }

            let finalG = g;
            if (alpha > 0) {
              // Extreme Spill Suppression
              const limit = (r + b) * 0.5 * 0.95; // Slightly tighten the green limit
              if (g > limit) {
                finalG = limit + (g - limit) * (1 - spillSuppression);
              }
            }

            // Repack (ABGR for little-endian Uint32)
            data32[i] = (alpha << 24) | (b << 16) | (finalG << 8) | r;
          }
          
          ctx.putImageData(frame, 0, 0);

          // Looping Fade Logic
          const time = video.currentTime;
          const duration = video.duration;
          if (duration > 0) {
            let opacity = 1;
            if (time < loopFadeDuration) {
              opacity = time / loopFadeDuration;
            } else if (time > duration - loopFadeDuration) {
              opacity = (duration - time) / loopFadeDuration;
            }
            setCurrentOpacity(opacity);
          }
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => setIsPlaying(true);
    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("error", () => setError("Failed to load video"));

    if (video.readyState >= 3) {
      setIsPlaying(true);
    }
    
    video.play().catch(() => {});

    animationFrameId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlay);
    };
  }, [src, tX, tG, tB, tolerance, softness, spillSuppression, loopFadeDuration]);

  return (
    <div className={`relative flex items-center justify-center w-full ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-auto max-w-full pointer-events-none"
        style={{ 
          display: isPlaying ? 'block' : 'none',
          opacity: currentOpacity,
          filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.6)) contrast(1.05)'
        }}
      />
      {!isPlaying && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingLogo delayMs={0} inline />
        </div>
      )}
      {error && (
        <div className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-500/5 px-6 py-3 rounded-2xl border border-rose-500/20">
          {error}
        </div>
      )}
    </div>
  );
};
