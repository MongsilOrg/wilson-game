'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const VOLUME_STORAGE_KEY = 'wilson-game-volume';

function getStoredVolume(): number {
  if (typeof window === 'undefined') return 0.1;
  
  // 1. data-volume attribute를 우선 확인 (초기 스크립트가 설정한 값)
  const dataVolume = document.documentElement.getAttribute('data-volume');
  if (dataVolume !== null) {
    const volume = parseFloat(dataVolume);
    if (!isNaN(volume) && volume >= 0 && volume <= 1) {
      return volume;
    }
  }
  
  // 2. localStorage 확인
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored !== null) {
      const volume = parseFloat(stored);
      if (!isNaN(volume) && volume >= 0 && volume <= 1) {
        return volume;
      }
    }
  } catch (error) {
    console.error('Failed to load volume from localStorage:', error);
  }
  
  return 0.1;
}

export function useAudio(src: string, loop: boolean = true, autoPlay: boolean = false) {
  const [isPlaying, setIsPlaying] = useState(false);
  // 서버와 클라이언트가 동일하게 렌더링되도록 초기값은 항상 0.1
  // 실제 볼륨은 useEffect에서 설정하여 Hydration 오류 방지
  const [volume, setVolume] = useState(0.1);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 마운트 후 한 번만 실행하여 상태 동기화 및 data attribute 업데이트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentVolume = getStoredVolume();
      setVolume(currentVolume);
      // 초기 스크립트가 이미 적용했지만, 확실히 하기 위해 다시 적용
      // data attribute도 업데이트 (일관성 유지)
      document.documentElement.setAttribute('data-volume', currentVolume.toString());
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(src);
      audioRef.current.loop = loop;
      audioRef.current.volume = volume;

      const audio = audioRef.current;

      const handleEnded = () => {
        setIsPlaying(false);
      };

      audio.addEventListener('ended', handleEnded);

      // autoPlay가 true이면 자동 재생
      if (autoPlay) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Auto play failed:', error);
        });
      }

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.pause();
        audio.src = '';
      };
    }
  }, [src, loop, autoPlay, volume]);

  // 볼륨 변경 시 오디오에 적용
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Audio play failed:', error);
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
    setVolume(newVolume);
    // data attribute도 업데이트
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-volume', newVolume.toString());
    }
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, newVolume.toString());
    } catch (error) {
      console.error('Failed to save volume to localStorage:', error);
    }
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

