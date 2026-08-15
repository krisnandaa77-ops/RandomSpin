import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/Toast';
import { ChevronRight, ChevronLeft, Trophy, AlertTriangle, Gift, ArrowRight, Sparkles, X } from 'lucide-react';
import { startDrumRoll, stopDrumRoll, playWinnerSound } from '../../utils/sounds';
import bgLandscapeDefault from '../../assets/bg-landscape.png';
import bgPortraitDefault from '../../assets/bg-potrait.png';
import logoCellularWorld from '../../assets/logo-cellular-world.png';

const isVideo = (url) => url && (typeof url === 'string') && (url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url));

// Fixed reference canvas for the videotron portrait deployment (tomorrow's event screen).
const PORTRAIT_STAGE_WIDTH = 768;
const PORTRAIT_STAGE_HEIGHT = 1024;

// Slot content: BIB number on top (large) and BIB name below (smaller), stacked in one column.
// Returns '?' placeholder when there's no participant to show yet.
const toSlotItem = (p) => {
  if (!p) return '?';
  return { bibNumber: p.bibNumber || '', name: p.name };
};

const SpinScreen = () => {
  const { participants, prizes, settings, winners, setWinners } = useStore();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [currentNames, setCurrentNames] = useState([]);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [countdownProgress, setCountdownProgress] = useState(0); // 0 to 1
  const [showCountdown, setShowCountdown] = useState(false);

  // Intro Showcase State
  const [showIntro, setShowIntro] = useState(false);
  const [introCount, setIntroCount] = useState(3);
  const [introAutoRun, setIntroAutoRun] = useState(true);

  // Responsive portrait state
  const [isPortrait, setIsPortrait] = useState(window.innerWidth < window.innerHeight || window.innerWidth < 768);
  const [isTabletPortrait, setIsTabletPortrait] = useState(window.innerWidth >= 600 && window.innerWidth <= 1024 && window.innerHeight >= window.innerWidth);
  
  // Confetti: cycles top-drop -> left/right side-burst -> loop, one phase at a time
  // (never both at once) so the two effects don't visually collide.
  const [confettiPhase, setConfettiPhase] = useState('top');
  const [confettiCycle, setConfettiCycle] = useState(0);
  const confettiTimerRef = useRef(null);

  // Respin state
  const [absentIndexes, setAbsentIndexes] = useState(new Set());
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);
  const [respinning, setRespinning] = useState(false);

  const spinInterval = useRef(null);
  const spinTimeout = useRef(null);
  const spinningRef = useRef(false);
  const slowdownPhase = useRef(false);
  const countdownInterval = useRef(null);
  const spinStartTime = useRef(null);
  const rafRef = useRef(null);
  const finalWinnersRef = useRef([]);
  const respinningRef = useRef(false);
  const targetIndexesRef = useRef([]);
  const runActualSpinRef = useRef(null);

  const allPrizes = prizes;

  // 'portrait' screen mode targets the fixed 768x1024 videotron canvas — layout rules
  // for that size apply regardless of the actual window the admin is previewing on.
  const isPortraitScreenMode = settings.screenMode === 'portrait';
  const effectiveIsPortrait = isPortraitScreenMode || isPortrait;
  const effectiveIsTabletPortrait = isPortraitScreenMode || isTabletPortrait;
  const effectiveBackgroundUrl = settings.backgroundUrl || (isPortraitScreenMode ? bgPortraitDefault : bgLandscapeDefault);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerWidth < window.innerHeight || window.innerWidth < 768);
      setIsTabletPortrait(window.innerWidth >= 600 && window.innerWidth <= 1024 && window.innerHeight >= window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loop confetti phases one at a time: top-drop finishes fully, then the side
  // bursts finish fully, then it repeats — kept sequential so they never overlap.
  useEffect(() => {
    clearTimeout(confettiTimerRef.current);
    if (!showWinEffect) return;

    const TOP_PHASE_MS = 7200; // covers worst case: 2s delay + 5s fall duration
    const SIDE_PHASE_MS = 5200; // covers worst case: 1.2s delay + 3.8s burst duration

    setConfettiPhase('top');
    setConfettiCycle(c => c + 1);

    const runTopPhase = () => {
      setConfettiPhase('top');
      setConfettiCycle(c => c + 1);
      confettiTimerRef.current = setTimeout(runSidesPhase, TOP_PHASE_MS);
    };
    const runSidesPhase = () => {
      setConfettiPhase('sides');
      setConfettiCycle(c => c + 1);
      confettiTimerRef.current = setTimeout(runTopPhase, SIDE_PHASE_MS);
    };
    confettiTimerRef.current = setTimeout(runSidesPhase, TOP_PHASE_MS);

    return () => clearTimeout(confettiTimerRef.current);
  }, [showWinEffect]);

  const sessions = useMemo(() => {
    const seen = new Set();
    return allPrizes
      .map(p => p.session)
      .filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  }, [allPrizes]);

  const activePrize = allPrizes.length > 0 && prizeIndex < allPrizes.length
    ? allPrizes[prizeIndex]
    : null;

  const currentSession = activePrize ? activePrize.session : sessions[0] || '';
  const prizesInSession = allPrizes.filter(p => p.session === currentSession);
  const prizeIndexInSession = activePrize ? prizesInSession.findIndex(p => p.id === activePrize.id) : 0;

  const drawnWinnersForPrize = activePrize
    ? winners.filter(w => w.prizeId === activePrize.id)
    : [];
  const isPrizeDrawn = activePrize
    ? drawnWinnersForPrize.length >= activePrize.quota
    : false;

  const isSessionComplete = prizesInSession.every(p =>
    winners.filter(w => w.prizeId === p.id).length >= p.quota
  );

  const isAllComplete = allPrizes.length > 0 && allPrizes.every(p =>
    winners.filter(w => w.prizeId === p.id).length >= p.quota
  );

  const eligibleParticipants = participants.filter(p => {
    if (!p.isPresent) return false;
    if (settings.allowDuplicate) {
      const winsForThisPrize = winners.filter(w => w.prizeId === activePrize?.id);
      return !winsForThisPrize.some(w => w.participantId === p.id);
    }
    return !winners.some(w => w.participantId === p.id);
  });

  const slotCount = activePrize ? activePrize.quota : 1;

  const getGridColumns = (count) => {
    if (effectiveIsPortrait) {
      return 1; // Selalu 1 kolom (bertumpuk atas-bawah) pada mode portrait/videotron
    }
    if (count <= 3) return count;
    if (count <= 6) return 3;
    if (count <= 9) return 3;
    if (count <= 12) return 4;
    return 5;
  };
  const gridColumns = getGridColumns(slotCount);

  const notEnoughParticipants = !isPrizeDrawn && activePrize && eligibleParticipants.length < slotCount;

  const goNextSession = () => {
    const currentSessionIdx = sessions.indexOf(currentSession);
    if (currentSessionIdx < sessions.length - 1) {
      const nextSession = sessions[currentSessionIdx + 1];
      const firstPrizeInNextSession = allPrizes.findIndex(p => p.session === nextSession);
      if (firstPrizeInNextSession >= 0) setPrizeIndex(firstPrizeInNextSession);
    }
  };

  const goToSession = (session) => {
    if (spinning || respinning) return;
    const idx = allPrizes.findIndex(p => p.session === session);
    if (idx >= 0) setPrizeIndex(idx);
  };

  const hasNextSession = sessions.indexOf(currentSession) < sessions.length - 1;
  const nextSessionName = hasNextSession ? sessions[sessions.indexOf(currentSession) + 1] : null;

  // Cleanup on prize change
  useEffect(() => {
    setSpinning(false);
    setShowWinEffect(false);
    setShowCountdown(false);
    setShowIntro(false);
    setCountdownProgress(0);
    setAbsentIndexes(new Set());
    setRespinning(false);
    spinningRef.current = false;
    respinningRef.current = false;
    slowdownPhase.current = false;
    clearInterval(spinInterval.current);
    clearTimeout(spinTimeout.current);
    clearInterval(countdownInterval.current);
    cancelAnimationFrame(rafRef.current);
    stopDrumRoll();

    if (activePrize) {
      const drawn = winners.filter(w => w.prizeId === activePrize.id);
      if (drawn.length > 0) {
        setCurrentNames(drawn.map(w => toSlotItem(w)));
        setShowWinEffect(true);
      } else {
        setCurrentNames(Array(slotCount).fill('?'));
      }
    } else {
      setCurrentNames(['?']);
    }
  }, [prizeIndex, allPrizes.length]);

  const getRandomNames = useCallback((count) => {
    const shuffled = [...eligibleParticipants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(p => toSlotItem(p));
  }, [eligibleParticipants]);

  const toggleAbsent = (index) => {
    if (spinning || !isPrizeDrawn) return;
    const next = new Set(absentIndexes);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setAbsentIndexes(next);
  };

  // ========== INTRO SHOWCASE & SPIN LOGIC ==========
  const triggerShowcase = () => {
    if (!activePrize) return;
    setIntroCount(0);
    setIntroAutoRun(false);
    setShowIntro(true);
  };

  const startSpin = () => {
    if (isPrizeDrawn) {
      toast.warning("Hadiah ini sudah selesai diundi!", { title: "Undian Selesai" });
      return;
    }
    if (!activePrize) {
      toast.error("Belum ada data hadiah! Silakan tambahkan hadiah di panel Admin terlebih dahulu.", { title: "Data Hadiah Kosong" });
      return;
    }
    if (eligibleParticipants.length < slotCount) {
      toast.error(`Peserta tersedia (${eligibleParticipants.length}) tidak cukup untuk kuota (${slotCount}). Silakan tambahkan atau aktifkan peserta di panel Admin.`, { title: "Peserta Tidak Cukup" });
      return;
    }
    setIntroCount(3);
    setIntroAutoRun(true);
    setShowIntro(true);
    startDrumRoll();
  };

  const runActualSpin = () => {
    if (isPrizeDrawn || !activePrize || eligibleParticipants.length < slotCount) return;
    setShowIntro(false);
    setSpinning(true);
    setRespinning(false);
    setAbsentIndexes(new Set());
    spinningRef.current = true;
    respinningRef.current = false;
    targetIndexesRef.current = [];
    slowdownPhase.current = false;
    setShowWinEffect(false);
    setShowCountdown(true);
    setCountdownProgress(0);
    startDrumRoll();

    const duration = (settings.spinDuration || 5) * 1000;
    spinStartTime.current = Date.now();

    // ----------------------------------------------------------------------
    // LOGIKA PENENTUAN PEMENANG (DI SINI LOKASINYA)
    // ----------------------------------------------------------------------
    // Pemenang sebenarnya sudah ditentukan di awal ketika tombol spin ditekan.
    // Kita mengambil array peserta yang memenuhi syarat (eligibleParticipants), 
    // mengacaknya menggunakan fungsi sort dan Math.random(), 
    // lalu mengambil sejumlah elemen sesuai kuota (slotCount).
    // Array ini disimpan di finalWinnersRef untuk digunakan pada saat animasi selesai.
    // ----------------------------------------------------------------------
    finalWinnersRef.current = [...eligibleParticipants].sort(() => 0.5 - Math.random()).slice(0, slotCount);

    // Smooth countdown progress via requestAnimationFrame
    const animateCountdown = () => {
      if (!spinningRef.current) return;
      const elapsed = Date.now() - spinStartTime.current;
      const progress = Math.min(elapsed / duration, 1);
      setCountdownProgress(progress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateCountdown);
      }
    };
    rafRef.current = requestAnimationFrame(animateCountdown);

    // Easing-based spin: starts fast, then directly locks onto final winners during the blinking phase
    let lastSwapTime = 0;
    let hasLockedFinal = false;

    // ----------------------------------------------------------------------
    // LOGIKA ANIMASI SPIN
    // ----------------------------------------------------------------------
    const runSpin = () => {
      if (!spinningRef.current) return;
      const elapsed = Date.now() - spinStartTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Selama progress belum 100% (progress < 1), 
      // tampilkan nama acak dengan interval 50ms (agar terlihat berputar cepat)
      if (progress < 1) {
        if (elapsed - lastSwapTime >= 50) {
          lastSwapTime = elapsed;
          setCurrentNames(getRandomNames(slotCount));
        }
      }

      // Jika progress sudah 100%, hentikan animasi dan tampilkan pemenang sebenarnya
      if (progress >= 1) {
        doFinalStop();
        return;
      }
      spinInterval.current = requestAnimationFrame(runSpin);
    };
    spinInterval.current = requestAnimationFrame(runSpin);
  };
  runActualSpinRef.current = runActualSpin;

  // Handle Intro Showcase Auto Countdown
  useEffect(() => {
    let timer = null;
    if (showIntro && introAutoRun) {
      if (introCount > 0) {
        timer = setTimeout(() => {
          setIntroCount(prev => prev - 1);
        }, 1000);
      } else {
        setShowIntro(false);
        if (runActualSpinRef.current) runActualSpinRef.current();
      }
    }
    return () => clearTimeout(timer);
  }, [showIntro, introAutoRun, introCount]);

  const startRespin = () => {
    if (spinning || absentIndexes.size === 0 || !activePrize) return;

    const disqualifiedIds = Array.from(absentIndexes)
      .map(idx => drawnWinnersForPrize[idx]?.participantId)
      .filter(Boolean);

    const lockedWinnerIds = drawnWinnersForPrize
      .filter((_, idx) => !absentIndexes.has(idx))
      .map(w => w.participantId);

    const availablePool = participants.filter(p => {
      if (!p.isPresent) return false;
      if (disqualifiedIds.includes(p.id)) return false;
      if (settings.allowDuplicate) {
        return !lockedWinnerIds.includes(p.id);
      }
      const allOtherWinnerIds = winners
        .filter(w => !Array.from(absentIndexes).map(i => drawnWinnersForPrize[i]?.id).includes(w.id))
        .map(w => w.participantId);
      return !allOtherWinnerIds.includes(p.id) && !lockedWinnerIds.includes(p.id);
    });

    const countNeeded = absentIndexes.size;
    if (availablePool.length < countNeeded) {
      toast.error(`Peserta tersedia (${availablePool.length}) tidak cukup untuk mengundi ulang ${countNeeded} slot kosong.`, { title: 'Gagal Undi Ulang' });
      return;
    }

    setSpinning(true);
    setRespinning(true);
    spinningRef.current = true;
    respinningRef.current = true;
    slowdownPhase.current = false;
    setShowWinEffect(false);
    setShowCountdown(true);
    setCountdownProgress(0);
    startDrumRoll();

    const duration = (settings.spinDuration || 5) * 1000;
    spinStartTime.current = Date.now();

    finalWinnersRef.current = [...availablePool].sort(() => 0.5 - Math.random()).slice(0, countNeeded);
    targetIndexesRef.current = Array.from(absentIndexes);

    const animateCountdown = () => {
      if (!spinningRef.current) return;
      const elapsed = Date.now() - spinStartTime.current;
      const progress = Math.min(elapsed / duration, 1);
      setCountdownProgress(progress);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateCountdown);
      }
    };
    rafRef.current = requestAnimationFrame(animateCountdown);

    let lastSwapTime = 0;
    let hasLockedFinal = false;

    const runRespin = () => {
      if (!spinningRef.current) return;
      const elapsed = Date.now() - spinStartTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Keep rotating names rapidly until the very end
      if (progress < 1) {
        if (elapsed - lastSwapTime >= 50) {
          lastSwapTime = elapsed;
          const randomPool = [...availablePool].sort(() => 0.5 - Math.random());
          setCurrentNames(prevNames => {
            const nextNames = [...prevNames];
            targetIndexesRef.current.forEach((slotIdx, i) => {
              nextNames[slotIdx] = toSlotItem(randomPool[i % randomPool.length]);
            });
            return nextNames;
          });
        }
      }

      if (progress >= 1) {
        doFinalStop();
        return;
      }
      spinInterval.current = requestAnimationFrame(runRespin);
    };
    spinInterval.current = requestAnimationFrame(runRespin);
  };

  // ----------------------------------------------------------------------
  // LOGIKA PENYELESAIAN SPIN DAN PENYIMPANAN DATA
  // ----------------------------------------------------------------------
  const doFinalStop = () => {
    if (!spinningRef.current) return;
    spinningRef.current = false;
    slowdownPhase.current = false;

    // Hentikan semua animasi dan timer
    cancelAnimationFrame(spinInterval.current);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(spinTimeout.current);
    clearInterval(countdownInterval.current);

    stopDrumRoll();
    playWinnerSound();

    const timestamp = new Date().toISOString();

    if (respinningRef.current) {
      const newWinners = finalWinnersRef.current;
      const targetIndices = targetIndexesRef.current;

      setCurrentNames(prevNames => {
        const updated = [...prevNames];
        targetIndices.forEach((slotIdx, i) => {
          if (newWinners[i]) {
            updated[slotIdx] = toSlotItem(newWinners[i]);
          }
        });
        return updated;
      });

      setWinners(prev => {
        const nextWinners = [...prev];
        targetIndices.forEach((slotIdx, i) => {
          const oldWinnerRecord = drawnWinnersForPrize[slotIdx];
          const replacementPerson = newWinners[i];
          if (!replacementPerson) return;

          const newRecord = {
            id: `win-${Date.now()}-${Math.random()}`,
            participantId: replacementPerson.id,
            bibNumber: replacementPerson.bibNumber,
            name: replacementPerson.name,
            prizeName: activePrize.name,
            prizeId: activePrize.id,
            session: activePrize.session,
            timestamp
          };

          if (oldWinnerRecord) {
            const indexInPrev = nextWinners.findIndex(w => w.id === oldWinnerRecord.id);
            if (indexInPrev !== -1) {
              nextWinners[indexInPrev] = newRecord;
            } else {
              nextWinners.push(newRecord);
            }
          } else {
            nextWinners.push(newRecord);
          }
        });
        return nextWinners;
      });

      setRespinning(false);
      respinningRef.current = false;
      setAbsentIndexes(new Set());
    } else {
      // ----------------------------------------------------------------------
      // PENENTUAN PEMENANG AKHIR (BUKAN RESPIN)
      // ----------------------------------------------------------------------
      // Mengambil pemenang yang sudah ditentukan di awal (finalWinnersRef)
      const finalWinners = finalWinnersRef.current;
      
      // Update UI untuk menampilkan nama pemenang asli
      setCurrentNames(finalWinners.map(p => toSlotItem(p)));

      // Bentuk data record pemenang untuk disimpan
      const newWinnerRecords = finalWinners.map(w => ({
        id: `win-${Date.now()}-${Math.random()}`,
        participantId: w.id,
        bibNumber: w.bibNumber,
        name: w.name,
        prizeName: activePrize.name,
        prizeId: activePrize.id,
        session: activePrize.session,
        timestamp
      }));
      
      // Tambahkan pemenang ke state global/context (setWinners)
      setWinners(prev => [...prev, ...newWinnerRecords]);
    }

    setSpinning(false);
    setShowWinEffect(true);
    setCountdownProgress(1);

    setTimeout(() => setShowCountdown(false), 800);
  };

  const stopSpin = () => {
    if (!spinningRef.current) return;

    cancelAnimationFrame(spinInterval.current);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(spinTimeout.current);

    slowdownPhase.current = true;

    // Directly lock onto final winners without any further random name swaps during slowdown/blinking
    if (respinningRef.current) {
      setCurrentNames(prevNames => {
        const nextNames = [...prevNames];
        targetIndexesRef.current.forEach((slotIdx, i) => {
          nextNames[slotIdx] = toSlotItem(finalWinnersRef.current[i]);
        });
        return nextNames;
      });
    } else {
      const finals = finalWinnersRef.current.map(p => toSlotItem(p));
      setCurrentNames(finals);
    }

    // Allow the locked winning names to blink/pulse for 800ms before finalizing
    spinTimeout.current = setTimeout(() => {
      doFinalStop();
    }, 800);
  };

  const goNextPrize = () => {
    if (prizeIndex < allPrizes.length - 1) setPrizeIndex(prizeIndex + 1);
  };
  const goPrevPrize = () => {
    if (prizeIndex > 0) setPrizeIndex(prizeIndex - 1);
  };

  // BIB number sits on top and is the dominant element in the slot.
  const getBibNumberFontSize = () => {
    if (effectiveIsPortrait) {
      if (effectiveIsTabletPortrait) {
        if (slotCount <= 2) return 'clamp(1.8rem, 5.2vw, 2.8rem)';
        if (slotCount <= 4) return 'clamp(1.8rem, 5.2vw, 2.8rem)';
        if (slotCount <= 6) return 'clamp(1.5rem, 4.4vw, 2.2rem)';
        return 'clamp(1.2rem, 3.8vw, 1.8rem)';
      }
      if (slotCount <= 2) return 'clamp(1.9rem, 7.5vw, 3.4rem)';
      if (slotCount <= 6) return 'clamp(1.5rem, 5.6vw, 2.4rem)';
      return 'clamp(1.15rem, 4.4vw, 1.8rem)';
    }
    if (slotCount <= 3) return 'clamp(2.2rem, 3.8vw, 3.6rem)';
    if (slotCount <= 6) return 'clamp(1.7rem, 3vw, 2.6rem)';
    if (slotCount <= 10) return 'clamp(1.3rem, 2.2vw, 1.9rem)';
    return 'clamp(1.1rem, 1.8vw, 1.5rem)';
  };

  // BIB name sits below the number, noticeably smaller so long names don't dominate the slot.
  const getBibNameFontSize = () => {
    if (effectiveIsPortrait) {
      if (effectiveIsTabletPortrait) {
        if (slotCount <= 2) return 'clamp(0.85rem, 2.2vw, 1.2rem)';
        if (slotCount <= 4) return 'clamp(0.85rem, 2.2vw, 1.2rem)';
        if (slotCount <= 6) return 'clamp(0.75rem, 1.9vw, 1.05rem)';
        return 'clamp(0.65rem, 1.6vw, 0.9rem)';
      }
      if (slotCount <= 2) return 'clamp(0.9rem, 3vw, 1.4rem)';
      if (slotCount <= 6) return 'clamp(0.75rem, 2.2vw, 1.05rem)';
      return 'clamp(0.62rem, 1.8vw, 0.85rem)';
    }
    if (slotCount <= 3) return 'clamp(1rem, 1.7vw, 1.5rem)';
    if (slotCount <= 6) return 'clamp(0.8rem, 1.3vw, 1.15rem)';
    if (slotCount <= 10) return 'clamp(0.65rem, 1vw, 0.9rem)';
    return 'clamp(0.55rem, 0.85vw, 0.75rem)';
  };

  const isFirstPrize = prizeIndex === 0;
  const isLastPrize = prizeIndex >= allPrizes.length - 1;

  return (
    <div
      className={`spin-stage ${isPortraitScreenMode ? 'spin-stage-portrait' : ''}`}
      style={isPortraitScreenMode ? { '--stage-w': PORTRAIT_STAGE_WIDTH, '--stage-h': PORTRAIT_STAGE_HEIGHT } : undefined}
    >
    <div className={`spin-container ${isPortraitScreenMode ? 'spin-container-portrait-locked' : ''} ${(!effectiveBackgroundUrl) ? 'spin-container-default-bg' : ''}`} style={{
      position: 'relative',
      overflow: 'auto',
      backgroundImage: (!isVideo(effectiveBackgroundUrl) && effectiveBackgroundUrl) ? `url(${effectiveBackgroundUrl})` : 'none'
    }}>
      {isVideo(effectiveBackgroundUrl) && (
        <video
          src={effectiveBackgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          className="spin-video-background"
        />
      )}
      <div className="spin-overlay" style={{ backgroundColor: `rgba(0, 0, 0, ${settings.overlayOpacity || 0.4})`, zIndex: 1, pointerEvents: 'none' }}></div>

      {/* Confetti Effect: top-drop and left/right side-bursts alternate, never at once */}
      {showWinEffect && (
        <div className="confetti-container">
          {confettiPhase === 'top' ? (
            Array.from({ length: 60 }).map((_, i) => (
              <div
                key={`top-${confettiCycle}-${i}`}
                className="confetti-piece confetti-piece-top"
                style={{
                  '--x': `${Math.random() * 100}vw`,
                  '--delay': `${Math.random() * 2}s`,
                  '--duration': `${2 + Math.random() * 3}s`,
                  '--rotation': `${Math.random() * 720 - 360}deg`,
                  '--color': ['#fbbf24', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#f97316', '#14b8a6'][i % 8],
                  '--size': `${6 + Math.random() * 8}px`,
                }}
              />
            ))
          ) : (
            <>
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={`left-${confettiCycle}-${i}`}
                  className="confetti-piece confetti-piece-left"
                  style={{
                    '--y': `${5 + Math.random() * 70}vh`,
                    '--delay': `${Math.random() * 1.2}s`,
                    '--duration': `${1.8 + Math.random() * 2}s`,
                    '--rotation': `${Math.random() * 720 - 360}deg`,
                    '--travel-x': `${45 + Math.random() * 35}vw`,
                    '--travel-y': `${20 + Math.random() * 45}vh`,
                    '--color': ['#fbbf24', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#f97316', '#14b8a6'][i % 8],
                    '--size': `${6 + Math.random() * 8}px`,
                  }}
                />
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={`right-${confettiCycle}-${i}`}
                  className="confetti-piece confetti-piece-right"
                  style={{
                    '--y': `${5 + Math.random() * 70}vh`,
                    '--delay': `${Math.random() * 1.2}s`,
                    '--duration': `${1.8 + Math.random() * 2}s`,
                    '--rotation': `${Math.random() * -720 + 360}deg`,
                    '--travel-x': `-${45 + Math.random() * 35}vw`,
                    '--travel-y': `${20 + Math.random() * 45}vh`,
                    '--color': ['#fbbf24', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#f97316', '#14b8a6'][i % 8],
                    '--size': `${6 + Math.random() * 8}px`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}

      <div className="spin-content">
        {/* Header */}
        <div className="spin-header">
          <motion.img
            src={logoCellularWorld}
            alt="Cellular World Merdeka Run"
            className="spin-logo"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
            className="spin-title" 
            style={{ color: settings.titleColor || '#ffffff', background: 'none', WebkitTextFillColor: 'unset' }}
          >
            {settings.title}
          </motion.h1>
        </div>

        {/* Current Prize Info */}
        <AnimatePresence mode="wait">
        {activePrize && (
          <motion.div 
            key={activePrize.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4 }}
            className="prize-info-bar"
          >
            <div className="prize-info-main">
              {activePrize.image && (
                <img src={activePrize.image} alt={activePrize.name} className="prize-info-image" />
              )}
              <div>
                <h2 className="prize-info-name" style={{ color: settings.prizeTextColor || '#ffffff' }}>
                  {activePrize.name}
                </h2>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div className="prize-info-status">
                <span>Peserta: <strong>{eligibleParticipants.length}</strong></span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-showcase" 
                onClick={triggerShowcase}
                title="Tampilkan Popup Intro Hadiah (Layar Penuh)"
              >
                <Sparkles size={18} /> Intro Hadiah
              </motion.button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Prize dots within session */}
        {prizesInSession.length > 1 && (
          <div className="prize-nav-indicator">
            {prizesInSession.map((p, i) => {
              const globalIdx = allPrizes.findIndex(ap => ap.id === p.id);
              const drawn = winners.filter(w => w.prizeId === p.id).length >= p.quota;
              return (
                <div
                  key={p.id}
                  className={`prize-dot ${globalIdx === prizeIndex ? 'active' : ''} ${drawn ? 'done' : ''}`}
                  onClick={() => { if (!spinning) setPrizeIndex(globalIdx); }}
                  title={p.name}
                >
                  {drawn ? '✓' : i + 1}
                </div>
              );
            })}
          </div>
        )}

        {/* Session Tabs */}
        {sessions.length > 1 && (
          <div className="session-tabs">
            {sessions.map(s => {
              const sessionPrizes = allPrizes.filter(p => p.session === s);
              const sessionDone = sessionPrizes.every(p => winners.filter(w => w.prizeId === p.id).length >= p.quota);
              return (
                <button
                  key={s}
                  className={`session-tab ${s === currentSession ? 'active' : ''} ${sessionDone ? 'done' : ''}`}
                  onClick={() => goToSession(s)}
                  disabled={spinning}
                >
                  {sessionDone && <Trophy size={14} />}
                  {s}
                </button>
              );
            })}
          </div>
        )}

        {/* Not enough participants / No prize warning */}
        {!activePrize && (
          <div className="spin-warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#fca5a5', marginBottom: '16px' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <span>Belum ada data hadiah untuk diundi. Silakan tambahkan hadiah di panel Admin terlebih dahulu.</span>
          </div>
        )}
        {notEnoughParticipants && (
          <div className="spin-warning">
            <AlertTriangle size={20} />
            <span>Peserta tersedia ({eligibleParticipants.length}) kurang dari kuota ({slotCount}).</span>
          </div>
        )}

        {/* Winner Grid */}
        <div className="spin-grid-wrapper">
          {allPrizes.length > 1 && (
            <button
              className="btn-nav btn-nav-prev"
              onClick={goPrevPrize}
              disabled={isFirstPrize || spinning}
              style={{ opacity: isFirstPrize || spinning ? 0.2 : 1 }}
            >
              <ChevronLeft size={36} />
            </button>
          )}

          <div className="spin-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {currentNames.map((name, index) => {
              const isAbsent = !spinning && !respinning && absentIndexes.has(index);
              const isRespinTarget = respinning && targetIndexesRef.current.includes(index);
              const isLocked = respinning && !isRespinTarget;
              const isInteractive = isPrizeDrawn && !spinning && !respinning;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.5, y: 40, rotateX: 90 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.8, type: 'spring', bounce: 0.4 }}
                  className={`winner-slot ${spinning && (!respinning || isRespinTarget) ? 'spinning' : ''} ${showWinEffect && !isAbsent && !respinning ? 'winner' : ''} ${isAbsent ? 'absent' : ''} ${isLocked ? 'locked' : ''} ${isInteractive ? 'interactive' : ''}`}
                  style={{
                    padding: slotCount > 6 ? '14px 18px' : '18px 28px',
                    color: settings.slotText || '#ffffff',
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    ...(settings.slotBg && settings.slotBg !== 'rgba(30, 41, 59, 0.8)' ? { background: settings.slotBg } : {}),
                    ...(settings.slotBorder && settings.slotBorder !== 'rgba(255, 255, 255, 0.2)' ? { borderColor: settings.slotBorder } : {})
                  }}
                  onClick={() => isInteractive && toggleAbsent(index)}
                  onMouseEnter={() => isInteractive && setHoveredSlotIndex(index)}
                  onMouseLeave={() => setHoveredSlotIndex(prev => (prev === index ? null : prev))}
                  title={isInteractive ? (isAbsent ? "Klik untuk membatalkan status tidak hadir" : "Klik jika pemenang tidak hadir untuk diundi ulang") : ""}
                  whileHover={isInteractive ? { scale: 1.02, boxShadow: "0 15px 35px rgba(0,0,0,0.6)" } : {}}
                  whileTap={isInteractive ? { scale: 0.98 } : {}}
                >
                  <AnimatePresence>
                    {isInteractive && !isAbsent && hoveredSlotIndex === index && (
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="slot-hint-badge"
                      >
                        ❌ Tandai Tidak Hadir
                      </motion.span>
                    )}
                    {isAbsent && (
                      <motion.span 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        exit={{ scale: 0 }}
                        className="slot-badge slot-badge-absent"
                      >
                        ❌ Tidak Hadir
                      </motion.span>
                    )}
                    {isLocked && (
                      <motion.span 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        exit={{ scale: 0 }}
                        className="slot-badge slot-badge-locked"
                      >
                        🔒 Sah
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <div className="slot-inner">
                    {name && typeof name === 'object' ? (
                      <div className="slot-bib-stack">
                        {name.bibNumber && (
                          <span className="slot-bib-number" style={{ fontSize: getBibNumberFontSize() }}>{name.bibNumber}</span>
                        )}
                        <span className="slot-bib-name" style={{ fontSize: getBibNameFontSize() }}>{name.name}</span>
                      </div>
                    ) : (
                      <span className="slot-inner-text" style={{ fontSize: getBibNumberFontSize() }}>{name}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {allPrizes.length > 1 && (
            <button
              className="btn-nav btn-nav-next"
              onClick={goNextPrize}
              disabled={isLastPrize || spinning}
              style={{ opacity: isLastPrize || spinning ? 0.2 : 1 }}
            >
              <ChevronRight size={36} />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="spin-controls">
          {showCountdown && (
            <div className="spin-progress-footer">
              <div className="spin-progress-track">
                <svg className="spin-flag spin-flag-start" viewBox="0 0 20 26" width="18" height="24">
                  <line x1="2" y1="2" x2="2" y2="25" stroke="#cbd5e1" strokeWidth="1.6" />
                  <path d="M2 2 L17 6 L2 11 Z" fill="#ef4444" />
                </svg>
                <div className="spin-progress-line">
                  <div
                    className="spin-progress-runner"
                    style={{ left: `${Math.min(100, Math.max(0, countdownProgress * 100))}%` }}
                  >
                    <svg className="runner-figure" viewBox="0 0 40 58" width="34" height="49">
                      {/* Back leg (thigh + shin + shoe) */}
                      <g className="runner-leg-back-g">
                        <rect x="18" y="31" width="4.2" height="11" rx="2.1" fill="#111827" />
                        <rect x="17.8" y="41" width="3.8" height="9.5" rx="1.9" fill="#1f2937" />
                        <ellipse cx="19.7" cy="52" rx="4.4" ry="2.3" fill="#f8fafc" />
                        <rect x="15.6" y="52.4" width="8.6" height="1.3" rx="0.65" fill="#cbd5e1" />
                      </g>
                      {/* Back arm (sleeve + forearm + hand) */}
                      <g className="runner-arm-back-g">
                        <rect x="19.6" y="17" width="3.4" height="8.5" rx="1.7" fill="#b91c1c" />
                        <rect x="19.6" y="24.7" width="3" height="7.5" rx="1.5" fill="#e3ac81" />
                        <circle cx="21.1" cy="32.6" r="1.7" fill="#e3ac81" />
                      </g>
                      {/* Torso (red shirt) leaning slightly forward */}
                      <rect x="16.6" y="14.5" width="11" height="16.5" rx="5" fill="#dc2626" transform="rotate(9 22.1 22.75)" />
                      {/* Shorts connecting torso to hips */}
                      <rect x="16.2" y="26.5" width="11.8" height="7" rx="3.5" fill="#111827" transform="rotate(9 22.1 30)" />
                      {/* Front arm (sleeve + forearm + hand) */}
                      <g className="runner-arm-front-g">
                        <rect x="19.6" y="17" width="3.4" height="8.5" rx="1.7" fill="#ef4444" />
                        <rect x="19.6" y="24.7" width="3" height="7.5" rx="1.5" fill="#f3c9a4" />
                        <circle cx="21.1" cy="32.6" r="1.7" fill="#f3c9a4" />
                      </g>
                      {/* Front leg (thigh + shin + shoe) */}
                      <g className="runner-leg-front-g">
                        <rect x="18" y="31" width="4.2" height="11" rx="2.1" fill="#1f2937" />
                        <rect x="17.8" y="41" width="3.8" height="9.5" rx="1.9" fill="#111827" />
                        <ellipse cx="19.7" cy="52" rx="4.4" ry="2.3" fill="#ffffff" />
                        <rect x="15.6" y="52.4" width="8.6" height="1.3" rx="0.65" fill="#e2e8f0" />
                      </g>
                      {/* Head */}
                      <circle className="runner-head" cx="22" cy="8.4" r="5.3" fill="#f3c9a4" />
                      <path d="M16.9 6.6 Q22 2 27.1 6.6 Q27.1 3.4 22 3 Q16.9 3.4 16.9 6.6 Z" fill="#1f2937" />
                    </svg>
                  </div>
                </div>
                <svg className="spin-flag spin-flag-finish" viewBox="0 0 20 26" width="18" height="24">
                  <line x1="2" y1="2" x2="2" y2="25" stroke="#cbd5e1" strokeWidth="1.6" />
                  <clipPath id="spinFinishFlagClip"><path d="M2 2 L17 6 L2 11 Z" /></clipPath>
                  <g clipPath="url(#spinFinishFlagClip)">
                    <rect x="2" y="2" width="15" height="9" fill="#f8fafc" />
                    <rect x="2" y="2" width="3.75" height="3" fill="#111827" />
                    <rect x="9.5" y="2" width="3.75" height="3" fill="#111827" />
                    <rect x="5.75" y="5" width="3.75" height="3" fill="#111827" />
                    <rect x="13.25" y="5" width="3.75" height="3" fill="#111827" />
                    <rect x="2" y="8" width="3.75" height="3" fill="#111827" />
                    <rect x="9.5" y="8" width="3.75" height="3" fill="#111827" />
                  </g>
                </svg>
              </div>
              <div className="spin-progress-percent">
                {Math.round(Math.min(100, Math.max(0, countdownProgress * 100)))}%
              </div>
              <div className="spin-progress-bar-track">
                <div
                  className="spin-progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, countdownProgress * 100))}%` }}
                />
              </div>
            </div>
          )}
          {isPrizeDrawn || isAllComplete ? (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', flexDirection: 'column', width: '100%' }}>
              {absentIndexes.size > 0 && !spinning && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '8px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="btn btn-spin-action btn-respin" 
                    onClick={startRespin}
                  >
                    🎲 Undi Ulang ({absentIndexes.size} Slot Kosong)
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="btn btn-respin-cancel" 
                    onClick={() => setAbsentIndexes(new Set())}
                  >
                    Batal Tandai
                  </motion.button>
                </div>
              )}

              {absentIndexes.size === 0 && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {isAllComplete && allPrizes.length > 0 && prizeIndex === allPrizes.length - 1 ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="spin-complete-msg"
                    >
                      <Trophy size={18} style={{ flexShrink: 0, color: '#fbbf24' }} />
                      <span>Semua hadiah sudah diundi! Selamat kepada para pemenang! 🎉</span>
                    </motion.div>
                  ) : null}

                  {isSessionComplete && hasNextSession && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="btn btn-spin-action btn-next-session" 
                      onClick={goNextSession}
                    >
                      <ArrowRight size={22} /> Lanjut ke {nextSessionName}
                    </motion.button>
                  )}

                  {!isLastPrize && !(isSessionComplete && hasNextSession) && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="btn btn-spin-action btn-next-prize" 
                      onClick={goNextPrize}
                    >
                      Hadiah Selanjutnya <ChevronRight size={22} />
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          ) : !activePrize ? (
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-spin-action btn-start" 
              onClick={startSpin} 
              style={{ backgroundColor: '#ef4444', opacity: 0.85, cursor: 'pointer' }}
              title="Klik untuk melihat penjelasan error"
            >
              ⚠️ Hadiah Kosong
            </motion.button>
          ) : notEnoughParticipants ? (
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-spin-action btn-start" 
              onClick={startSpin} 
              style={{ backgroundColor: '#f59e0b', opacity: 0.85, cursor: 'pointer', color: '#ffffff' }}
              title="Klik untuk melihat penjelasan error"
            >
              ⚠️ Peserta Tidak Cukup ({eligibleParticipants.length}/{slotCount})
            </motion.button>
          ) : !spinning ? (
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(16,185,129,0.8)" }} 
              whileTap={{ scale: 0.95 }}
              className="btn btn-spin-action btn-start" 
              onClick={startSpin} 
              style={{ backgroundColor: settings.btnColor || '#10b981' }}
            >
              Mulai Acak
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(239,68,68,0.8)" }} 
              whileTap={{ scale: 0.95 }}
              className="btn btn-spin-action btn-stop" 
              onClick={stopSpin}
            >
              Berhenti
            </motion.button>
          )}
        </div>
      </div>

      {/* Intro Showcase Popup (Transparent PNG & 3D Floating Reveal) */}
      {showIntro && activePrize && (
        <div className="intro-popup-overlay">
          <div className="intro-popup-bg-glow" />
          <div
            className="intro-popup-card"
            style={{
              backgroundImage: !isVideo(effectiveBackgroundUrl) ? `url(${effectiveBackgroundUrl})` : 'none',
            }}
          >
            <div className="intro-popup-card-shade" />
            <div className="intro-spotlight-top" />
            
            <div className="intro-session-badge">
              <span>★ {activePrize.session || 'GRAND PRIZE'} ★</span>
            </div>

            <div className="intro-prize-stage">
              <div className="intro-pedestal-light" />
              {activePrize.image ? (
                <img 
                  src={activePrize.image} 
                  alt={activePrize.name} 
                  className="intro-prize-png-floating"
                />
              ) : (
                <div className="intro-prize-fallback-floating">
                  <Gift size={130} color="#fbbf24" />
                </div>
              )}
              <div className="intro-pedestal-shadow" />
            </div>

            <h1 className="intro-prize-heading" style={{ color: settings.titleColor || '#ffffff' }}>
              {activePrize.name}
            </h1>
            
            <div className="intro-quota-badge">
              MEMPEREBUTKAN <strong>{activePrize.quota} PEMENANG</strong>
            </div>

            <div className="intro-actions">
              {introAutoRun ? (
                <div className="intro-autorun-box">
                  <div className="intro-countdown-timer">
                    <span className="intro-timer-num">{introCount}</span>
                    <span className="intro-timer-text">MENGUNDI DALAM {introCount} DETIK...</span>
                  </div>
                  <button 
                    className="btn btn-intro-skip" 
                    onClick={() => { setShowIntro(false); if (runActualSpinRef.current) runActualSpinRef.current(); }}
                  >
                    ⚡ LEWATKAN & UNDI SEKARANG
                  </button>
                </div>
              ) : (
                <div className="intro-manual-box">
                  {!isPrizeDrawn && !notEnoughParticipants && (
                    <button
                      className="btn btn-spin-action btn-start-from-intro"
                      onClick={() => { setShowIntro(false); if (runActualSpinRef.current) runActualSpinRef.current(); }}
                      style={{ backgroundColor: settings.btnColor || '#10b981' }}
                    >
                      🎲 Mulai Acak Sekarang
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              className="intro-popup-close"
              onClick={() => setShowIntro(false)}
              title="Tutup Showcase"
              aria-label="Tutup Showcase"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default SpinScreen;
