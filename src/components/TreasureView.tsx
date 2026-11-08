import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Sparkles,
  MapPin,
  Lock,
  Calendar,
  CheckCircle2,
  Users,
  Compass,
  Plus,
  HelpCircle,
  Flag,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  Eye,
} from 'lucide-react';
import { Photo, Friend, BuriedTreasure, OffLimitsZone, TreasureReply } from '../types';
import confetti from 'canvas-confetti';

interface TreasureViewProps {
  photos: Photo[];
  friends: Friend[];
  treasures: BuriedTreasure[];
  offLimitsZones: OffLimitsZone[];
  onBuryTreasure: (treasure: BuriedTreasure) => void;
  onUpdateTreasure: (treasure: BuriedTreasure) => void;
  onReportPhoto?: (photoId: string) => void;
}

// Distance in meters
function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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

export const TreasureView: React.FC<TreasureViewProps> = ({
  photos,
  friends,
  treasures,
  offLimitsZones,
  onBuryTreasure,
  onUpdateTreasure,
  onReportPhoto,
}) => {
  // Navigation: Map / Bury Form / Details
  const [isBuryingModalOpen, setIsBuryingModalOpen] = useState(false);
  const [selectedTreasure, setSelectedTreasure] = useState<BuriedTreasure | null>(null);

  // Simulation vs Browser GPS
  const [useRealGps, setUseRealGps] = useState(false);
  const [selectedFriendSimulator, setSelectedFriendSimulator] = useState<Friend>(friends[0]);

  // Simulated Friend Location: start near first treasure or home
  const [simCoords, setSimCoords] = useState<{ lat: number; lng: number }>({
    lat: treasures[0]?.latitude || 40.634,
    lng: treasures[0]?.longitude || 14.6027,
  });

  // Digging state
  const [nearbyTreasure, setNearbyTreasure] = useState<BuriedTreasure | null>(null);
  const [isDigging, setIsDigging] = useState(false);
  const [digProgress, setDigProgress] = useState(0);

  // Reply chain photo state
  const [isReplying, setIsReplying] = useState(false);
  const [replyPhotoId, setReplyPhotoId] = useState<string>(photos[0]?.id || '');
  const [replyNote, setReplyNote] = useState('');

  // Bury Form States
  const [chosenPhotoId, setChosenPhotoId] = useState<string>(photos[0]?.id || '');
  const [buryLat, setBuryLat] = useState<number>(photos[0]?.latitude || 40.634);
  const [buryLon, setBuryLon] = useState<number>(photos[0]?.longitude || 14.6027);
  const [buryNote, setBuryNote] = useState('Found this secret overlook while wandering at dusk.');
  const [buryRiddle, setBuryRiddle] = useState('Look beneath the roots of the ancient olive tree.');
  const [allowedFriendId, setAllowedFriendId] = useState<string>('all');
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [unlockDate, setUnlockDate] = useState('2027-01-01');
  const [offLimitsWarning, setOffLimitsWarning] = useState<string | null>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const treasuresLayerRef = useRef<L.LayerGroup | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);

  // Check Off-Limits Zones helper
  const checkOffLimits = (lat: number, lon: number): boolean => {
    for (const zone of offLimitsZones) {
      const dist = distanceInMeters(lat, lon, zone.latitude, zone.longitude);
      if (dist <= zone.radiusMeters) {
        return true;
      }
    }
    return false;
  };

  // Check proximity of simulated visitor to treasures
  useEffect(() => {
    let foundNearby: BuriedTreasure | null = null;

    for (const t of treasures) {
      // Check if unlocked or allowed for this friend
      if (t.allowedFriendId && t.allowedFriendId !== selectedFriendSimulator.id) {
        continue;
      }
      const dist = distanceInMeters(simCoords.lat, simCoords.lng, t.latitude, t.longitude);
      if (dist <= 75) {
        foundNearby = t;
        break;
      }
    }

    setNearbyTreasure(foundNearby);
  }, [simCoords, treasures, selectedFriendSimulator]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [simCoords.lat, simCoords.lng],
        zoom: 12,
        minZoom: 2,
        maxZoom: 18,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Wayfarer Treasure',
      }).addTo(map);

      const layers = L.layerGroup().addTo(map);
      treasuresLayerRef.current = layers;
      mapRef.current = map;

      // Click to move simulated friend on map
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!useRealGps) {
          setSimCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    }

    const layers = treasuresLayerRef.current;
    if (!layers) return;
    layers.clearLayers();

    // Render Off-Limits Exclusion Circles in Red
    offLimitsZones.forEach((z) => {
      L.circle([z.latitude, z.longitude], {
        radius: z.radiusMeters,
        color: '#B83A28',
        fillColor: '#B83A28',
        fillOpacity: 0.15,
        dashArray: '4, 4',
      })
        .bindTooltip(`🛡️ ${z.name} (Restricted from Burial)`)
        .addTo(layers);
    });

    // Render Buried Chest / X Markers
    treasures.forEach((t) => {
      const isDug = t.isDugUp;
      const icon = L.divIcon({
        className: 'custom-chest-pin',
        html: `
          <div class="relative flex items-center justify-center p-1 rounded-full border-2 ${
            isDug ? 'bg-amber-100 border-amber-600' : 'bg-[#B83A28] border-white shadow-lg'
          }">
            <span class="text-sm">${isDug ? '🔓' : '🏴‍☠️'}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([t.latitude, t.longitude], { icon }).addTo(layers);
      marker.on('click', () => setSelectedTreasure(t));
      marker.bindTooltip(`
        <div class="text-xs font-sans">
          <strong>${t.photo.title}</strong>
          <p class="text-[10px] text-[#7A6958]">${t.locationName}</p>
          ${t.isDugUp ? '<span class="text-emerald-700 font-bold">✓ Dug up</span>' : '<span class="text-[#B83A28]">Hidden Treasure</span>'}
        </div>
      `);
    });

    // Render Simulated Friend Avatar Marker
    const simIcon = L.divIcon({
      className: 'custom-sim-avatar',
      html: `
        <div class="relative flex items-center justify-center">
          <img src="${selectedFriendSimulator.avatar}" class="w-8 h-8 rounded-full border-2 border-[#235478] shadow-xl object-cover" />
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (simMarkerRef.current) {
      simMarkerRef.current.setLatLng([simCoords.lat, simCoords.lng]);
    } else {
      simMarkerRef.current = L.marker([simCoords.lat, simCoords.lng], { icon: simIcon }).addTo(layers);
    }
  }, [treasures, offLimitsZones, simCoords, selectedFriendSimulator, useRealGps]);

  // Digging interaction (takes 3 seconds)
  const handleStartDigging = () => {
    if (!nearbyTreasure) return;

    // Check time capsule
    if (nearbyTreasure.unlockDate) {
      const unlockTime = new Date(nearbyTreasure.unlockDate).getTime();
      if (Date.now() < unlockTime) {
        alert(`⏳ Time Capsule Locked! This keepsake cannot be unearthed until ${nearbyTreasure.unlockDate}.`);
        return;
      }
    }

    setIsDigging(true);
    setDigProgress(0);

    const interval = setInterval(() => {
      setDigProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDigging(false);

          // Mark dug up
          const updated: BuriedTreasure = {
            ...nearbyTreasure,
            isDugUp: true,
            dugUpLogs: [
              ...nearbyTreasure.dugUpLogs,
              {
                friendId: selectedFriendSimulator.id,
                friendName: selectedFriendSimulator.name,
                friendAvatar: selectedFriendSimulator.avatar,
                timestamp: Date.now(),
              },
            ],
          };
          onUpdateTreasure(updated);
          setSelectedTreasure(updated);
          confetti({ particleCount: 60, spread: 70 });
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Bury new treasure submit
  const handleBurySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (checkOffLimits(buryLat, buryLon)) {
      setOffLimitsWarning('Cannot bury treasure within an off-limits privacy sanctuary!');
      return;
    }

    const photo = photos.find((p) => p.id === chosenPhotoId);
    if (!photo) return;

    const newTreasure: BuriedTreasure = {
      id: `treasure-${Date.now()}`,
      photoId: photo.id,
      photo,
      latitude: buryLat,
      longitude: buryLon,
      locationName: photo.locationName,
      note: buryNote.trim(),
      riddleHint: buryRiddle.trim(),
      ownerId: 'user',
      ownerName: 'You (The Wayfarer)',
      allowedFriendId: allowedFriendId === 'all' ? undefined : allowedFriendId,
      unlockDate: isTimeCapsule ? unlockDate : undefined,
      isDugUp: false,
      dugUpLogs: [],
      replyChain: [],
      createdAt: Date.now(),
    };

    onBuryTreasure(newTreasure);
    setIsBuryingModalOpen(false);
    confetti({ particleCount: 35, spread: 50 });
  };

  // Add Reply to Treasure Chain
  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreasure) return;

    const replyPhoto = photos.find((p) => p.id === replyPhotoId);
    if (!replyPhoto) return;

    const reply: TreasureReply = {
      id: `reply-${Date.now()}`,
      photoId: replyPhoto.id,
      photoUrl: replyPhoto.url,
      note: replyNote.trim() || 'Buried a keepsake reply at this memory marker.',
      authorName: selectedFriendSimulator.name,
      authorAvatar: selectedFriendSimulator.avatar,
      timestamp: Date.now(),
    };

    const updated: BuriedTreasure = {
      ...selectedTreasure,
      replyChain: [...selectedTreasure.replyChain, reply],
    };

    onUpdateTreasure(updated);
    setSelectedTreasure(updated);
    setIsReplying(false);
    setReplyNote('');
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Header */}
      <div className="paper-sheet p-4 sm:p-5 rounded-2xl border border-[#DECDB9] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#B83A28] font-bold bg-[#FAF0ED] px-2 py-0.5 rounded border border-[#EED4CE]">
                Buried Keepsakes & Time Capsules
              </span>
              <span className="text-xs text-[#7A6958]">
                • {treasures.length} Secret Cache Markers
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
              Buried Treasure Expeditions
            </h2>
          </div>
        </div>

        {/* Controls: Simulate Friend & Bury Action */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Simulator Friend Selector */}
          <div className="flex items-center space-x-1.5 bg-white border border-[#D8C7B0] rounded-lg px-2.5 py-1">
            <Users className="w-3.5 h-3.5 text-[#235478]" />
            <span className="text-[#7A6958]">Exploring as:</span>
            <select
              value={selectedFriendSimulator.id}
              onChange={(e) => {
                const f = friends.find((fr) => fr.id === e.target.value);
                if (f) setSelectedFriendSimulator(f);
              }}
              className="bg-transparent font-semibold text-[#235478] outline-hidden cursor-pointer"
            >
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Real GPS Toggle */}
          <button
            onClick={() => {
              if (!useRealGps && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setSimCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setUseRealGps(true);
                  },
                  (err) => alert('Geolocation error: ' + err.message)
                );
              } else {
                setUseRealGps(false);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              useRealGps
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-[#7A6958] border-[#D8C7B0]'
            }`}
          >
            {useRealGps ? '🛰️ Live Device GPS' : '🗺️ Simulated Visit'}
          </button>

          <button
            onClick={() => setIsBuryingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bury New Treasure</span>
          </button>
        </div>
      </div>

      {/* Interactive Map View */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border-2 border-[#D8C7B0] shadow-md bg-[#ECE5DC]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Discovery Alert Box (When within 75 meters!) */}
        {nearbyTreasure && !nearbyTreasure.isDugUp && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 bg-[#FFFDF9]/95 backdrop-blur-md border-2 border-[#B83A28] rounded-2xl p-4 shadow-2xl max-w-md w-[92%] animate-bounce-short">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl p-1.5 bg-[#FAF2E6] rounded-xl border border-[#DECDB9]">
                  ⛏️
                </span>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#B83A28] block">
                    Discovery Alert! (~50m proximity)
                  </span>
                  <h4 className="text-sm font-bold font-serif-vintage text-[#2D241E]">
                    Something is buried under your feet!
                  </h4>
                  {nearbyTreasure.riddleHint && (
                    <p className="text-[11px] text-[#7A6958] italic">
                      "{nearbyTreasure.riddleHint}"
                    </p>
                  )}
                </div>
              </div>

              <div>
                {!isDigging ? (
                  <button
                    onClick={handleStartDigging}
                    className="px-4 py-2 bg-[#B83A28] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#A12F1F] transition-all"
                  >
                    Dig It Up!
                  </button>
                ) : (
                  <div className="text-center">
                    <span className="text-xs font-mono font-bold text-[#B83A28]">Digging...</span>
                    <div className="w-20 bg-[#E8DAC6] h-2 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#B83A28] h-full transition-all" style={{ width: `${digProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Helper Guide */}
        <div className="absolute bottom-4 left-4 z-10 bg-[#FFFDF9]/90 backdrop-blur-xs border border-[#DECDB9] rounded-xl px-3 py-2 text-[11px] text-[#5A4B3C] shadow-sm">
          💡 Click anywhere on the map to walk {selectedFriendSimulator.name} closer to buried caches!
        </div>
      </div>

      {/* Treasure Details & Chain Modal */}
      {selectedTreasure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl p-6 my-6">
            <div className="airmail-border -mt-6 -mx-6 mb-4" />

            <div className="flex items-start justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-3">
                <span className="text-2xl p-1 bg-[#FAF2E6] rounded-lg border border-[#EADFCF]">
                  {selectedTreasure.isDugUp ? '🔓' : '🏴‍☠️'}
                </span>
                <div>
                  <h3 className="text-lg font-bold font-serif-vintage text-[#2D241E]">
                    {selectedTreasure.photo.title}
                  </h3>
                  <p className="text-xs text-[#7A6958]">
                    {selectedTreasure.locationName} • Buried by {selectedTreasure.ownerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (confirm('Report this memory?')) {
                      if (onReportPhoto) onReportPhoto(selectedTreasure.photoId);
                      alert('Photo reported.');
                    }
                  }}
                  className="p-1 text-[#9A8A7A] hover:text-[#B83A28]"
                  title="Report photo"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedTreasure(null)}
                  className="text-[#8C7A6B] hover:text-[#2D241E]"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Treasure Content */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-5">
                <div className="polaroid-frame max-w-xs mx-auto shadow-sm">
                  <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                    <img
                      src={selectedTreasure.photo.url}
                      alt={selectedTreasure.photo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-3 text-xs">
                {/* Note */}
                <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#DECDB9]">
                  <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-1">
                    Secret Inscription
                  </span>
                  <p className="font-handwriting text-base text-[#3A2E24] leading-relaxed">
                    "{selectedTreasure.note}"
                  </p>
                </div>

                {/* Dug Up Log */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-1">
                    Unearthed By Explorers ({selectedTreasure.dugUpLogs.length})
                  </span>
                  {selectedTreasure.dugUpLogs.length === 0 ? (
                    <p className="text-[11px] text-[#7A6958] italic">Not yet discovered by any visitor.</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedTreasure.dugUpLogs.map((log, i) => (
                        <div key={i} className="flex items-center space-x-2 p-1.5 bg-white rounded border border-[#EAE0D1]">
                          <img src={log.friendAvatar} alt={log.friendName} className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-semibold text-[#2D241E]">{log.friendName}</span>
                          <span className="text-[#8C7A6B] text-[10px]">unearthed on {new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Chain */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-[#8C7A6B]">
                      Treasure Chain Replies ({selectedTreasure.replyChain.length})
                    </span>
                    {selectedTreasure.isDugUp && !isReplying && (
                      <button
                        onClick={() => setIsReplying(true)}
                        className="text-[11px] text-[#B83A28] font-bold hover:underline"
                      >
                        + Bury Reply Photo
                      </button>
                    )}
                  </div>

                  {selectedTreasure.replyChain.map((r) => (
                    <div key={r.id} className="p-2 bg-white rounded-lg border border-[#DECDB9] flex space-x-2.5 items-start mt-1">
                      <img src={r.photoUrl} alt="Reply" className="w-10 h-10 rounded object-cover" />
                      <div>
                        <span className="font-bold text-[11px] text-[#2D241E]">{r.authorName}</span>
                        <p className="font-handwriting text-xs text-[#5A4B3C]">"{r.note}"</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {isReplying && (
                  <form onSubmit={handleAddReply} className="p-3 bg-[#FAF2EF] rounded-xl border border-[#ECCDC5] space-y-2">
                    <h5 className="font-bold text-xs text-[#B83A28]">Bury Reply Photo at this Spot</h5>
                    <div>
                      <select
                        value={replyPhotoId}
                        onChange={(e) => setReplyPhotoId(e.target.value)}
                        className="w-full text-xs p-1.5 bg-white border border-[#D8C7B0] rounded"
                      >
                        {photos.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        value={replyNote}
                        onChange={(e) => setReplyNote(e.target.value)}
                        placeholder="Add your note to the chain..."
                        className="w-full text-xs p-1.5 bg-white border border-[#D8C7B0] rounded"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="px-2 py-1 text-xs text-[#7A6958]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#B83A28] text-white rounded text-xs font-semibold"
                      >
                        Link to Chain
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bury Treasure Modal */}
      {isBuryingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl p-6 relative">
            <div className="airmail-border -mt-6 -mx-6 mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏴‍☠️</span>
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Bury a Scrapbook Keepsake
                </h3>
              </div>
              <button
                onClick={() => setIsBuryingModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                ✕
              </button>
            </div>

            {offLimitsWarning && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{offLimitsWarning}</span>
              </div>
            )}

            <form onSubmit={handleBurySubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#5A4B3C] mb-1">Select Photo to Bury</label>
                <select
                  value={chosenPhotoId}
                  onChange={(e) => {
                    setChosenPhotoId(e.target.value);
                    const sel = photos.find((p) => p.id === e.target.value);
                    if (sel && sel.latitude && sel.longitude) {
                      setBuryLat(sel.latitude);
                      setBuryLon(sel.longitude);
                    }
                  }}
                  className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2 font-medium"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.locationName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5A4B3C] mb-1">Burial Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={buryLat}
                    onChange={(e) => setBuryLat(parseFloat(e.target.value))}
                    className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#5A4B3C] mb-1">Burial Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={buryLon}
                    onChange={(e) => setBuryLon(parseFloat(e.target.value))}
                    className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#5A4B3C] mb-1">Keeper's Note</label>
                <textarea
                  rows={2}
                  value={buryNote}
                  onChange={(e) => setBuryNote(e.target.value)}
                  className="w-full font-handwriting text-sm bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2.5 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5A4B3C] mb-1">Optional Riddle / Clue</label>
                <input
                  type="text"
                  value={buryRiddle}
                  onChange={(e) => setBuryRiddle(e.target.value)}
                  placeholder="e.g. Near the weathered bronze lantern"
                  className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#5A4B3C] mb-1">Allowed Discoverers</label>
                  <select
                    value={allowedFriendId}
                    onChange={(e) => setAllowedFriendId(e.target.value)}
                    className="w-full bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-2"
                  >
                    <option value="all">Friends Only (All Friends)</option>
                    {friends.map((f) => (
                      <option key={f.id} value={f.id}>
                        Only {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5A4B3C] mb-1">Time Capsule Lock</label>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="tc-check"
                      checked={isTimeCapsule}
                      onChange={(e) => setIsTimeCapsule(e.target.checked)}
                      className="accent-[#B83A28]"
                    />
                    <label htmlFor="tc-check" className="cursor-pointer">
                      Lock until date
                    </label>
                  </div>
                  {isTimeCapsule && (
                    <input
                      type="date"
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      className="w-full bg-white border border-[#DECDB9] rounded p-1 mt-1 text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#EAE0D1]">
                <button
                  type="button"
                  onClick={() => setIsBuryingModalOpen(false)}
                  className="px-3 py-1.5 text-[#7A6958]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B83A28] text-white rounded-xl font-bold shadow-xs hover:bg-[#A12F1F]"
                >
                  Bury Treasure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
