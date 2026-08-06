'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Grid } from '@/lib/grid';
import { FruitRenderer } from '@/lib/fruit-renderer';
import { InputHandler } from '@/lib/input-handler';
import { GameState, GameRecord, RemovingAnimation, GRID_WIDTH, GRID_HEIGHT } from '@/types/game';
import { includesCoord } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api-client';

export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 캔버스는 뷰포트 변화로 언마운트됐다 다시 붙는다. 그때 렌더러와 입력 핸들러를
  // 새 엘리먼트에 다시 묶지 않으면 화면이 비고 드래그가 먹지 않는다.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const attachCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasEl(node);
  }, []);
  const gridRef = useRef<Grid | null>(null);
  const fruitRendererRef = useRef<FruitRenderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>('waiting');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [cellSize, setCellSize] = useState(0);
  const [removingFruits, setRemovingFruits] = useState<RemovingAnimation[]>([]);
  const [playerNickname, setPlayerNickname] = useState('');

  /**
   * Canvas 크기 설정 (부모 컨테이너 너비 기반, 종횡비 고정)
   */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === 'undefined') return;

    const parent = canvas.parentElement ?? canvas;
    const parentRect = parent.getBoundingClientRect();

    const gridAspectRatio = GRID_WIDTH / GRID_HEIGHT;
    const availableWidth = Math.max(320, parentRect.width || 0);
    const viewportLimitedWidth = Math.min(960, window.innerWidth - 48);
    const maxWidth = Math.max(320, Math.min(availableWidth, viewportLimitedWidth));

    const viewportLimitedHeight = Math.max(320, window.innerHeight - 240);

    let canvasWidth = maxWidth;
    let canvasHeight = canvasWidth / gridAspectRatio;

    if (canvasHeight > viewportLimitedHeight) {
      canvasHeight = viewportLimitedHeight;
      canvasWidth = canvasHeight * gridAspectRatio;
    }

    const finalWidth = Math.round(canvasWidth);
    const finalHeight = Math.round(canvasHeight);

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    canvas.style.width = `${finalWidth}px`;
    canvas.style.height = `${finalHeight}px`;

    const newCellSize = finalWidth / GRID_WIDTH;
    if (newCellSize > 0) {
      setCellSize(newCellSize);
    }
  }, []);

  /**
   * 선택 완료 처리
   */
  const handleSelection = useCallback((selectedPath: [number, number][]) => {
    if (!gridRef.current) return;
    
    if (gameState !== 'playing') return;
    if (selectedPath.length === 0) return;
    
    // 선택된 사과들의 합 계산 (값이 있는 칸만 대상)
    let sum = 0;
    const coordsToRemove: [number, number][] = [];
    
    for (const [row, col] of selectedPath) {
      const value = gridRef.current.getValue(row, col);
      if (value !== null && value !== 0) {
        sum += value;
        coordsToRemove.push([row, col]);
      }
    }
    
    // 합이 10이면 제거 (빈 칸 제외)
    if (sum === 10 && coordsToRemove.length > 0) {
      // 선택 영역의 중심 좌표 계산
      let centerRow = 0;
      let centerCol = 0;
      for (const [row, col] of coordsToRemove) {
        centerRow += row;
        centerCol += col;
      }
      centerRow = Math.floor(centerRow / coordsToRemove.length);
      centerCol = Math.floor(centerCol / coordsToRemove.length);
      
      // 제거 애니메이션 시작
      const removingValues = coordsToRemove.map(
        ([row, col]) => gridRef.current?.getValue(row, col) ?? 0
      );
      setRemovingFruits((prev: RemovingAnimation[]) => [...prev, {
        coords: coordsToRemove,
        values: removingValues,
        progress: 0
      }]);

      // 점수 증가 (제거한 사과 수만큼, 빈 칸 제외)
      setScore((prev: number) => prev + coordsToRemove.length);

      // 사과 제거
      gridRef.current.removeMultiple(coordsToRemove);
    }
  }, [gameState]);

  /**
   * 보드/렌더러/입력 초기화 (공용)
   */
  const initializeBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      logger.warn('[initializeBoard] Canvas ref is null');
      return false;
    }

    if (!canvas.isConnected) {
      logger.warn('[initializeBoard] Canvas is not connected to DOM');
      return false;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('[initializeBoard] Failed to get 2d context');
      return false;
    }

    try {
      // 기존 입력 핸들러 정리
      if (inputHandlerRef.current) {
        inputHandlerRef.current.cleanup();
      }

      // 캔버스 설정 및 그리드 구성
      setupCanvas();
      const newCellSize = canvas.width / GRID_WIDTH;
      
      if (newCellSize <= 0) {
        logger.error('[initializeBoard] Invalid cell size:', newCellSize);
        return false;
      }

      setCellSize(newCellSize);

      gridRef.current = new Grid();
      fruitRendererRef.current = new FruitRenderer(canvas, ctx, newCellSize, GRID_WIDTH, GRID_HEIGHT);
      inputHandlerRef.current = new InputHandler(
        canvas,
        gridRef.current,
        newCellSize,
        handleSelection
      );
      // 새 입력 핸들러 상태 초기화
      inputHandlerRef.current.reset();

      logger.debug('[initializeBoard] Successfully initialized');
      return true;
    } catch (error) {
      logger.error('[initializeBoard] Error during initialization:', error);
      return false;
    }
  }, [setupCanvas, handleSelection]);

  /**
   * 게임 시작
   */
  const startGame = useCallback((nickname: string) => {
    logger.debug('[startGame] Called with nickname:', nickname);
    
    // 기존 타이머 정리
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 상태 먼저 업데이트
    setPlayerNickname(nickname);
    setScore(0);
    setTimeLeft(120);
    setRemovingFruits([]);

    // 캔버스가 준비될 때까지 재시도
    const tryInitialize = (attempts = 0) => {
      if (attempts > 20) {
        logger.error('[startGame] Failed to initialize after 20 attempts');
        alert('게임을 시작할 수 없습니다. 페이지를 새로고침해주세요.');
        setGameState('waiting');
        return;
      }

      const ready = initializeBoard();
      if (!ready) {
        logger.debug(`[startGame] Attempt ${attempts + 1} failed, retrying...`);
        requestAnimationFrame(() => {
          setTimeout(() => tryInitialize(attempts + 1), 50);
        });
        return;
      }

      logger.debug('[startGame] Board initialized successfully');
      // 초기화 성공 후 게임 상태를 playing으로 설정
      setGameState('playing');
      
      // 타이머 시작
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 초기화 시도 시작
    tryInitialize();
  }, [initializeBoard]);

  /**
   * 게임 종료
   */
  const endGame = useCallback(async () => {
    setGameState('gameOver');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // 기록 저장
    if (playerNickname && score > 0) {
      try {
        await apiClient.post('/api/record', {
          nickname: playerNickname,
          score: score
        });
      } catch (error) {
        logger.error('기록 저장 실패:', error);
        // 사용자에게는 조용히 실패 (게임 플레이 경험에 영향 없음)
      }
    }
  }, [playerNickname, score]);

  /**
   * 게임 재시작
   * - 현재 게임 루프/입력을 정리하고, startGame 로직을 재사용하여 깨끗하게 다시 시작
   */
  const restartGame = useCallback(() => {
    // 타이머 정리
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 입력 핸들러 선택 상태 초기화 및 정리
    if (inputHandlerRef.current) {
      inputHandlerRef.current.reset?.();
      inputHandlerRef.current.cleanup();
      inputHandlerRef.current = null;
    }

    // 선택/애니메이션 상태 초기화
    setRemovingFruits([]);

    // 플레이어 닉네임이 없으면 다시 시작하지 않음
    if (!playerNickname) {
      setGameState('waiting');
      return;
    }

    // 잠시 waiting 상태로 돌린 뒤, 동일한 startGame 로직으로 다시 시작
    setGameState('waiting');
    startGame(playerNickname);
  }, [startGame, playerNickname]);

  /**
   * 애니메이션 업데이트
   */
  const updateAnimations = useCallback(() => {
    if (removingFruits.length === 0) {
      return;
    }
    
    if (removingFruits.length > 0) {
      setRemovingFruits((prev: RemovingAnimation[]) => {
        const updated = prev
          .map((anim: RemovingAnimation) => ({ ...anim, progress: anim.progress + 0.05 }))
          .filter((anim: RemovingAnimation) => anim.progress < 1);
        return updated;
      });
    }
  }, [removingFruits.length]);

  /**
   * 화면 그리기
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !gridRef.current || !fruitRendererRef.current || !inputHandlerRef.current) return;
    
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 게임이 시작되었거나 종료된 경우 그리드와 사과 그리기
    if (gameState === 'playing' || gameState === 'gameOver') {
      fruitRendererRef.current.drawGrid(GRID_WIDTH, GRID_HEIGHT);
      
      for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          const value = gridRef.current.getValue(row, col);
          
          if (value === 0 || value === null) {
            fruitRendererRef.current.drawCellBackground(col, row);
            continue;
          }
          
          const selectedCells = inputHandlerRef.current.getSelectedCells();
          const isSelected = includesCoord(selectedCells, [row, col]);
          fruitRendererRef.current.drawFruit(col, row, value, isSelected);
        }
      }

      // 제거된 칸은 격자에 남아 있지 않으므로 애니메이션에서 따로 그린다.
      for (const anim of removingFruits) {
        const alpha = 1 - anim.progress;
        const scale = 1 - anim.progress * 0.5;

        anim.coords.forEach(([row, col], index) => {
          const value = anim.values[index];
          if (!value) return;

          const centerX = col * cellSize + cellSize / 2;
          const centerY = row * cellSize + cellSize / 2;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(centerX, centerY);
          ctx.scale(scale, scale);
          ctx.translate(-centerX, -centerY);
          fruitRendererRef.current!.drawFruit(col, row, value, false);
          ctx.restore();
        });
      }
    }

    // 선택 영역 시각화 (합계 계산/오버레이 없이 영역만 표시)
    const selectedArea = inputHandlerRef.current.getSelectedArea();
    if (selectedArea) {
      fruitRendererRef.current.drawSelectionArea(selectedArea, cellSize);
    }
  }, [gameState, removingFruits, cellSize]);

  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;

  // gameState 변화 시 초기 그리기
  useEffect(() => {
    if (gameState === 'playing') {
      requestAnimationFrame(() => {
        draw();
      });
    }
  }, [gameState, draw]);

  // 타이머가 0이 되면 게임 종료
  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);

  // 초기 캔버스 설정 (마운트 시 한 번만)
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const checkAndInit = () => {
      if (canvas.isConnected) {
        setupCanvas();
        isInitializedRef.current = true;
      } else {
        requestAnimationFrame(checkAndInit);
      }
    };

    checkAndInit();
  }, [setupCanvas]);

  // 게임 루프. 이 effect가 rAF를 단독으로 소유해 루프가 겹치지 않는다.
  useEffect(() => {
    let lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval);

        if (gameState === 'playing') {
          updateAnimations();
        }

        draw();
      }

      animationIdRef.current = requestAnimationFrame(loop);
    };

    animationIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [gameState, draw, updateAnimations, frameInterval]);

  // 윈도우 리사이즈 처리
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setupCanvas();
      draw();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, draw]);

  // 컨테이너(부모) 리사이즈 감지
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      setupCanvas();
      draw();
    });
    observer.observe(parent);

    return () => observer.disconnect();
  }, [setupCanvas, draw]);

  // 캔버스가 다시 붙으면 크기부터 다시 잡는다.
  useEffect(() => {
    if (!canvasEl) return;
    setupCanvas();
  }, [canvasEl, setupCanvas]);

  // cellSize나 캔버스 엘리먼트가 바뀌면 fruitRenderer와 inputHandler를 새로 묶는다
  useEffect(() => {
    const canvas = canvasEl;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || cellSize === 0 || !gridRef.current) return;

    if (inputHandlerRef.current) {
      inputHandlerRef.current.cleanup();
    }

    fruitRendererRef.current = new FruitRenderer(canvas, ctx, cellSize, GRID_WIDTH, GRID_HEIGHT);
    inputHandlerRef.current = new InputHandler(
      canvas,
      gridRef.current,
      cellSize,
      handleSelection
    );

    return () => {
      if (inputHandlerRef.current) {
        inputHandlerRef.current.cleanup();
      }
    };
  }, [canvasEl, cellSize, handleSelection]);

  return {
    canvasRef: attachCanvas,
    gameState,
    score,
    timeLeft,
    playerNickname,
    startGame,
    restartGame,
    endGame,
  };
}
