import { useState, useRef, useEffect, useCallback } from 'react';

// Single global audio element tracker so only one clip plays at a time
let currentActiveAudio: HTMLAudioElement | null = null;

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  requiresTapToPlay: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (time: number) => void;
  toggleMute: () => void;
}

export function useAudioPlayer(
  base64Audio?: string | null,
  mimeType: string = 'audio/wav',
  autoPlay: boolean = false
): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [requiresTapToPlay, setRequiresTapToPlay] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Initialize or update audio object when base64 changes
  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!base64Audio) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    try {
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime || 0);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onplay = () => {
        if (currentActiveAudio && currentActiveAudio !== audio) {
          currentActiveAudio.pause();
        }
        currentActiveAudio = audio;
        setIsPlaying(true);
        setRequiresTapToPlay(false);
      };

      if (autoPlay) {
        audio.play().catch(() => {
          // Browser prevented autoplay
          setRequiresTapToPlay(true);
        });
      }

      return () => {
        audio.pause();
        if (currentActiveAudio === audio) {
          currentActiveAudio = null;
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
      };
    } catch (e) {
      console.error('Failed to parse base64 audio:', e);
    }
  }, [base64Audio, mimeType, autoPlay]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setRequiresTapToPlay(false);
      }).catch((e) => {
        console.warn('Playback error:', e);
        setRequiresTapToPlay(true);
      });
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const replay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setRequiresTapToPlay(false);
      }).catch(() => {
        setRequiresTapToPlay(true);
      });
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMuted = !audioRef.current.muted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  }, []);

  return {
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
  };
}
