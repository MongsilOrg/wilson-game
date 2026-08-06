'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { logger } from '@/lib/logger';
import { useIsClient } from '@/hooks/useIsClient';

const VOLUME_STORAGE_KEY = 'wilson-game-volume';
const VOLUME_CHANGE_EVENT = 'wilson-game-volume-change';
const DEFAULT_VOLUME = 0.1;

function parseVolume(value: string | null): number | null {
  if (value === null) return null;
  const volume = parseFloat(value);
  return !isNaN(volume) && volume >= 0 && volume <= 1 ? volume : null;
}

/**
 * 현재 볼륨을 DOM과 localStorage에서 읽는다.
 * 하이드레이션 전에 실행되는 인라인 스크립트가 data-volume을 채워 둔다.
 */
function getSnapshot(): number {
  const fromDom = parseVolume(document.documentElement.getAttribute('data-volume'));
  if (fromDom !== null) return fromDom;

  try {
    const fromStorage = parseVolume(localStorage.getItem(VOLUME_STORAGE_KEY));
    if (fromStorage !== null) return fromStorage;
  } catch (error) {
    logger.error('Failed to load volume from localStorage:', error);
  }

  return DEFAULT_VOLUME;
}

function getServerSnapshot(): number {
  return DEFAULT_VOLUME;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(VOLUME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(VOLUME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useAudio(src: string, loop: boolean = true, autoPlay: boolean = false) {
  const [isPlaying, setIsPlaying] = useState(false);
  const volume = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = useIsClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // volume을 의존성에 넣으면 볼륨을 움직일 때마다 오디오가 새로 생성되어 재생이 끊긴다.
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);

    // autoPlay가 true이면 자동 재생
    if (autoPlay) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        logger.error('Auto play failed:', error);
      });
    }

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [src, loop, autoPlay]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        logger.error('Audio play failed:', error);
      });
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    document.documentElement.setAttribute('data-volume', newVolume.toString());
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, newVolume.toString());
    } catch (error) {
      logger.error('Failed to save volume to localStorage:', error);
    }
    window.dispatchEvent(new Event(VOLUME_CHANGE_EVENT));
  }, []);

  return {
    isPlaying,
    volume,
    mounted,
    setVolume: handleVolumeChange,
    play,
    pause,
    toggle,
  };
}
