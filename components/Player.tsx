
import React, { useRef, useEffect, useState } from 'react';
import { PlayerState, Topic } from '../types';
import { BASE_AUDIO_URL } from '../constants';

interface PlayerProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onProgressUpdate: (progress: number, currentTime: number, duration: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onSpeedChange: (speed: number) => void;
}

const Player: React.FC<PlayerProps> = ({ state, onTogglePlay, onProgressUpdate, onNext, onPrev, onSpeedChange }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const currentTopic: Topic | undefined = state.currentBook?.topics?.[state.currentTopicIndex];
  
  const audioSrc = currentTopic 
    ? (currentTopic.audio.startsWith('http') ? currentTopic.audio : `${BASE_AUDIO_URL}${currentTopic.audio}`) 
    : '';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackSpeed;
      if (state.isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [state.isPlaying, audioSrc, state.playbackSpeed]);

  useEffect(() => {
    if (audioRef.current && state.progress !== undefined) {
      const duration = audioRef.current.duration;
      if (duration && !isNaN(duration)) {
        const targetTime = (state.progress / 100) * duration;
        if (Math.abs(audioRef.current.currentTime - targetTime) > 5) {
           audioRef.current.currentTime = targetTime;
        }
      }
    }
  }, [state.currentBook?.id, state.currentTopicIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      onProgressUpdate(progress, audioRef.current.currentTime, audioRef.current.duration);
    }
  };

  if (!state.currentBook) return null;

  const speeds = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] md:w-[900px] glass-panel rounded-2xl md:rounded-full px-4 md:px-10 py-3 md:py-5 flex flex-col md:flex-row items-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-50 transition-all border border-white/10 gap-2 md:gap-0">
      <audio 
        ref={audioRef} 
        src={audioSrc} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
      />
      
      {/* Information area */}
      <div className="flex items-center w-full md:w-auto md:flex-1 min-w-0 gap-4">
        <div 
          className={`size-10 md:size-16 rounded-full bg-cover bg-center shrink-0 border-2 border-primary/40 shadow-xl ${state.isPlaying ? 'animate-spin-slow' : ''}`}
          style={{ backgroundImage: `url(${state.currentBook.coverUrl})` }}
        />
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="text-sm md:text-lg font-black truncate dark:text-white text-slate-900 leading-tight mb-0.5">
            {currentTopic ? currentTopic.title : state.currentBook.title}
          </span>
          <span className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-gray-400 truncate opacity-80">
            {state.currentBook.author}
          </span>
        </div>
        
        {/* Mobile Controls */}
        <div className="flex items-center gap-1 md:hidden ml-auto shrink-0">
          <button onClick={onPrev} className="p-2 text-slate-400 active:text-primary">
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>
          <button 
            onClick={onTogglePlay}
            className="size-11 rounded-full bg-primary flex items-center justify-center text-white shadow-lg active:scale-90"
          >
            <span className="material-symbols-outlined text-3xl fill-1">
              {state.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button onClick={onNext} className="p-2 text-slate-400 active:text-primary">
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>
        </div>
      </div>

      {/* Progress & Desktop Controls */}
      <div className="hidden md:flex flex-col items-center flex-[1.5] px-12 gap-2">
        <div className="flex items-center gap-8">
          <button onClick={onPrev} className="text-slate-400 hover:text-primary transition-colors transform hover:scale-125 active:scale-90">
            <span className="material-symbols-outlined text-3xl">skip_previous</span>
          </button>
          <button 
            onClick={onTogglePlay}
            className="size-14 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_10px_25px_rgba(14,165,233,0.4)] hover:scale-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-4xl fill-1">
              {state.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button onClick={onNext} className="text-slate-400 hover:text-primary transition-colors transform hover:scale-125 active:scale-90">
            <span className="material-symbols-outlined text-3xl">skip_next</span>
          </button>
        </div>
        
        <div className="w-full">
           <div 
             className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
             onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (audioRef.current && audioRef.current.duration) {
                  audioRef.current.currentTime = percent * audioRef.current.duration;
                }
             }}
           >
             <div className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80" style={{ width: `${state.progress}%` }}></div>
           </div>
           <div className="flex justify-between text-xs font-bold font-mono opacity-60 mt-1.5 tracking-tight">
             <span>{state.currentTime}</span>
             <span>{state.totalDuration}</span>
           </div>
        </div>
      </div>

      {/* Mobile-Only Progress Bar */}
      <div className="w-full md:hidden h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-1 overflow-hidden relative">
          <div className="h-full bg-primary" style={{ width: `${state.progress}%` }}></div>
      </div>

      {/* Speed & Tools */}
      <div className="flex items-center gap-4 md:w-auto shrink-0 ml-auto md:ml-0 mt-1 md:mt-0">
        <div className="relative">
           <button 
             onClick={() => setShowSpeedMenu(!showSpeedMenu)}
             className="px-3 py-1.5 md:py-2 rounded-xl bg-primary/10 text-primary text-xs md:text-sm font-black border border-primary/20 hover:bg-primary/20 transition-colors"
           >
             {state.playbackSpeed}x
           </button>
           {showSpeedMenu && (
             <div className="absolute bottom-full mb-3 right-0 glass-panel rounded-2xl p-1.5 shadow-2xl border border-white/10 flex flex-col gap-1 z-[60] min-w-[70px]">
                {speeds.map(s => (
                  <button 
                    key={s} 
                    onClick={() => { onSpeedChange(s); setShowSpeedMenu(false); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${state.playbackSpeed === s ? 'bg-primary text-white' : 'hover:bg-white/10'}`}
                  >
                    {s}x
                  </button>
                ))}
             </div>
           )}
        </div>

        <button 
          onClick={() => {
            setIsMuted(!isMuted);
            if (audioRef.current) audioRef.current.muted = !isMuted;
          }} 
          className="text-slate-400 hover:text-primary transition-colors p-1"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl">
            {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Player;
