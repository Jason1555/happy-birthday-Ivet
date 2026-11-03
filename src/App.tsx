import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG, DEFAULT_CARD_CONFIG, type CardConfig } from './config';
import type { AppState, PortraitPlan } from './types';
import { CandleScene } from './components/CandleScene';
import { PaintingScene } from './components/PaintingScene';
import { BirthdayMessage } from './components/BirthdayMessage';
import { Celebration } from './components/Celebration';
import { SettingsModal } from './components/SettingsModal';
import { SoftAudio } from './utils/audio';
import { loadPortrait, buildPortraitPlan } from './utils/imageProcessing';
import './styles.css';

const STORAGE_CONFIG_KEY = 'birthday_card_config_en_v1';
const STORAGE_PHOTO_KEY = 'birthday_card_photo_en_v1';

function loadStoredConfig(): CardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CARD_CONFIG, ...parsed };
    }
  } catch {
    /* fallback to defaults */
  }
  return DEFAULT_CARD_CONFIG;
}

function loadStoredPhoto(): string | null {
  try {
    return localStorage.getItem(STORAGE_PHOTO_KEY);
  } catch {
    return null;
  }
}

function App() {
  const [state, setState] = useState<AppState>('INTRO');
  const [muted, setMuted] = useState(!CONFIG.enableSound);
  const [replayKey, setReplayKey] = useState(0);
  const [audio] = useState(() => new SoftAudio());
  const [cardConfig, setCardConfig] = useState<CardConfig>(loadStoredConfig);
  const [photoUrl, setPhotoUrl] = useState<string | null>(loadStoredPhoto);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preloadedPlan, setPreloadedPlan] = useState<PortraitPlan | null>(null);

  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => setState('CANDLE'));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  useEffect(() => clearTimers, []);

  // Фоновая предгенерация плана картины, пока горит свеча
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const image = await loadPortrait(photoUrl || CONFIG.portraitPath);
        if (cancelled) return;
        const nw = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth;
        const nh = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight;
        const plan = await buildPortraitPlan(
          image,
          nw,
          nh,
          cardConfig.signature
        );
        if (!cancelled) setPreloadedPlan(plan);
      } catch (err) {
        console.warn('Preload failed, will compute during transition:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUrl, cardConfig.signature]);

  // Звук будится прямо в клике, иначе мобильные браузеры его не пустят.
  const startBlow = useCallback(() => {
    audio.unlock();
    audio.blow();
  }, [audio]);

  const blown = useCallback(() => {
    setState('BLOWING_CANDLE');
    later(() => setState('TRANSITION'), 1100);
    later(() => setState('PAINTING'), 1900);
  }, []);

  const finished = useCallback(() => {
    audio.finish();
    setState('FINAL_STROKE');
    later(() => setState('BIRTHDAY_MESSAGE'), 900);
    later(() => setState('CELEBRATION'), 1500);
  }, [audio]);

  const reset = useCallback(() => {
    clearTimers();
    audio.stopBrush();
    setState('INTRO');
    setReplayKey((k) => k + 1);
    requestAnimationFrame(() => setState('CANDLE'));
  }, [audio]);

  const handleSaveSettings = (newConfig: CardConfig, newPhotoUrl: string | null) => {
    setCardConfig(newConfig);
    setPhotoUrl(newPhotoUrl);
    setPreloadedPlan(null);
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
      if (newPhotoUrl) {
        localStorage.setItem(STORAGE_PHOTO_KEY, newPhotoUrl);
      } else {
        localStorage.removeItem(STORAGE_PHOTO_KEY);
      }
    } catch {
      /* ignore storage quota */
    }
    reset();
  };

  const handleResetSettings = () => {
    setCardConfig(DEFAULT_CARD_CONFIG);
    setPhotoUrl(null);
    setPreloadedPlan(null);
    try {
      localStorage.removeItem(STORAGE_CONFIG_KEY);
      localStorage.removeItem(STORAGE_PHOTO_KEY);
    } catch {
      /* ignore */
    }
    reset();
  };

  const paintingVisible =
    state === 'PAINTING' ||
    state === 'FINAL_STROKE' ||
    state === 'BIRTHDAY_MESSAGE' ||
    state === 'CELEBRATION';
  const messageVisible = state === 'BIRTHDAY_MESSAGE' || state === 'CELEBRATION';

  return (
    <main className={`app state-${state.toLowerCase()}`} key={replayKey}>
      {!paintingVisible && (
        <CandleScene
          onStart={startBlow}
          onBlow={blown}
          muted={muted}
          onMute={() => setMuted((v) => !v)}
          onCustomize={() => setIsSettingsOpen(true)}
          hasCustomPhoto={Boolean(photoUrl)}
        />
      )}

      {paintingVisible && (
        <PaintingScene
          onFinished={finished}
          audio={audio}
          photoUrl={photoUrl}
          cardConfig={cardConfig}
          preloadedPlan={preloadedPlan}
        />
      )}

      <BirthdayMessage
        visible={messageVisible}
        onReplay={reset}
        config={cardConfig}
        onCustomize={() => setIsSettingsOpen(true)}
      />

      <Celebration active={state === 'CELEBRATION'} />

      <div className="grain" aria-hidden="true" />
    </main>
  );
}

export default App;
