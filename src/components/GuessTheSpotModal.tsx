import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  X,
  MapPin,
  Sparkles,
  HelpCircle,
  Award,
  Compass,
  CheckCircle2,
  AlertCircle,
  Flag,
} from 'lucide-react';
import { Photo, Friend, GuessLogEntry } from '../types';
import confetti from 'canvas-confetti';

interface GuessTheSpotModalProps {
  photo: Photo | null;
  friend: Friend;
  isOpen: boolean;
  onClose: () => void;
  onRecordGuess: (entry: GuessLogEntry) => void;
  onReportPhoto?: (photoId: string) => void;
}

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate score (0 to 5000)
function computeScore(distanceKm: number): number {
  if (distanceKm <= 1) return 5000;
  if (distanceKm <= 25) return Math.round(4800 - distanceKm * 10);
  if (distanceKm <= 100) return Math.round(4500 - (distanceKm - 25) * 15);
  // Exponential decay
  const score = Math.round(4000 * Math.exp(-distanceKm / 2200));
  return Math.max(0, Math.min(5000, score));
}

export const GuessTheSpotModal: React.FC<GuessTheSpotModalProps> = ({
  photo,
  friend,
  isOpen,
  onClose,
  onRecordGuess,
  onReportPhoto,
}) => {
  if (!isOpen || !photo || photo.latitude === null || photo.longitude === null) return null;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [guessCoords, setGuessCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [result, setResult] = useState<{
    distanceKm: number;
    score: number;
    accuracy: 'bullseye' | 'close' | 'miss';
  } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [reported, setReported] = useState(photo.isReported || false);

  useEffect(() => {
    setGuessCoords(null);
    setHasSubmitted(false);
    setResult(null);
    setShowHint(false);
    setReported(photo.isReported || false);
  }, [photo]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapContainerRef.current!, {
        center: [25, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 17,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Handle map clicks to drop guess pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (hasSubmitted) return;
        const { lat, lng } = e.latlng;
        setGuessCoords({ lat, lng });

        if (guessMarkerRef.current) {
          guessMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const guessIcon = L.divIcon({
            className: 'custom-guess-pin',
            html: `
              <div class="relative w-8 h-8 flex items-center justify-center transform -translate-x-1/2 -translate-y-full">
                <div class="w-6 h-6 rounded-full bg-[#235478] border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
                  📍
                </div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          });
          guessMarkerRef.current = L.marker([lat, lng], { icon: guessIcon }).addTo(map);
        }
      });

      mapRef.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, hasSubmitted]);

  const handleConfirmGuess = () => {
    if (!guessCoords || !mapRef.current) return;

    const actualLat = photo.latitude!;
    const actualLon = photo.longitude!;
    const distanceKm = calculateDistanceKm(
      guessCoords.lat,
      guessCoords.lng,
      actualLat,
      actualLon
    );
    const score = computeScore(distanceKm);

    let accuracy: 'bullseye' | 'close' | 'miss' = 'miss';
    if (distanceKm <= 1) accuracy = 'bullseye';
    else if (distanceKm <= 100) accuracy = 'close';

    setResult({ distanceKm, score, accuracy });
    setHasSubmitted(true);

    if (accuracy === 'bullseye' || accuracy === 'close') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }

    // Place actual location pin in red
    const actualIcon = L.divIcon({
      className: 'custom-actual-pin',
      html: `
        <div class="relative w-9 h-9 flex items-center justify-center transform -translate-x-1/2 -translate-y-full">
          <div class="w-7 h-7 rounded-full bg-[#B83A28] border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
            ★
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    actualMarkerRef.current = L.marker([actualLat, actualLon], {
      icon: actualIcon,
    }).addTo(mapRef.current);

    actualMarkerRef.current.bindPopup(`
      <div class="p-1 font-sans">
        <strong class="text-xs text-[#B83A28]">${photo.locationName}</strong>
        <p class="text-[10px] text-[#554637]">${photo.title}</p>
      </div>
    `).openPopup();

    // Draw dashed connection line
    polylineRef.current = L.polyline(
      [
        [guessCoords.lat, guessCoords.lng],
        [actualLat, actualLon],
      ],
      {
        color: accuracy === 'bullseye' ? '#15803D' : '#B83A28',
        weight: 3,
        dashArray: '6, 6',
      }
    ).addTo(mapRef.current);

    // Fit map bounds to show both pins
    const group = L.featureGroup([
      guessMarkerRef.current!,
      actualMarkerRef.current,
      polylineRef.current,
    ]);
    mapRef.current.fitBounds(group.getBounds().pad(0.3));

    // Log guess
    const logEntry: GuessLogEntry = {
      id: `guess-${Date.now()}`,
      photoId: photo.id,
      photoTitle: photo.title,
      friendId: friend.id,
      friendName: friend.name,
      friendAvatar: friend.avatar,
      guessLat: guessCoords.lat,
      guessLon: guessCoords.lng,
      actualLat,
      actualLon,
      distanceKm,
      score,
      accuracy,
      timestamp: Date.now(),
    };
    onRecordGuess(logEntry);
  };

  const handleReport = () => {
    if (confirm('Report this memory photo for safety review?')) {
      setReported(true);
      if (onReportPhoto) onReportPhoto(photo.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        <div className="airmail-border shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-[#EAE0D1] flex items-center justify-between shrink-0 bg-[#FCFAF6]">
          <div className="flex items-center space-x-3">
            <img
              src={friend.avatar}
              alt={friend.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-[#235478]"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#235478] font-bold bg-[#E8F0F7] px-2 py-0.5 rounded">
                  Guess-The-Spot Expedition
                </span>
                {photo.mysteryDifficulty && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                    photo.mysteryDifficulty === 'easy'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : photo.mysteryDifficulty === 'medium'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {photo.mysteryDifficulty}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                Visiting as {friend.name}: Where was this photo taken?
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReport}
              title="Report photo"
              className="p-1.5 text-[#9A8A7A] hover:text-[#B83A28] rounded-md hover:bg-[#F2EAE0] transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C7A6B] hover:text-[#2D241E] rounded-md hover:bg-[#F2EAE0]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Split view of Photo & Map */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[440px] overflow-hidden">
          {/* Left: Mystery Photo Preview */}
          <div className="md:col-span-5 p-4 bg-[#FAF6EE] border-r border-[#EAE0D1] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="polaroid-frame bg-[#FFFDF9] transform -rotate-1 max-w-[280px] mx-auto shadow-md">
                <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                  <img
                    src={photo.url}
                    alt="Mystery spot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2.5 text-center">
                  <h4 className="font-handwriting text-lg text-[#2D241E] leading-tight">
                    {photo.title}
                  </h4>
                  <p className="text-[10px] font-mono text-[#8C7A6B] mt-0.5">
                    Year: {photo.year}
                  </p>
                </div>
              </div>

              {/* Mystery Clues / Hint */}
              <div className="mt-4 space-y-2">
                {photo.mysteryHint && (
                  <div>
                    {!showHint && !hasSubmitted ? (
                      <button
                        onClick={() => setShowHint(true)}
                        className="text-xs text-[#235478] hover:underline flex items-center font-medium"
                      >
                        <HelpCircle className="w-3.5 h-3.5 mr-1" /> Need a clue? Reveal owner hint
                      </button>
                    ) : (
                      <div className="p-2.5 bg-[#F2F7FA] border border-[#CDE0ED] rounded-lg text-xs text-[#2B4B63]">
                        <span className="font-semibold block text-[11px] uppercase tracking-wider text-[#235478]">
                          Curator's Hint:
                        </span>
                        "{photo.mysteryHint}"
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Clue */}
                <div className="p-2.5 bg-[#FFFDF9] rounded-lg border border-[#E5DAC8] text-xs text-[#5A4B3C]">
                  <span className="font-bold text-[10px] uppercase text-[#8C7A6B] block mb-1">
                    Visual Tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.slice(0, 4).map((t) => (
                      <span key={t} className="bg-[#F0E6D8] px-1.5 py-0.2 rounded text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {reported && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 flex items-center space-x-1.5 mt-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This photo has been flagged for private review.</span>
              </div>
            )}
          </div>

          {/* Right: Map & Guess Results */}
          <div className="md:col-span-7 flex flex-col h-full relative">
            <div className="flex-1 w-full relative min-h-[300px]">
              <div ref={mapContainerRef} className="w-full h-full" />

              {!hasSubmitted && !guessCoords && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-1000 bg-[#FFFDF9]/95 backdrop-blur-xs border border-[#DECDB9] rounded-xl px-3 py-1.5 shadow-md text-xs text-[#2D241E] pointer-events-none">
                  👆 Click on the world map to drop your guess pin
                </div>
              )}
            </div>

            {/* Bottom Bar: Action / Score Results */}
            <div className="p-3.5 bg-[#FAF6EE] border-t border-[#EAE0D1] shrink-0">
              {!hasSubmitted ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#6A5A4B]">
                    {guessCoords ? (
                      <span className="font-semibold text-[#235478]">
                        📍 Guess pinned: ({guessCoords.lat.toFixed(2)}°, {guessCoords.lng.toFixed(2)}°)
                      </span>
                    ) : (
                      <span>No location selected yet</span>
                    )}
                  </div>
                  <button
                    disabled={!guessCoords}
                    onClick={handleConfirmGuess}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg disabled:opacity-40 shadow-xs transition-all"
                  >
                    Confirm My Guess!
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif-vintage text-base font-bold text-[#2D241E]">
                        {result?.accuracy === 'bullseye'
                          ? '🎯 Bullseye!'
                          : result?.accuracy === 'close'
                          ? '✨ Close Guess!'
                          : '🗺️ Good Try!'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#B83A28] bg-[#FAF0ED] px-2 py-0.5 rounded border border-[#EED4CE]">
                        +{result?.score} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A6958] mt-0.5">
                      Distance:{' '}
                      <strong className="text-[#2D241E]">{result?.distanceKm.toLocaleString()} km</strong> away
                      from <strong>{photo.locationName}</strong>
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-semibold text-[#2D241E] bg-[#EFE8DD] hover:bg-[#E5DAC8] rounded-lg transition-colors"
                  >
                    Return to Museum
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
