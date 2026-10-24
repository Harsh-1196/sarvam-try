import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface AudioControlsProps {
  base64Audio?: string | null;
  mimeType?: string;
  autoPlay?: boolean;
}

export function AudioControls({ base64Audio, mimeType = 'audio/wav', autoPlay = false }: AudioControlsProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    isMuted,
    requiresTapToPlay,
    play,
    pause,
    replay,
    seek,
    toggleMute,
  } = useAudioPlayer(base64Audio, mimeType, autoPlay);

  if (!base64Audio) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col space-y-2">
      {requiresTapToPlay && (
        <button
          onClick={play}
          className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm hover:opacity-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tap to Listen (Bulbul Voice Narration)</span>
        </button>
      )}

      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? pause : play}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition shadow-sm flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Replay Button */}
        <button
          onClick={replay}
          aria-label="Replay audio"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Progress Bar & Slider */}
        <div className="flex-1 min-w-0 flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-8 text-right">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 relative cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seek(ratio * duration);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-8">
            {formatTime(duration)}
          </span>
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition flex-shrink-0"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
