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
    <div
      className="mt-3 p-3.5 rounded-2xl bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] flex flex-col space-y-2"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {requiresTapToPlay && (
        <button
          onClick={play}
          className="w-full py-1.5 px-3 rounded-xl bg-[#AF695C] hover:bg-[#99594D] text-[#F9F4ED] text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F9F4ED]" />
          <span>Tap to Listen (Bulbul Voice Narration)</span>
        </button>
      )}

      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? pause : play}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className="w-9 h-9 rounded-xl bg-[#AF695C] hover:bg-[#99594D] text-[#F9F4ED] flex items-center justify-center transition shadow-sm flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Replay Button */}
        <button
          onClick={replay}
          aria-label="Replay audio"
          className="p-2 rounded-xl text-[#77716D] hover:bg-[#EDEAEA] dark:hover:bg-[#282523] transition flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Progress Bar & Slider */}
        <div className="flex-1 min-w-0 flex items-center space-x-2">
          <span className="text-[11px] font-mono text-[#77716D] w-8 text-right">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-2 rounded-full bg-[#D8D0C8] dark:bg-[#3E3835] relative cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seek(ratio * duration);
            }}
          >
            <div
              className="h-full bg-[#AF695C] rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-[#77716D] w-8">
            {formatTime(duration)}
          </span>
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="p-2 rounded-xl text-[#77716D] hover:bg-[#EDEAEA] dark:hover:bg-[#282523] transition flex-shrink-0"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#AF695C]" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
