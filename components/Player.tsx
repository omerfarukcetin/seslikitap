
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
  onTopicSelect?: (index: number) => void;
}

const Player: React.FC<PlayerProps> = ({ state, onTogglePlay, onProgressUpdate, onNext, onPrev, onSpeedChange, onTopicSelect }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const currentTopic: Topic | undefined = state.currentBook?.topics?.[state.currentTopicIndex];

  const audioSrc = currentTopic
    ? (currentTopic.audio.startsWith('http') ? currentTopic.audio : `${BASE_AUDIO_URL}${currentTopic.audio}`)
    : '';

  // Dinamik sayfa başlığı
  useEffect(() => {
    if (currentTopic && state.currentBook) {
      document.title = `${currentTopic.title} - ${state.currentBook.title} | SesliKitap`;
    } else if (state.currentBook) {
      document.title = `${state.currentBook.title} | SesliKitap`;
    } else {
      document.title = 'SesliKitap - Premium Audiobook Platform';
    }
    return () => {
      document.title = 'SesliKitap - Premium Audiobook Platform';
    };
  }, [currentTopic, state.currentBook]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackSpeed;
    }
  }, [state.playbackSpeed]);

  // audioSrc değiştiğinde yeni parçayı yükle
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      const audio = audioRef.current;

      // Yeni parça yüklenince playbackRate ve progress ayarla
      const handleLoadedData = () => {
        setIsInitialLoading(true);
        audio.playbackRate = state.playbackSpeed;

        // Kayıtlı progress'i uygula (kaldığı dakikadan devam)
        if (state.progress > 0 && audio.duration && !isNaN(audio.duration)) {
          const targetTime = (state.progress / 100) * audio.duration;
          audio.currentTime = targetTime;
        }

        // Kısa bir gecikme ile loading'i kapat ki timeUpdate sıfır göndermesin
        setTimeout(() => {
          setIsInitialLoading(false);
          if (state.isPlaying) {
            audio.play().catch(e => console.error("Audio play error:", e));
          }
        }, 100);
      };

      audio.addEventListener('loadeddata', handleLoadedData, { once: true });
      audio.src = audioSrc;
      audio.load();

      return () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [audioSrc]);

  // isPlaying değiştiğinde play/pause
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      // Her play'de playbackRate'i de ayarla
      audioRef.current.playbackRate = state.playbackSpeed;
      if (state.isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [state.isPlaying]);

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

  // Fullscreen açıkken body scroll'u kapat
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleTimeUpdate = () => {
    if (isInitialLoading) return; // İlk yükleme sırasında progress güncelleme

    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      onProgressUpdate(progress, audioRef.current.currentTime, audioRef.current.duration);
    }
  };

  const handleTopicClick = (index: number) => {
    if (onTopicSelect) {
      onTopicSelect(index);
    }
  };

  if (!state.currentBook) return null;

  const speeds = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
  const topics = state.currentBook.topics || [];

  // Progress bar sürükleme fonksiyonu
  const handleSeek = (e: React.MouseEvent | React.TouchEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  // Tam Ekran Player
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col md:flex-row animate-fade-in">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onNext}
        />

        {/* Kapatma butonu - sağ üst (web için) */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-10 size-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Sol taraf - Oynatıcı (web) / Üst kısım (mobil) */}
        <div className="flex flex-col p-4 md:p-8 md:flex-1 md:max-w-[50%]">
          {/* Header - sadece mobil */}
          <div className="flex items-center justify-between mb-3 md:hidden">
            <button
              onClick={() => setIsFullscreen(false)}
              className="size-9 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
            </button>
            <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Şu an çalıyor</span>
            <div className="size-9" /> {/* Spacer */}
          </div>



          {/* Cover & Info - Mobilde yan yana, Web'de ortada resim + altında açıklama */}
          <div className="flex items-center gap-4 md:flex-col md:items-center md:flex-1 md:justify-center md:px-8">
            <div
              className="w-20 h-28 md:w-52 md:h-80 rounded-xl md:rounded-3xl bg-cover bg-center shadow-xl md:shadow-2xl border-2 md:border-[6px] border-slate-200 dark:border-white/20 shrink-0"
              style={{ backgroundImage: `url(${state.currentBook.coverUrl})` }}
            />
            <div className="flex-1 md:text-center space-y-1 md:space-y-3 min-w-0 md:mt-6">
              <h2 className="text-sm md:text-xl font-black leading-snug break-words line-clamp-2">{currentTopic?.title || state.currentBook.title}</h2>
              <p className="text-xs md:text-sm opacity-70">{state.currentBook.author}</p>
              <p className="text-[10px] md:text-xs text-primary font-bold">
                Bölüm {state.currentTopicIndex + 1} / {topics.length}
              </p>
              {/* Kitap açıklaması - sadece web */}
              {state.currentBook.description && (
                <p className="hidden md:block text-sm opacity-70 leading-relaxed max-h-32 overflow-y-auto mt-6 text-left">
                  {state.currentBook.description}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 mt-6">
            {/* Progress with Drag */}
            <div>
              <div
                className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded-full cursor-pointer relative touch-none"
                onClick={(e) => handleSeek(e, e.currentTarget)}
                onTouchMove={(e) => handleSeek(e, e.currentTarget)}
                onMouseDown={(e) => {
                  const bar = e.currentTarget;
                  const onMove = (ev: MouseEvent) => {
                    const rect = bar.getBoundingClientRect();
                    const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    if (audioRef.current && audioRef.current.duration) {
                      audioRef.current.currentTime = percent * audioRef.current.duration;
                    }
                  };
                  const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                  };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }}
              >
                <div className="h-full bg-primary rounded-full" style={{ width: `${state.progress}%` }}></div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white dark:bg-white rounded-full shadow-lg border-2 border-primary"
                  style={{ left: `calc(${state.progress}% - 10px)` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-mono opacity-60 mt-1">
                <span>{state.currentTime}</span>
                <span>{state.totalDuration}</span>
              </div>
            </div>

            {/* Playback Controls with Speed */}
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <button onClick={onPrev} className="opacity-60 hover:opacity-100 active:text-primary transition-colors">
                <span className="material-symbols-outlined text-3xl md:text-4xl">skip_previous</span>
              </button>
              <button
                onClick={onTogglePlay}
                className="size-16 md:size-20 rounded-full bg-primary flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-4xl md:text-5xl fill-1">
                  {state.isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button onClick={onNext} className="opacity-60 hover:opacity-100 active:text-primary transition-colors">
                <span className="material-symbols-outlined text-3xl md:text-4xl">skip_next</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-3 py-2 rounded-full bg-slate-200 dark:bg-white/10 text-sm font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                >
                  {state.playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 rounded-xl p-2 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-1 z-[110]">
                    {speeds.map(s => (
                      <button
                        key={s}
                        onClick={() => { onSpeedChange(s); setShowSpeedMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${state.playbackSpeed === s ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70'}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sağ taraf - Konu Listesi (web) / Alt kısım (mobil) */}
        {topics.length > 0 && (
          <div className="flex-1 md:max-w-[50%] bg-slate-100 dark:bg-black/40 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 overflow-y-auto no-scrollbar">
            <div className="p-4 md:p-6">
              <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-4">Bölümler ({topics.length})</h3>
              <div className="space-y-2">
                {topics.map((t, i) => {
                  const active = state.currentTopicIndex === i;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTopicClick(i)}
                      className={`w-full p-3 md:p-4 rounded-xl flex justify-between items-center text-left transition-colors ${active ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                    >
                      <span className="truncate text-sm md:text-base font-medium">{t.title}</span>
                      <span className="material-symbols-outlined text-lg shrink-0 ml-2">
                        {active && state.isPlaying ? 'pause' : 'play_circle'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mini Player (Normal Görünüm)
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] md:w-[900px] glass-panel rounded-2xl md:rounded-full px-4 md:px-10 py-3 md:py-5 flex flex-col md:flex-row items-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-50 transition-all border border-white/10 gap-2 md:gap-0"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
      />

      {/* Information area - Mobilde tıklanabilir */}
      <div
        className="flex items-center w-full md:w-auto md:flex-1 min-w-0 gap-4 cursor-pointer md:cursor-default"
        onClick={() => window.innerWidth < 768 && setIsFullscreen(true)}
      >
        <div
          className="size-10 md:size-16 rounded-full bg-cover bg-center shrink-0 border-2 border-primary/40 shadow-xl"
          style={{ backgroundImage: `url(${state.currentBook.coverUrl})` }}
        />
        <div className="flex flex-col min-w-0 overflow-hidden flex-1">
          <span className="text-sm md:text-lg font-black truncate dark:text-white text-slate-900 leading-tight mb-0.5">
            {currentTopic ? currentTopic.title : state.currentBook.title}
          </span>
          <span className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-gray-400 truncate opacity-80">
            {state.currentBook.author}
          </span>
        </div>

        {/* Mobil: Expand ikonu */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
          className="md:hidden p-2 text-primary"
        >
          <span className="material-symbols-outlined">open_in_full</span>
        </button>

        {/* Mobile Controls */}
        <div className="flex items-center gap-1 md:hidden shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-2 text-slate-400 active:text-primary">
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="size-11 rounded-full bg-primary flex items-center justify-center text-white shadow-lg active:scale-90"
          >
            <span className="material-symbols-outlined text-3xl fill-1">
              {state.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-2 text-slate-400 active:text-primary">
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
            className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full cursor-pointer relative group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              if (audioRef.current && audioRef.current.duration) {
                audioRef.current.currentTime = percent * audioRef.current.duration;
              }
            }}
          >
            <div className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80" style={{ width: `${state.progress}%` }}></div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${state.progress}% - 6px)` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs font-bold font-mono opacity-60 mt-1.5 tracking-tight">
            <span>{state.currentTime}</span>
            <span>{state.totalDuration}</span>
          </div>
        </div>
      </div>

      {/* Mobile-Only Progress Bar */}
      <div className="w-full md:hidden h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-1 relative">
        <div className="h-full bg-primary rounded-full" style={{ width: `${state.progress}%` }}></div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md border-2 border-white"
          style={{ left: `calc(${state.progress}% - 6px)` }}
        ></div>
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

        {/* Tam Ekran Butonu (Desktop) */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="hidden md:flex text-slate-400 hover:text-primary transition-colors p-1"
          title="Tam Ekran"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl">open_in_full</span>
        </button>
      </div>
    </div>
  );
};

export default Player;
