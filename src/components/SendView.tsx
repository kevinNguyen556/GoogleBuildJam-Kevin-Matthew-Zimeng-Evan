import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Send,
  Plane,
  Ship,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Mail,
  Inbox,
  User,
  Users,
  Flag,
  CloudRain,
  Compass,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Photo, Album, Friend, InTransitPackage, CarrierType, UserHomeLocation } from '../types';
import confetti from 'canvas-confetti';

interface SendViewProps {
  photos: Photo[];
  albums: Album[];
  friends: Friend[];
  userHome: UserHomeLocation;
  packages: InTransitPackage[];
  onSendPackage: (pkg: InTransitPackage) => void;
  onUpdatePackage: (pkg: InTransitPackage) => void;
  onReportPhoto?: (photoId: string) => void;
}

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export const SendView: React.FC<SendViewProps> = ({
  photos,
  albums,
  friends,
  userHome,
  packages,
  onSendPackage,
  onUpdatePackage,
  onReportPhoto,
}) => {
  // Mode: Send Studio vs Active Routes Map & Inbox
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'compose' | 'inbox'>('map');
  const [demoSpeed, setDemoSpeed] = useState<boolean>(true); // compresses days into seconds

  // Perspective: User sending / receiving vs Receiving as Friend
  const [viewingAsRecipientId, setViewingAsRecipientId] = useState<string>('user');

  // Compose State
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([photos[0]?.id || '']);
  const [selectedFriendId, setSelectedFriendId] = useState<string>(friends[0]?.id || '');
  const [isMessageInBottle, setIsMessageInBottle] = useState<boolean>(false);
  const [speedType, setSpeedType] = useState<'instant' | 'slow'>('slow');
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierType>('pigeon');
  const [personalNote, setPersonalNote] = useState<string>(
    'Greetings across oceans and hills! Sending this keepsake moment to your parlor.'
  );

  // Map Ref for In-Transit tracking
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const transitLayersRef = useRef<L.LayerGroup | null>(null);

  // Calculate distance for currently selected friend
  const currentRecipient = friends.find((f) => f.id === selectedFriendId) || friends[0];
  const distanceKm = haversineDistance(
    userHome.latitude,
    userHome.longitude,
    currentRecipient.latitude,
    currentRecipient.longitude
  );

  // Real-time animation ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Update in-transit packages status
  useEffect(() => {
    packages.forEach((pkg) => {
      if (!pkg.arrived) {
        const elapsed = now - pkg.startTime;
        const totalDuration = pkg.durationMs + pkg.weatherDelaySec * 1000;
        if (elapsed >= totalDuration) {
          onUpdatePackage({ ...pkg, arrived: true });
          confetti({ particleCount: 30, spread: 50 });
        }
      }
    });
  }, [now, packages]);

  // Leaflet Map for in-transit routes
  useEffect(() => {
    if (activeSubTab !== 'map' || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [35, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Wayfarer Post',
      }).addTo(map);

      const layers = L.layerGroup().addTo(map);
      transitLayersRef.current = layers;
      mapRef.current = map;
    }

    const layers = transitLayersRef.current;
    if (!layers) return;
    layers.clearLayers();

    // Render Home Pin
    const homeIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `
        <div class="px-2 py-0.5 bg-[#B83A28] text-white rounded text-[10px] font-bold border border-white shadow-xs">
          🏠 ${userHome.city.split(',')[0]}
        </div>
      `,
      iconSize: [60, 20],
      iconAnchor: [30, 20],
    });
    L.marker([userHome.latitude, userHome.longitude], { icon: homeIcon }).addTo(layers);

    // Render Friends Home Pins
    friends.forEach((f) => {
      const fIcon = L.divIcon({
        className: 'custom-friend-pin',
        html: `
          <div class="px-2 py-0.5 bg-[#235478] text-white rounded text-[10px] font-bold border border-white shadow-xs flex items-center space-x-1">
            <span>📮</span> <span>${f.name.split(' ')[0]}</span>
          </div>
        `,
        iconSize: [70, 20],
        iconAnchor: [35, 20],
      });
      L.marker([f.latitude, f.longitude], { icon: fIcon }).addTo(layers);
    });

    // Render In-Transit Routes and moving carrier icons
    packages.forEach((pkg) => {
      const isComplete = pkg.arrived;
      const totalDuration = pkg.durationMs + pkg.weatherDelaySec * 1000;
      const elapsed = Math.max(0, now - pkg.startTime);
      const progress = isComplete ? 1 : Math.min(1, elapsed / totalDuration);

      // Arc/Line points
      const fromLatLng: [number, number] = [pkg.fromLat, pkg.fromLon];
      const toLatLng: [number, number] = [pkg.toLat, pkg.toLon];

      // Draw dashed travel path
      L.polyline([fromLatLng, toLatLng], {
        color: isComplete ? '#15803D' : '#B83A28',
        weight: 2,
        dashArray: isComplete ? '3, 3' : '6, 6',
        opacity: 0.7,
      }).addTo(layers);

      // Interpolate current position along geodesic
      const curLat = pkg.fromLat + (pkg.toLat - pkg.fromLat) * progress;
      const curLon = pkg.fromLon + (pkg.toLon - pkg.fromLon) * progress;

      const carrierEmoji =
        pkg.carrier === 'pigeon' ? '🕊️' : pkg.carrier === 'plane' ? '✈️' : '🚢';

      const movingIcon = L.divIcon({
        className: 'custom-carrier-marker',
        html: `
          <div class="relative flex items-center justify-center p-1 bg-white rounded-full border-2 ${
            isComplete ? 'border-emerald-600' : 'border-[#B83A28]'
          } shadow-md transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
            <span class="text-sm">${carrierEmoji}</span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const carrierMarker = L.marker([curLat, curLon], { icon: movingIcon }).addTo(layers);
      carrierMarker.bindTooltip(`
        <div class="p-1 font-sans text-xs">
          <strong>${pkg.postmarkText}</strong>
          <p class="text-[10px] text-[#7A6958]">Carrier: ${pkg.carrier.toUpperCase()} • ${Math.round(progress * 100)}% route completed</p>
          ${pkg.weatherNotice ? `<p class="text-[10px] text-amber-700 font-bold">${pkg.weatherNotice}</p>` : ''}
        </div>
      `);
    });
  }, [activeSubTab, packages, now, friends, userHome]);

  // Dispatch Package Handler
  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();

    let recipientId = selectedFriendId;
    let recipientName = currentRecipient.name;
    let toCity = currentRecipient.homeCity;
    let toLat = currentRecipient.latitude;
    let toLon = currentRecipient.longitude;

    if (isMessageInBottle) {
      recipientId = 'stranger';
      recipientName = 'A Curious Wanderer';
      toCity = 'Azores Archipelago, Atlantic';
      toLat = 37.7412;
      toLon = -25.6756;
    }

    // Determine duration based on speed & carrier
    let baseSeconds = speedType === 'instant' ? 0.5 : demoSpeed ? 14 : 120;
    if (selectedCarrier === 'plane') baseSeconds = demoSpeed ? 9 : 60;
    if (selectedCarrier === 'ship') baseSeconds = demoSpeed ? 20 : 240;

    // Optional Weather Delay (25% chance of weather event)
    const hasWeather = Math.random() < 0.35 && speedType === 'slow';
    const weatherDelaySec = hasWeather ? (demoSpeed ? 6 : 40) : 0;
    const weatherNotice = hasWeather
      ? '⚠️ Squalls & Headwinds over route (+ delay)'
      : undefined;

    const chosenPhotos = photos.filter((p) => selectedPhotoIds.includes(p.id));

    const newPackage: InTransitPackage = {
      id: `pkg-${Date.now()}`,
      photoIds: selectedPhotoIds,
      photoUrls: chosenPhotos.map((p) => p.url),
      senderId: 'user',
      senderName: 'You',
      recipientId,
      recipientName,
      carrier: selectedCarrier,
      speedType,
      distanceKm: haversineDistance(userHome.latitude, userHome.longitude, toLat, toLon),
      startTime: Date.now(),
      durationMs: baseSeconds * 1000,
      arrived: speedType === 'instant',
      weatherDelaySec,
      weatherNotice,
      isMessageInBottle,
      fromCity: userHome.city,
      fromLat: userHome.latitude,
      fromLon: userHome.longitude,
      toCity,
      toLat,
      toLon,
      postmarkText: `${selectedCarrier.toUpperCase()} • ${userHome.city.split(',')[0]} TO ${toCity.split(',')[0]}`,
      personalNote,
    };

    onSendPackage(newPackage);
    setActiveSubTab('map');
    confetti({ particleCount: 40, spread: 60 });
  };

  // Filter packages for Inbox based on perspective
  const inboxPackages = packages.filter((pkg) => {
    if (viewingAsRecipientId === 'user') {
      return pkg.recipientId === 'user' && pkg.arrived;
    } else {
      return pkg.recipientId === viewingAsRecipientId && pkg.arrived;
    }
  });

  const inTransitCount = packages.filter((p) => !p.arrived).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Postal Send Header Bar */}
      <div className="paper-sheet p-4 sm:p-5 rounded-2xl border border-[#DECDB9] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#B83A28] font-bold bg-[#FAF0ED] px-2 py-0.5 rounded border border-[#EED4CE]">
                Wayfarer Airmail & Postal Network
              </span>
              <span className="text-xs text-[#7A6958]">
                • Home: <strong>{userHome.city}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
              Dispatch Keepsakes & Track Routes
            </h2>
          </div>
        </div>

        {/* Sub-tabs & Demo Speed Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#F1E8DC] p-1 rounded-xl flex space-x-1 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('map')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeSubTab === 'map'
                  ? 'bg-[#2D241E] text-white shadow-xs'
                  : 'text-[#6A5A4B] hover:text-[#2D241E]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Transit Map ({inTransitCount})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('compose')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeSubTab === 'compose'
                  ? 'bg-[#2D241E] text-white shadow-xs'
                  : 'text-[#6A5A4B] hover:text-[#2D241E]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose Postcard</span>
            </button>
            <button
              onClick={() => setActiveSubTab('inbox')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeSubTab === 'inbox'
                  ? 'bg-[#2D241E] text-white shadow-xs'
                  : 'text-[#6A5A4B] hover:text-[#2D241E]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox ({inboxPackages.length})</span>
            </button>
          </div>

          {/* Demo Speed Toggle */}
          <button
            onClick={() => setDemoSpeed(!demoSpeed)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              demoSpeed
                ? 'bg-[#FAF0ED] text-[#B83A28] border-[#ECCDC5]'
                : 'bg-white text-[#7A6958] border-[#D8C7B0]'
            }`}
            title="Compress travel days into seconds for testing"
          >
            ⚡ Demo Speed: {demoSpeed ? 'Seconds' : 'Real-Time'}
          </button>
        </div>
      </div>

      {/* Main Content Area based on Sub-Tab */}
      {activeSubTab === 'map' && (
        <div className="space-y-4">
          {/* Active In-Transit Alert Banners */}
          {inTransitCount > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {packages
                .filter((p) => !p.arrived)
                .map((pkg) => {
                  const total = pkg.durationMs + pkg.weatherDelaySec * 1000;
                  const elapsed = Math.max(0, now - pkg.startTime);
                  const remSec = Math.max(0, Math.ceil((total - elapsed) / 1000));
                  const pct = Math.min(100, Math.round((elapsed / total) * 100));

                  return (
                    <div
                      key={pkg.id}
                      className="p-3 bg-[#FFFDF9] border border-[#DECDB9] rounded-xl shadow-xs flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl p-1.5 bg-[#FAF2E6] rounded-lg border border-[#E8DAC6]">
                          {pkg.carrier === 'pigeon' ? '🕊️' : pkg.carrier === 'plane' ? '✈️' : '🚢'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[#2D241E]">{pkg.postmarkText}</span>
                            {pkg.weatherNotice && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded flex items-center">
                                <CloudRain className="w-3 h-3 mr-0.5" /> Delay
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A6958]">
                            To: <strong>{pkg.recipientName}</strong> • {pkg.distanceKm.toLocaleString()} km
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-[#B83A28] text-sm">
                          {remSec}s left
                        </span>
                        <div className="w-20 bg-[#E8DAC6] h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-[#B83A28] h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Interactive World Map */}
          <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border-2 border-[#D8C7B0] shadow-md">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* COMPOSE SUB-TAB */}
      {activeSubTab === 'compose' && (
        <form onSubmit={handleDispatch} className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-xl p-6 relative overflow-hidden">
          <div className="airmail-border -mt-6 -mx-6 mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Photo selection */}
            <div className="md:col-span-5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4B3C]">
                Select Scrapbook Photo to Send
              </label>

              {/* Selected Photo Polaroid Preview */}
              {selectedPhotoIds.length > 0 && (
                <div className="polaroid-frame max-w-xs mx-auto transform -rotate-1">
                  <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                    <img
                      src={photos.find((p) => p.id === selectedPhotoIds[0])?.url}
                      alt="Selected postcard"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="font-handwriting text-lg text-[#2D241E]">
                      {photos.find((p) => p.id === selectedPhotoIds[0])?.title}
                    </p>
                  </div>
                </div>
              )}

              {/* Photo Selector Strip */}
              <div className="flex space-x-2 overflow-x-auto pb-1 max-w-full">
                {photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.url}
                    alt={p.title}
                    onClick={() => setSelectedPhotoIds([p.id])}
                    className={`w-12 h-12 rounded object-cover cursor-pointer border-2 transition-all ${
                      selectedPhotoIds.includes(p.id)
                        ? 'border-[#B83A28] scale-105'
                        : 'border-[#DECDB9] opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right: Recipient & Carrier Options */}
            <div className="md:col-span-7 space-y-4">
              {/* Recipient Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#5A4B3C]">
                    Recipient
                  </label>
                  <label className="text-xs text-[#235478] flex items-center cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={isMessageInBottle}
                      onChange={(e) => setIsMessageInBottle(e.target.checked)}
                      className="mr-1.5 accent-[#235478]"
                    />
                    🌊 Message in a Bottle (Send to stranger)
                  </label>
                </div>

                {!isMessageInBottle ? (
                  <div className="grid grid-cols-3 gap-2">
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFriendId(f.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center space-x-2 ${
                          selectedFriendId === f.id
                            ? 'bg-[#FAF0ED] border-[#B83A28] shadow-xs'
                            : 'bg-white border-[#DECDB9] hover:bg-[#FAF5EC]'
                        }`}
                      >
                        <img src={f.avatar} alt={f.name} className="w-7 h-7 rounded-full object-cover" />
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#2D241E] truncate">{f.name.split(' ')[0]}</h4>
                          <p className="text-[10px] text-[#7A6958] truncate">{f.homeCity.split(',')[0]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F0F6FA] border border-[#CDE0ED] text-xs text-[#2B4B63]">
                    Your postcard will be cast into the open digital currents and wash ashore for a random wanderer across the globe!
                  </div>
                )}
              </div>

              {/* Delivery Speed & Carriers */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4B3C] mb-1.5">
                  Dispatch Method & Carrier
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCarrier('pigeon');
                      setSpeedType('slow');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedCarrier === 'pigeon'
                        ? 'bg-[#FAF0ED] border-[#B83A28] shadow-xs'
                        : 'bg-white border-[#DECDB9] hover:bg-[#FAF5EC]'
                    }`}
                  >
                    <span className="text-xl">🕊️</span>
                    <h5 className="font-bold text-xs text-[#2D241E] mt-1">Homing Pigeon</h5>
                    <p className="text-[10px] text-[#7A6958]">Fast • 1 Photo only</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCarrier('plane');
                      setSpeedType('slow');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedCarrier === 'plane'
                        ? 'bg-[#FAF0ED] border-[#B83A28] shadow-xs'
                        : 'bg-white border-[#DECDB9] hover:bg-[#FAF5EC]'
                    }`}
                  >
                    <span className="text-xl">✈️</span>
                    <h5 className="font-bold text-xs text-[#2D241E] mt-1">Airmail Courier</h5>
                    <p className="text-[10px] text-[#7A6958]">Medium • A few photos</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCarrier('ship');
                      setSpeedType('slow');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedCarrier === 'ship'
                        ? 'bg-[#FAF0ED] border-[#B83A28] shadow-xs'
                        : 'bg-white border-[#DECDB9] hover:bg-[#FAF5EC]'
                    }`}
                  >
                    <span className="text-xl">🚢</span>
                    <h5 className="font-bold text-xs text-[#2D241E] mt-1">Ocean Steamship</h5>
                    <p className="text-[10px] text-[#7A6958]">Slowest • Whole album</p>
                  </button>
                </div>
              </div>

              {/* Distance & Route Estimation */}
              <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#DECDB9] flex items-center justify-between text-xs text-[#5A4B3C]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block">Route Details</span>
                  <span>
                    {userHome.city.split(',')[0]} → {isMessageInBottle ? 'Atlantic Waters' : currentRecipient.homeCity}
                  </span>
                </div>
                <span className="font-mono font-bold text-[#B83A28]">
                  {distanceKm.toLocaleString()} km
                </span>
              </div>

              {/* Handwritten Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4B3C] mb-1">
                  Handwritten Postcard Inscription
                </label>
                <textarea
                  rows={3}
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  className="w-full font-handwriting text-base text-[#2D241E] bg-[#FAF5EB] border border-[#DECDB9] rounded-xl p-3 outline-hidden focus:border-[#B83A28] resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-xl shadow-sm flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Seal & Dispatch Postcard</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* INBOX SUB-TAB */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-4">
          {/* Switch Perspective Control: View as user or as friend */}
          <div className="p-3 bg-[#FCFAF6] border border-[#DECDB9] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#235478]" />
              <span className="font-bold text-[#2D241E]">
                Viewing Postbox Perspective:
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewingAsRecipientId('user')}
                className={`px-3 py-1 rounded-lg border font-semibold ${
                  viewingAsRecipientId === 'user'
                    ? 'bg-[#235478] text-white border-[#235478]'
                    : 'bg-white text-[#5A4B3C] border-[#D8C7B0]'
                }`}
              >
                🏠 Your Home Inbox
              </button>

              {friends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setViewingAsRecipientId(f.id)}
                  className={`px-3 py-1 rounded-lg border font-medium ${
                    viewingAsRecipientId === f.id
                      ? 'bg-[#235478] text-white border-[#235478]'
                      : 'bg-white text-[#5A4B3C] border-[#D8C7B0]'
                  }`}
                >
                  👤 {f.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Inbox Items Grid */}
          {inboxPackages.length === 0 ? (
            <div className="p-12 text-center bg-[#FAF6EE] rounded-2xl border-2 border-dashed border-[#D8C7B0]">
              <Mail className="w-10 h-10 text-[#8C7A6B]/50 mx-auto mb-2" />
              <h4 className="font-serif-vintage font-bold text-base text-[#2D241E]">
                No arrived mail in this postbox yet
              </h4>
              <p className="text-xs text-[#7A6958] mt-1">
                Packages currently flying or steaming across the ocean will appear here once they reach their destination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {inboxPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="polaroid-frame bg-[#FFFDF9] border border-[#DECDB9] relative group flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Carrier & Postmark */}
                    <div className="flex items-start justify-between border-b border-dashed border-[#D8C7B0] pb-2 mb-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase font-bold text-[#B83A28]">
                          {pkg.carrier.toUpperCase()} DISPATCH
                        </span>
                        <h4 className="font-serif-vintage font-bold text-xs text-[#2D241E]">
                          From: {pkg.senderName} ({pkg.fromCity.split(',')[0]})
                        </h4>
                      </div>
                      <div className="postmark-circle w-10 h-10 border border-[#B83A28]/50 text-[7px] font-mono text-[#B83A28] flex items-center justify-center">
                        ARRIVED
                      </div>
                    </div>

                    {/* Image Preview */}
                    <div className="aspect-4/3 rounded overflow-hidden bg-[#EAE0D3] mb-3">
                      <img
                        src={pkg.photoUrls[0]}
                        alt="Received postcard"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Note */}
                    <p className="font-handwriting text-sm text-[#4A3D2F] leading-snug">
                      "{pkg.personalNote}"
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-[#EAE0D1] flex items-center justify-between text-[10px] text-[#7A6958]">
                    <span>Distance: {pkg.distanceKm.toLocaleString()} km</span>
                    <button
                      onClick={() => {
                        if (onReportPhoto) onReportPhoto(pkg.photoIds[0]);
                      }}
                      className="text-[#9A8A7A] hover:text-[#B83A28] flex items-center cursor-pointer"
                    >
                      <Flag className="w-3 h-3 mr-1" /> Reported
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
