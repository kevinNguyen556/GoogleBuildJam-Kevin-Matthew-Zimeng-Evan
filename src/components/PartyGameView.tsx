import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Gamepad2,
  Users,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Zap,
  Award,
} from 'lucide-react';
import { Photo, Friend, OffLimitsZone } from '../types';
import confetti from 'canvas-confetti';

interface PartyGameViewProps {
  photos: Photo[];
  friends: Friend[];
  offLimitsZones: OffLimitsZone[];
  onMarkPhotosGameReady: (photoIds: string[]) => void;
}

type GameVariant = 'standard' | 'whose_photo' | 'rapid_fire' | 'co_op';

interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
}

export const PartyGameView: React.FC<PartyGameViewProps> = ({
  photos,
  friends,
  offLimitsZones,
  onMarkPhotosGameReady,
}) => {
  // Game Setup States
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'round_reveal' | 'finished'>('setup');
  const [numRounds, setNumRounds] = useState<number>(5);
  const [timerSetting, setTimerSetting] = useState<number>(45); // 0 = off, 15, 30, 45, 60
  const [variant, setVariant] = useState<GameVariant>('standard');

  // Selected player IDs (default: You + friends)
  const allAvailablePlayers: Player[] = useMemo(() => {
    return [
      {
        id: 'user',
        name: 'You (The Wayfarer)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        color: '#B83A28',
        score: 0,
      },
      ...friends.map((f, i) => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        color: ['#235478', '#4A7C59', '#C28B38'][i % 3],
        score: 0,
      })),
    ];
  }, [friends]);

  const [activePlayerIds, setActivePlayerIds] = useState<string[]>(['user', friends[0]?.id || 'friend-clara']);

  // Valid Pool of Photos: gameReady = true, has GPS, and NOT inside any off-limits zone!
  const validPhotoPool = useMemo(() => {
    return photos.filter((p) => {
      if (!p.gameReady || !p.isPlaced || p.latitude === null || p.longitude === null) return false;
      if (p.isOffLimits) return false;
      return true;
    });
  }, [photos]);

  // Round tracking
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [roundPhotos, setRoundPhotos] = useState<Photo[]>([]);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState<number>(0);
  const [roundGuesses, setRoundGuesses] = useState<Record<string, { lat: number; lng: number; distanceKm: number; score: number }>>({});
  const [currentGuessCoords, setCurrentGuessCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(timerSetting);
  const [players, setPlayers] = useState<Player[]>(allAvailablePlayers);

  // Variant "Whose photo is it?" state
  const [whosePhotoGuess, setWhosePhotoGuess] = useState<string>('');

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const revealLayersRef = useRef<L.LayerGroup | null>(null);

  const activePlayers = useMemo(() => {
    return players.filter((p) => activePlayerIds.includes(p.id));
  }, [players, activePlayerIds]);

  const currentPhoto = roundPhotos[currentRoundIndex];
  const currentTurnPlayer = activePlayers[turnPlayerIndex];

  // Start Game
  const handleStartGame = () => {
    if (validPhotoPool.length === 0) return;

    // Shuffle and pick rounds
    const shuffled = [...validPhotoPool].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(numRounds, shuffled.length));

    // Reset scores
    setPlayers(allAvailablePlayers.map((p) => ({ ...p, score: 0 })));
    setRoundPhotos(picked);
    setCurrentRoundIndex(0);
    setTurnPlayerIndex(0);
    setRoundGuesses({});
    setCurrentGuessCoords(null);
    setTimeLeft(variant === 'rapid_fire' ? 15 : timerSetting);
    setGameState('playing');
  };

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing' || timerSetting === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired, auto confirm guess or zero
          handleConfirmTurnGuess();
          return variant === 'rapid_fire' ? 15 : timerSetting;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, turnPlayerIndex, timerSetting, currentGuessCoords]);

  // Leaflet Map Initialization during Playing or Reveal
  useEffect(() => {
    if ((gameState !== 'playing' && gameState !== 'round_reveal') || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapContainerRef.current!, {
        center: [30, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 16,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Wayfarer Party',
      }).addTo(map);

      const revealLayers = L.layerGroup().addTo(map);
      revealLayersRef.current = revealLayers;

      // Handle map click during player turn
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (gameState !== 'playing') return;
        const { lat, lng } = e.latlng;
        setCurrentGuessCoords({ lat, lng });

        if (guessMarkerRef.current) {
          guessMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const pinColor = currentTurnPlayer?.color || '#B83A28';
          const icon = L.divIcon({
            className: 'custom-party-guess-pin',
            html: `
              <div class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold" style="background-color: ${pinColor}">
                📍
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          });
          guessMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
      });

      mapRef.current = map;

      // If in Round Reveal state: display all players' pins + answer pin + connecting lines
      if (gameState === 'round_reveal' && currentPhoto) {
        const actualLat = currentPhoto.latitude!;
        const actualLon = currentPhoto.longitude!;

        // Answer pin
        const starIcon = L.divIcon({
          className: 'custom-answer-star',
          html: `
            <div class="w-8 h-8 rounded-full bg-[#B83A28] border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-bold animate-bounce">
              ★
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        const ansMarker = L.marker([actualLat, actualLon], { icon: starIcon }).addTo(revealLayers);
        ansMarker.bindPopup(`<strong>${currentPhoto.locationName}</strong>`).openPopup();

        const allMarkers = [ansMarker];

        // Players' guess pins
        activePlayers.forEach((p) => {
          const guess = roundGuesses[p.id];
          if (guess) {
            const pIcon = L.divIcon({
              className: 'custom-revealed-player-pin',
              html: `
                <div class="px-2 py-0.5 rounded text-white text-[10px] font-bold shadow-md border border-white" style="background-color: ${p.color}">
                  ${p.name.split(' ')[0]} (${guess.distanceKm} km)
                </div>
              `,
              iconSize: [80, 20],
              iconAnchor: [40, 20],
            });
            const pMarker = L.marker([guess.lat, guess.lng], { icon: pIcon }).addTo(revealLayers);
            allMarkers.push(pMarker);

            // Line
            L.polyline(
              [
                [guess.lat, guess.lng],
                [actualLat, actualLon],
              ],
              {
                color: p.color,
                weight: 2.5,
                dashArray: '5, 5',
              }
            ).addTo(revealLayers);
          }
        });

        const group = L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.3));
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gameState, turnPlayerIndex, currentPhoto]);

  // Player confirms guess during pass-the-device
  const handleConfirmTurnGuess = () => {
    if (!currentPhoto) return;

    const actualLat = currentPhoto.latitude!;
    const actualLon = currentPhoto.longitude!;

    let lat = currentGuessCoords?.lat ?? 0;
    let lng = currentGuessCoords?.lng ?? 0;

    // Haversine
    const dLat = ((actualLat - lat) * Math.PI) / 180;
    const dLon = ((actualLon - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((actualLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = Math.round(6371 * c);

    let roundPts = Math.round(5000 * Math.exp(-distKm / 2000));
    if (distKm <= 1) roundPts = 5000;

    const newGuesses = {
      ...roundGuesses,
      [currentTurnPlayer.id]: {
        lat,
        lng,
        distanceKm: distKm,
        score: roundPts,
      },
    };
    setRoundGuesses(newGuesses);

    // Update player score
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentTurnPlayer.id ? { ...p, score: p.score + roundPts } : p
      )
    );

    // Clean up current marker
    if (guessMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(guessMarkerRef.current);
      guessMarkerRef.current = null;
    }
    setCurrentGuessCoords(null);

    // Advance to next player or Reveal
    if (turnPlayerIndex + 1 < activePlayers.length) {
      setTurnPlayerIndex((prev) => prev + 1);
      setTimeLeft(variant === 'rapid_fire' ? 15 : timerSetting);
    } else {
      // All players in this round have guessed!
      setGameState('round_reveal');
      confetti({ particleCount: 45, spread: 60 });
    }
  };

  // Advance to Next Round or Finish
  const handleNextRound = () => {
    if (currentRoundIndex + 1 < roundPhotos.length) {
      setCurrentRoundIndex((prev) => prev + 1);
      setTurnPlayerIndex(0);
      setRoundGuesses({});
      setCurrentGuessCoords(null);
      setTimeLeft(variant === 'rapid_fire' ? 15 : timerSetting);
      setGameState('playing');
    } else {
      setGameState('finished');
      confetti({ particleCount: 80, spread: 90 });
    }
  };

  // Helper: batch mark sample photos as game-ready
  const handleQuickEnableGameReady = () => {
    const ids = photos.filter((p) => p.isPlaced && !p.isOffLimits).map((p) => p.id);
    onMarkPhotosGameReady(ids);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="paper-sheet p-5 rounded-2xl border border-[#DECDB9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B83A28] font-bold bg-[#FAF0ED] px-2 py-0.5 rounded border border-[#EED4CE]">
              Pass-The-Device Multiplayer Party Game
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
              Wayfarer Geoguess Salon
            </h2>
          </div>
        </div>

        {gameState !== 'setup' && (
          <button
            onClick={() => setGameState('setup')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#5A4B3C] bg-[#EFE8DD] hover:bg-[#E5DAC8] rounded-lg transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Quit to Setup</span>
          </button>
        )}
      </div>

      {/* SETUP SCREEN */}
      {gameState === 'setup' && (
        <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] p-6 shadow-xl space-y-6">
          {/* Check Game Ready Photos Pool */}
          {validPhotoPool.length < 3 ? (
            <div className="p-4 bg-[#FFF0E8] border border-[#F2D0BC] rounded-xl flex items-start space-x-3 text-xs text-[#8A3A1F]">
              <AlertCircle className="w-5 h-5 text-[#B83A28] shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  <strong>More Game-Ready Photos Needed:</strong> The party game requires at least 3 photos marked <span className="font-semibold text-[#B83A28]">Game Ready</span> that have GPS coordinates and are outside off-limits zones. Currently available: <strong>{validPhotoPool.length}</strong>.
                </p>
                <button
                  onClick={handleQuickEnableGameReady}
                  className="px-3 py-1.5 bg-[#B83A28] text-white rounded font-semibold text-xs shadow-xs hover:bg-[#A12F1F]"
                >
                  Mark All Safe Photos as Game Ready
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>
                <strong>{validPhotoPool.length} Game-Ready Photos</strong> available in party pool (off-limits privacy zones strictly excluded).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Selection */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-[#5A4B3C] flex items-center">
                <Users className="w-4 h-4 mr-1 text-[#235478]" />
                Select Players (Pass-The-Device)
              </h3>
              <div className="space-y-2">
                {allAvailablePlayers.map((p) => {
                  const isSelected = activePlayerIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected && activePlayerIds.length <= 1) return;
                        setActivePlayerIds((prev) =>
                          isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#FAF5EB] border-[#B83A28] shadow-xs'
                          : 'bg-white border-[#DECDB9] opacity-70'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover border" />
                        <div>
                          <h4 className="text-xs font-bold text-[#2D241E]">{p.name}</h4>
                          <span className="text-[10px] text-[#7A6958]" style={{ color: p.color }}>
                            ● Player Color
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#B83A28]' : 'text-gray-400'}`}>
                        {isSelected ? '✓ Ready' : '+ Join'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Game Options & Variants */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4B3C] mb-1">
                  Game Variant
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'standard', name: 'Standard Pin Drop', desc: 'Classic map pin precision' },
                    { id: 'whose_photo', name: 'Whose Photo is It?', desc: 'Identify owner then place' },
                    { id: 'rapid_fire', name: 'Rapid Fire (15s)', desc: 'Fast, high-adrenaline timer' },
                    { id: 'co_op', name: 'Co-op Expedition', desc: 'Team up for one shared pin' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v.id as GameVariant)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        variant === v.id
                          ? 'bg-[#FAF0ED] border-[#B83A28] text-[#2D241E] font-bold'
                          : 'bg-white border-[#DECDB9] text-[#6A5A4B]'
                      }`}
                    >
                      <div className="font-semibold text-xs">{v.name}</div>
                      <div className="text-[10px] text-[#8C7A6B]">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds & Timer */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[#5A4B3C] mb-1">Rounds</label>
                  <select
                    value={numRounds}
                    onChange={(e) => setNumRounds(parseInt(e.target.value, 10))}
                    className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2 font-semibold"
                  >
                    <option value={3}>3 Rounds (Quick)</option>
                    <option value={5}>5 Rounds (Standard)</option>
                    <option value={8}>8 Rounds (Grand Tour)</option>
                    <option value={10}>10 Rounds (Marathon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A4B3C] mb-1">Timer per Turn</label>
                  <select
                    value={timerSetting}
                    onChange={(e) => setTimerSetting(parseInt(e.target.value, 10))}
                    disabled={variant === 'rapid_fire'}
                    className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2 font-semibold"
                  >
                    <option value={0}>Off (No Time Limit)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds</option>
                    <option value={60}>60 Seconds</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE0D1]">
                <button
                  disabled={validPhotoPool.length === 0}
                  onClick={handleStartGame}
                  className="w-full py-3 bg-[#B83A28] hover:bg-[#A12F1F] disabled:opacity-50 text-white font-bold rounded-xl shadow-md text-sm transition-all flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Begin Salon Match ({activePlayerIds.length} Players)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY SCREEN (PASS-THE-DEVICE TURN) */}
      {gameState === 'playing' && currentPhoto && (
        <div className="space-y-4">
          {/* Turn Header Banner */}
          <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-4 shadow-md flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={currentTurnPlayer.avatar}
                alt={currentTurnPlayer.name}
                className="w-10 h-10 rounded-full object-cover border-2"
                style={{ borderColor: currentTurnPlayer.color }}
              />
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#B83A28]">
                  Round {currentRoundIndex + 1} of {roundPhotos.length}
                </span>
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  {currentTurnPlayer.name}'s Turn to Guess!
                </h3>
              </div>
            </div>

            {timerSetting > 0 && (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#FAF0ED] text-[#B83A28] rounded-xl font-mono font-bold text-sm border border-[#ECCDC5]">
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>

          {/* Photo & Map Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px]">
            {/* Left: Mystery Photo */}
            <div className="md:col-span-5 bg-[#FCFAF6] border border-[#DECDB9] rounded-2xl p-4 flex flex-col justify-between">
              <div className="polaroid-frame max-w-xs mx-auto transform -rotate-1 shadow-md">
                <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                  <img
                    src={currentPhoto.url}
                    alt="Mystery spot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="font-handwriting text-lg text-[#2D241E]">
                    "{currentPhoto.title}"
                  </p>
                </div>
              </div>

              {/* Pass the device warning */}
              <div className="mt-3 p-2.5 bg-[#FAF5EB] border border-[#DECDB9] rounded-lg text-xs text-[#6A5A4B] text-center">
                🙈 Keep your guess secret from the other players until the end of the round!
              </div>
            </div>

            {/* Right: Map to Drop Pin */}
            <div className="md:col-span-7 bg-[#FFFDF9] border border-[#DECDB9] rounded-2xl flex flex-col overflow-hidden">
              <div className="flex-1 min-h-[360px] relative">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              <div className="p-3 bg-[#FAF6EE] border-t border-[#DECDB9] flex items-center justify-between">
                <span className="text-xs text-[#6A5A4B]">
                  {currentGuessCoords ? (
                    <span className="font-semibold text-[#235478]">
                      📍 Pinned ({currentGuessCoords.lat.toFixed(2)}°, {currentGuessCoords.lng.toFixed(2)}°)
                    </span>
                  ) : (
                    <span>Click anywhere on map to drop pin</span>
                  )}
                </span>

                <button
                  disabled={!currentGuessCoords}
                  onClick={handleConfirmTurnGuess}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] disabled:opacity-40 rounded-xl shadow-xs transition-colors"
                >
                  Lock In Guess & Pass Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROUND REVEAL SCREEN */}
      {gameState === 'round_reveal' && currentPhoto && (
        <div className="space-y-4">
          <div className="paper-sheet p-4 rounded-2xl border border-[#DECDB9] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Round {currentRoundIndex + 1} Results Revealed!
              </span>
              <h3 className="text-lg font-bold font-serif-vintage text-[#2D241E] mt-0.5">
                Actual Location: {currentPhoto.locationName}
              </h3>
            </div>

            <button
              onClick={handleNextRound}
              className="px-5 py-2 text-xs font-bold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-xl shadow-md transition-colors"
            >
              {currentRoundIndex + 1 < roundPhotos.length ? 'Next Round →' : 'View Final Standings 🏆'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Map showing all guesses */}
            <div className="md:col-span-8 bg-[#FFFDF9] border border-[#DECDB9] rounded-2xl h-[420px] overflow-hidden">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* Round Scores & Running Standings */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A4B3C]">
                Round Standings
              </h4>
              <div className="space-y-2">
                {activePlayers.map((p) => {
                  const g = roundGuesses[p.id];
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-white border rounded-xl flex items-center justify-between text-xs"
                      style={{ borderColor: p.color }}
                    >
                      <div className="flex items-center space-x-2.5">
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <h5 className="font-bold text-[#2D241E]">{p.name}</h5>
                          <span className="text-[11px] text-[#7A6958]">
                            {g ? `${g.distanceKm.toLocaleString()} km away` : 'No guess'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#B83A28] block">
                          +{g ? g.score : 0} pts
                        </span>
                        <span className="text-[10px] text-[#7A6958]">Total: {p.score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINAL LEADERBOARD SCREEN */}
      {gameState === 'finished' && (
        <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] p-8 shadow-2xl text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#FAF0ED] border-2 border-[#B83A28] flex items-center justify-center text-3xl mx-auto">
            🏆
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#B83A28] font-bold">
              Party Match Concluded
            </span>
            <h2 className="text-3xl font-bold font-serif-vintage text-[#2D241E] mt-1">
              Grand Wayfarer Salon Champions
            </h2>
          </div>

          <div className="space-y-3 text-left">
            {[...activePlayers]
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    rank === 0
                      ? 'bg-[#FAF2E6] border-[#C28B38] shadow-md font-bold'
                      : 'bg-white border-[#DECDB9]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="font-serif-vintage text-lg font-bold text-[#8C7A6B] w-6">
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                    </span>
                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover border" />
                    <div>
                      <h4 className="text-sm font-bold text-[#2D241E]">{p.name}</h4>
                      <p className="text-xs text-[#7A6958]">Navigator & Memory Cartographer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-serif-vintage text-xl font-bold text-[#B83A28]">
                      {p.score.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <button
            onClick={() => setGameState('setup')}
            className="px-6 py-2.5 bg-[#B83A28] text-white font-bold rounded-xl shadow-md hover:bg-[#A12F1F] text-xs transition-colors"
          >
            Play Another Match
          </button>
        </div>
      )}
    </div>
  );
};
