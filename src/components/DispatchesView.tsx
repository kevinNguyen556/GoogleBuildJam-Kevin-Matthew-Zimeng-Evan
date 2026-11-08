import React, { useState, useEffect } from 'react';
import {
  Send,
  Plane,
  Ship,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  Compass,
  ArrowRight,
  Zap,
  Inbox,
  Package,
  Waves,
  Radio,
  UserCheck,
  ChevronRight,
  Flame,
  Award,
  Calendar,
  Eye,
  Plus,
} from 'lucide-react';
import {
  Photo,
  Friend,
  BuriedTreasure,
  InTransitPackage,
  UserAccount,
  CarrierType,
  GhostPin,
} from '../types';
import confetti from 'canvas-confetti';

interface DispatchesViewProps {
  currentUser: UserAccount;
  accounts: UserAccount[];
  onSwitchAccount: (account: UserAccount) => void;
  photos: Photo[];
  friends: Friend[];
  packages: InTransitPackage[];
  treasures: BuriedTreasure[];
  ghostPins: GhostPin[];
  onAddPackage: (pkg: InTransitPackage) => void;
  onUpdatePackage: (pkg: InTransitPackage) => void;
  onAddTreasure: (treasure: BuriedTreasure) => void;
  onUpdateTreasure: (treasure: BuriedTreasure) => void;
  onSelectPhoto?: (photo: Photo) => void;
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

export const DispatchesView: React.FC<DispatchesViewProps> = ({
  currentUser,
  accounts,
  onSwitchAccount,
  photos,
  friends,
  packages,
  treasures,
  ghostPins,
  onAddPackage,
  onUpdatePackage,
  onAddTreasure,
  onUpdateTreasure,
  onSelectPhoto,
}) => {
  // Sub-tabs: 'sending' (Outbox & In-Transit) | 'radar' (Around Me) | 'compose' (Send New) | 'inbox' (Received)
  const [activeSubTab, setActiveSubTab] = useState<'sending' | 'radar' | 'compose' | 'inbox'>('sending');

  // Real-time animation ticker for progress bars
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  // Check automatic arrivals
  useEffect(() => {
    packages.forEach((pkg) => {
      if (!pkg.arrived) {
        const elapsed = now - pkg.startTime;
        const totalDuration = pkg.durationMs + (pkg.weatherDelaySec || 0) * 1000;
        if (elapsed >= totalDuration) {
          onUpdatePackage({ ...pkg, arrived: true });
        }
      }
    });
  }, [now, packages, onUpdatePackage]);

  // Compose State
  const [composePhotoId, setComposePhotoId] = useState<string>(photos[0]?.id || '');
  const [composeRecipientId, setComposeRecipientId] = useState<string>(friends[0]?.id || 'stranger');
  const [composeCarrier, setComposeCarrier] = useState<CarrierType>('plane');
  const [composeSpeed, setComposeSpeed] = useState<'instant' | 'slow'>('slow');
  const [composeNote, setComposeNote] = useState<string>(
    'Sending this warm memory from my scrapbook across the distance!'
  );

  // Selected Treasure for digging or reply
  const [selectedTreasure, setSelectedTreasure] = useState<BuriedTreasure | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Bury new treasure modal
  const [isBuryingModalOpen, setIsBuryingModalOpen] = useState(false);
  const [buryPhotoId, setBuryPhotoId] = useState<string>(photos[0]?.id || '');
  const [buryNote, setBuryNote] = useState<string>('Buried a secret memory here for curious travelers.');
  const [buryRiddle, setBuryRiddle] = useState<string>('Near the historic streets where evening lamps glow.');

  // Filter packages sent by current user
  const mySentPackages = packages.filter(
    (p) =>
      p.senderId === currentUser.id ||
      p.senderName.toLowerCase().includes(currentUser.displayName.toLowerCase().split(' ')[0]) ||
      (currentUser.id === 'account-curator' && p.senderId === 'user')
  );

  // Filter packages received by current user
  const myReceivedPackages = packages.filter(
    (p) =>
      p.recipientId === currentUser.id ||
      p.recipientName.toLowerCase().includes(currentUser.displayName.toLowerCase().split(' ')[0]) ||
      (currentUser.id === 'account-curator' && (p.recipientId === 'user' || p.recipientName === 'You'))
  );

  const activeInTransitCount = mySentPackages.filter((p) => !p.arrived).length;

  // Selected photo for composer
  const selectedPhoto = photos.find((p) => p.id === composePhotoId) || photos[0];
  const selectedRecipientFriend = friends.find((f) => f.id === composeRecipientId);

  // Calculate distance for composer
  const composeDistanceKm = selectedRecipientFriend
    ? haversineDistance(
        currentUser.latitude,
        currentUser.longitude,
        selectedRecipientFriend.latitude,
        selectedRecipientFriend.longitude
      )
    : 4500;

  // Handler: Deliver package instantly
  const handleDeliverInstantly = (pkg: InTransitPackage) => {
    onUpdatePackage({
      ...pkg,
      arrived: true,
      durationMs: 0,
      startTime: Date.now() - 10000,
    });
    confetti({ particleCount: 40, spread: 60 });
  };

  // Handler: Send New Package / Postcard
  const handleSendPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto) return;

    const isBottle = composeRecipientId === 'stranger';
    const isInstant = composeSpeed === 'instant';
    const duration = isInstant ? 500 : Math.min(60000, Math.max(15000, composeDistanceKm * 4));

    const newPkg: InTransitPackage = {
      id: `pkg-${Date.now()}`,
      photoIds: [selectedPhoto.id],
      photoUrls: [selectedPhoto.url],
      albumTitle: selectedPhoto.title,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: isBottle ? 'stranger' : composeRecipientId,
      recipientName: isBottle
        ? 'Curious Wanderer'
        : selectedRecipientFriend?.name || 'Fellow Voyager',
      carrier: composeCarrier,
      speedType: composeSpeed,
      distanceKm: composeDistanceKm,
      startTime: Date.now(),
      durationMs: duration,
      arrived: isInstant,
      weatherDelaySec: 0,
      isMessageInBottle: isBottle,
      fromCity: currentUser.homeCity,
      fromLat: currentUser.latitude,
      fromLon: currentUser.longitude,
      toCity: isBottle ? 'Open Sea Currents' : selectedRecipientFriend?.homeCity || 'Far Horizon',
      toLat: isBottle ? 35.0 : selectedRecipientFriend?.latitude || 48.8566,
      toLon: isBottle ? -30.0 : selectedRecipientFriend?.longitude || 2.3522,
      postmarkText: isBottle
        ? `OCEAN BOTTLE • FROM ${currentUser.displayName.toUpperCase()}`
        : `${composeCarrier.toUpperCase()} POST • ${currentUser.homeCity.split(',')[0].toUpperCase()} TO ${
            (selectedRecipientFriend?.homeCity || 'PARIS').split(',')[0].toUpperCase()
          }`,
      personalNote: composeNote,
    };

    onAddPackage(newPkg);
    confetti({ particleCount: 45, spread: 65 });
    setActiveSubTab('sending');
  };

  // Handler: Dig up treasure
  const handleDigUpTreasure = (treasure: BuriedTreasure) => {
    const updated: BuriedTreasure = {
      ...treasure,
      isDugUp: true,
      dugUpLogs: [
        ...(treasure.dugUpLogs || []),
        {
          friendId: currentUser.id,
          friendName: currentUser.displayName,
          friendAvatar: currentUser.avatar,
          timestamp: Date.now(),
        },
      ],
    };
    onUpdateTreasure(updated);
    setSelectedTreasure(updated);
    confetti({ particleCount: 50, spread: 70 });
  };

  // Handler: Add reply to treasure chain
  const handleAddTreasureReply = (treasure: BuriedTreasure) => {
    if (!replyText.trim()) return;
    const myPhoto = photos[0];
    const updated: BuriedTreasure = {
      ...treasure,
      replyChain: [
        ...(treasure.replyChain || []),
        {
          id: `reply-${Date.now()}`,
          photoId: myPhoto?.id || treasure.photoId,
          photoUrl: myPhoto?.url || treasure.photo.url,
          note: replyText.trim(),
          authorName: currentUser.displayName,
          authorAvatar: currentUser.avatar,
          timestamp: Date.now(),
        },
      ],
    };
    onUpdateTreasure(updated);
    setSelectedTreasure(updated);
    setReplyText('');
    confetti({ particleCount: 30, spread: 50 });
  };

  // Handler: Bury memory at current location
  const handleBuryTreasureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photoToBury = photos.find((p) => p.id === buryPhotoId) || photos[0];
    if (!photoToBury) return;

    const newTreasure: BuriedTreasure = {
      id: `treasure-${Date.now()}`,
      photoId: photoToBury.id,
      photo: photoToBury,
      latitude: currentUser.latitude,
      longitude: currentUser.longitude,
      locationName: currentUser.homeCity,
      note: buryNote,
      riddleHint: buryRiddle,
      ownerId: currentUser.id,
      ownerName: currentUser.displayName,
      isDugUp: false,
      dugUpLogs: [],
      replyChain: [],
      createdAt: Date.now(),
    };

    onAddTreasure(newTreasure);
    setIsBuryingModalOpen(false);
    confetti({ particleCount: 40, spread: 60 });
  };

  // Treasures sorted by distance from current user
  const treasuresWithDistance = treasures.map((t) => ({
    ...t,
    distanceKm: haversineDistance(currentUser.latitude, currentUser.longitude, t.latitude, t.longitude),
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  // Friends with distance from current user
  const friendsWithDistance = friends.filter((f) => f.id !== currentUser.id).map((f) => ({
    ...f,
    distanceKm: haversineDistance(currentUser.latitude, currentUser.longitude, f.latitude, f.longitude),
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Account Context Banner */}
      <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#B83A28]/40 shadow-xs"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold font-serif-vintage text-[#2D241E]">
                {currentUser.displayName}
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider bg-[#F2EDE4] text-[#7A6958] px-2 py-0.5 rounded-full border border-[#DDD0BE]">
                Active Dispatcher
              </span>
            </div>
            <p className="text-xs text-[#7A6958] flex items-center mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#B83A28] mr-1 shrink-0" />
              Base of Operations: <strong className="ml-1 text-[#2D241E]">{currentUser.homeCity}</strong>
              <span className="mx-2 text-[#DDD0BE]">•</span>
              <span>{photos.length} memories in personal scrapbook</span>
            </p>
          </div>
        </div>

        {/* Quick Account Switcher dropdown inside Dispatches */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-semibold text-[#8C7A6B] hidden sm:inline">Switch perspective:</span>
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => onSwitchAccount(acc)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  acc.id === currentUser.id
                    ? 'bg-[#2D241E] text-white shadow-xs font-bold'
                    : 'bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#5A4E42] border border-[#DDD0BE]'
                }`}
              >
                <img src={acc.avatar} className="w-4 h-4 rounded-full object-cover" />
                <span>{acc.displayName.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#E5DAC8] pb-1 gap-2">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('sending')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'sending'
                ? 'bg-[#2D241E] text-white shadow-xs'
                : 'bg-[#FAF5EB] text-[#6E5E4E] hover:bg-[#EFE6D9] hover:text-[#2D241E]'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span>What I&rsquo;m Sending</span>
            {activeInTransitCount > 0 && (
              <span className="bg-[#B83A28] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {activeInTransitCount} active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('radar')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'radar'
                ? 'bg-[#2D241E] text-white shadow-xs'
                : 'bg-[#FAF5EB] text-[#6E5E4E] hover:bg-[#EFE6D9] hover:text-[#2D241E]'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>What&rsquo;s Around Me</span>
          </button>

          <button
            onClick={() => setActiveSubTab('compose')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'compose'
                ? 'bg-[#2D241E] text-white shadow-xs'
                : 'bg-[#FAF5EB] text-[#6E5E4E] hover:bg-[#EFE6D9] hover:text-[#2D241E]'
            }`}
          >
            <Send className="w-4 h-4 text-[#235478]" />
            <span>Send Postcard or Bottle</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inbox')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'inbox'
                ? 'bg-[#2D241E] text-white shadow-xs'
                : 'bg-[#FAF5EB] text-[#6E5E4E] hover:bg-[#EFE6D9] hover:text-[#2D241E]'
            }`}
          >
            <Inbox className="w-4 h-4 text-[#B83A28]" />
            <span>Incoming Mail ({myReceivedPackages.length})</span>
          </button>
        </div>

        {activeSubTab === 'radar' && (
          <button
            onClick={() => setIsBuryingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#B83A28] hover:bg-[#9E2F20] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bury Memory Here</span>
          </button>
        )}
      </div>

      {/* 1. What I'm Sending Sub-Tab */}
      {activeSubTab === 'sending' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2D241E]">
                Outbox & In-Transit Deliveries
              </h3>
              <p className="text-xs text-[#7A6958] mt-0.5">
                Track keepsakes sent by {currentUser.displayName}. Accelerate with &ldquo;Deliver Instantly&rdquo; anytime.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('compose')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#2D241E] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send New Postcard</span>
            </button>
          </div>

          {mySentPackages.length === 0 ? (
            <div className="paper-sheet rounded-2xl p-8 text-center space-y-3">
              <Package className="w-10 h-10 text-[#C28B38] mx-auto opacity-70" />
              <h4 className="font-bold text-[#2D241E]">No Dispatches Sent Yet</h4>
              <p className="text-xs text-[#7A6958] max-w-md mx-auto">
                Send a photograph from your library to friends across the globe, or cast a message in a bottle out to ocean currents.
              </p>
              <button
                onClick={() => setActiveSubTab('compose')}
                className="mt-2 px-4 py-2 bg-[#B83A28] text-white rounded-xl text-xs font-semibold hover:bg-[#9E2F20] cursor-pointer"
              >
                Compose First Dispatch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySentPackages.map((pkg) => {
                const elapsed = now - pkg.startTime;
                const totalDuration = pkg.durationMs + (pkg.weatherDelaySec || 0) * 1000;
                const progressPct = pkg.arrived ? 100 : Math.min(99, Math.round((elapsed / totalDuration) * 100));
                const remainingSec = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));

                return (
                  <div
                    key={pkg.id}
                    className="paper-sheet rounded-2xl p-5 border border-[#DECDB9] shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4"
                  >
                    {/* Header route line */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="p-1.5 bg-[#FAF0ED] text-[#B83A28] rounded-lg">
                            {pkg.carrier === 'plane' && <Plane className="w-4 h-4" />}
                            {pkg.carrier === 'ship' && <Ship className="w-4 h-4" />}
                            {pkg.carrier === 'pigeon' && <Compass className="w-4 h-4" />}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#7A6958]">
                            {pkg.postmarkText || 'WAYFARER DISPATCH'}
                          </span>
                        </div>
                        {pkg.arrived ? (
                          <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>In Voyage • {remainingSec}s left</span>
                          </span>
                        )}
                      </div>

                      {/* Route Cities */}
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#2D241E]">
                        <span>{pkg.fromCity}</span>
                        <ArrowRight className="w-4 h-4 text-[#C28B38] mx-2" />
                        <span>{pkg.toCity} ({pkg.recipientName})</span>
                      </div>

                      {/* Travel Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="w-full bg-[#E8DFC8] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              pkg.arrived ? 'bg-emerald-600' : 'bg-[#B83A28]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#7A6958] font-mono">
                          <span>{pkg.distanceKm.toLocaleString()} km route</span>
                          <span>{pkg.arrived ? 'Delivered' : `${progressPct}% complete`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Photo & Note Preview */}
                    <div className="flex items-start space-x-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D8]">
                      {pkg.photoUrls[0] && (
                        <img
                          src={pkg.photoUrls[0]}
                          alt="Postcard photo"
                          className="w-16 h-16 rounded-lg object-cover border border-[#DECDB9] shrink-0"
                        />
                      )}
                      <div className="text-xs space-y-1 flex-1">
                        <div className="font-bold text-[#2D241E]">{pkg.albumTitle || 'Keepsake Memory'}</div>
                        <p className="text-[#6E5E4E] line-clamp-2 italic font-handwriting text-sm">
                          &ldquo;{pkg.personalNote}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Deliver Instantly Button */}
                    {!pkg.arrived && (
                      <div className="pt-1 flex items-center justify-between border-t border-[#EDE4D8]">
                        <span className="text-[11px] text-[#7A6958]">Speed up this journey:</span>
                        <button
                          onClick={() => handleDeliverInstantly(pkg)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                          title="Complete this delivery immediately"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Deliver Instantly</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. What's Around Me (Radar & Surroundings) Sub-Tab */}
      {activeSubTab === 'radar' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-[#2D241E]">
              Radar & Keepsakes Around {currentUser.homeCity}
            </h3>
            <p className="text-xs text-[#7A6958] mt-0.5">
              Discover buried treasures, washed-ashore bottles, and friends within range of your current base.
            </p>
          </div>

          {/* Section: Nearby Buried Treasures */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#8C7A6B] flex items-center">
                <Compass className="w-3.5 h-3.5 text-[#B83A28] mr-1.5" />
                Buried Treasures on the Memory Map ({treasures.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treasuresWithDistance.map((tr) => (
                <div
                  key={tr.id}
                  className="paper-sheet rounded-2xl p-4 border border-[#DECDB9] shadow-xs flex flex-col justify-between space-y-3 relative"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🏴‍☠️</span>
                        <div>
                          <div className="font-bold text-xs text-[#2D241E] leading-tight">
                            {tr.locationName}
                          </div>
                          <div className="text-[10px] text-[#7A6958]">
                            Buried by {tr.ownerName}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FAF0ED] text-[#B83A28] px-2 py-0.5 rounded-full border border-[#ECCDC5]">
                        {tr.distanceKm.toLocaleString()} km away
                      </span>
                    </div>

                    <div className="mt-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EDE4D8] text-xs space-y-1">
                      <div className="font-semibold text-[#8C7A6B] text-[10px] uppercase tracking-wider">
                        Riddle Clue:
                      </div>
                      <p className="text-[#3D251E] italic">&ldquo;{tr.riddleHint || tr.note}&rdquo;</p>
                    </div>

                    {/* Dug Up Status */}
                    {tr.isDugUp ? (
                      <div className="mt-3 flex items-center space-x-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold">Unearthed!</span> Photo memory revealed.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] text-[#7A6958] flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 mr-1" />
                        Still hidden underground at this location.
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="pt-2 border-t border-[#EDE4D8] flex items-center justify-between">
                    {tr.isDugUp ? (
                      <button
                        onClick={() => setSelectedTreasure(tr)}
                        className="w-full text-center px-3 py-1.5 bg-[#FAF5EB] hover:bg-[#EFE6D9] text-[#2D241E] text-xs font-semibold rounded-xl border border-[#DECDB9] transition-colors cursor-pointer"
                      >
                        Inspect Treasure & View Replies ({tr.replyChain?.length || 0})
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDigUpTreasure(tr)}
                        className="w-full text-center px-3 py-1.5 bg-[#B83A28] hover:bg-[#9E2F20] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        🏴‍☠️ Dig Up This Treasure!
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Distance to Friends Radar */}
          <div className="space-y-3 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#8C7A6B] flex items-center">
              <Radio className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              Friends Circle Distance Radar
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {friendsWithDistance.map((fr) => (
                <div
                  key={fr.id}
                  className="paper-sheet rounded-xl p-3.5 border border-[#DECDB9] flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={fr.avatar}
                      alt={fr.name}
                      className="w-9 h-9 rounded-full object-cover border border-[#DECDB9]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#2D241E] leading-tight">{fr.name}</div>
                      <div className="text-[10px] text-[#7A6958]">{fr.homeCity}</div>
                      <div className="text-[10px] font-mono text-[#B83A28] font-semibold">
                        {fr.distanceKm.toLocaleString()} km
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setComposeRecipientId(fr.id);
                      setActiveSubTab('compose');
                    }}
                    className="p-1.5 rounded-lg bg-[#FAF5EB] hover:bg-[#EFE6D9] text-[#235478] transition-colors cursor-pointer"
                    title={`Send postcard to ${fr.name}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Travel Wishes / Ghost Pins */}
          {ghostPins.length > 0 && (
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#8C7A6B] flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                Distant Travel Wishes & Ghost Pins
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ghostPins.map((gp) => (
                  <div
                    key={gp.id}
                    className="paper-sheet rounded-xl p-3 border border-[#DECDB9] text-xs space-y-1"
                  >
                    <div className="font-bold text-[#2D241E]">{gp.title}</div>
                    <div className="text-[10px] text-[#7A6958] flex items-center">
                      <MapPin className="w-3 h-3 text-[#B83A28] mr-1" />
                      {gp.locationName}
                    </div>
                    <p className="text-[11px] text-[#5A4B3C] italic">{gp.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Send Postcard / Bottle Sub-Tab (Composer) */}
      {activeSubTab === 'compose' && (
        <form onSubmit={handleSendPackage} className="space-y-6 animate-fade-in max-w-3xl mx-auto">
          <div>
            <h3 className="text-base font-bold text-[#2D241E]">
              Compose Postcard or Bottle
            </h3>
            <p className="text-xs text-[#7A6958] mt-0.5">
              Select a photo from {currentUser.displayName}&rsquo;s library and dispatch it via pigeon, airmail, or sea.
            </p>
          </div>

          <div className="paper-sheet rounded-2xl p-6 border-2 border-[#D8C7B0] shadow-sm space-y-5">
            {/* 1. Pick Photo from current user's library */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] uppercase tracking-wider font-mono mb-2">
                1. Select Photograph from {currentUser.displayName.split(' ')[0]}&rsquo;s Scrapbook
              </label>
              {photos.length === 0 ? (
                <div className="p-4 bg-[#FAF7F2] rounded-xl text-center text-xs text-[#7A6958]">
                  No photos in your library. Please import a photo first!
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {photos.map((p) => {
                    const isSelected = p.id === composePhotoId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setComposePhotoId(p.id)}
                        className={`polaroid-frame cursor-pointer rounded-lg overflow-hidden transition-transform ${
                          isSelected ? 'scale-105 ring-2 ring-[#B83A28] shadow-md' : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        <img src={p.url} alt={p.title} className="w-full aspect-square object-cover" />
                        <div className="text-[9px] font-semibold text-[#2D241E] truncate mt-1">
                          {p.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Choose Recipient */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] uppercase tracking-wider font-mono mb-2">
                2. Recipient Destination
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {friends.filter((f) => f.id !== currentUser.id).map((fr) => {
                  const isSelected = composeRecipientId === fr.id;
                  return (
                    <button
                      type="button"
                      key={fr.id}
                      onClick={() => setComposeRecipientId(fr.id)}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#B83A28] bg-[#FAF0ED] shadow-2xs font-bold'
                          : 'border-[#DDD0BE] bg-white hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <img src={fr.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="truncate text-xs">
                        <div className="text-[#2D241E] font-semibold truncate">{fr.name}</div>
                        <div className="text-[10px] text-[#7A6958]">{fr.homeCity}</div>
                      </div>
                    </button>
                  );
                })}

                {/* Bottle Option */}
                <button
                  type="button"
                  onClick={() => setComposeRecipientId('stranger')}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    composeRecipientId === 'stranger'
                      ? 'border-[#235478] bg-[#F0F5F9] shadow-2xs font-bold'
                      : 'border-[#DDD0BE] bg-white hover:bg-[#FAF7F2]'
                  }`}
                >
                  <span className="text-2xl">🌊</span>
                  <div className="truncate text-xs">
                    <div className="text-[#235478] font-bold">Message in a Bottle</div>
                    <div className="text-[10px] text-[#7A6958]">Open Sea Currents</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Carrier Selection */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] uppercase tracking-wider font-mono mb-2">
                3. Carrier Vessel
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'plane' as CarrierType, label: 'Vintage Airmail', icon: Plane },
                  { id: 'pigeon' as CarrierType, label: 'Homing Pigeon', icon: Compass },
                  { id: 'ship' as CarrierType, label: 'Postal Steamship', icon: Ship },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSelected = composeCarrier === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setComposeCarrier(c.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#2D241E] bg-[#2D241E] text-white font-bold shadow-xs'
                          : 'border-[#DDD0BE] bg-white hover:bg-[#FAF7F2] text-[#5A4E42]'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Speed Option: Deliver Instantly vs Realistic Voyage */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] uppercase tracking-wider font-mono mb-2">
                4. Delivery Speed
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setComposeSpeed('instant')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    composeSpeed === 'instant'
                      ? 'border-amber-500 bg-amber-50 shadow-xs ring-1 ring-amber-400'
                      : 'border-[#DDD0BE] bg-white hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-900">
                    <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
                    <span>⚡ Deliver Instantly (0s)</span>
                  </div>
                  <p className="text-[11px] text-[#7A6958] mt-1 leading-snug">
                    Postcard arrives at its destination parlor immediately.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setComposeSpeed('slow')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    composeSpeed === 'slow'
                      ? 'border-[#235478] bg-[#F0F5F9] shadow-xs ring-1 ring-[#235478]'
                      : 'border-[#DDD0BE] bg-white hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-[#235478]">
                    <Clock className="w-4 h-4" />
                    <span>🕊️ Realistic Voyage (Timed)</span>
                  </div>
                  <p className="text-[11px] text-[#7A6958] mt-1 leading-snug">
                    Simulates real-world travel across {composeDistanceKm.toLocaleString()} km.
                  </p>
                </button>
              </div>
            </div>

            {/* 5. Postcard Personal Note */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] uppercase tracking-wider font-mono mb-1">
                5. Personal Keepsake Note
              </label>
              <textarea
                value={composeNote}
                onChange={(e) => setComposeNote(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-[#DECDB9] bg-white text-xs text-[#2D241E] font-handwriting text-base leading-relaxed focus:outline-hidden focus:border-[#2D241E]"
                placeholder="Write a warm travel note..."
              />
            </div>

            {/* Submit Dispatch */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2.5 bg-[#B83A28] hover:bg-[#9E2F20] text-white font-bold text-sm rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Postcard from {currentUser.displayName.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. Incoming Mail / Inbox Sub-Tab */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-[#2D241E]">
              Keepsakes Delivered to {currentUser.displayName}
            </h3>
            <p className="text-xs text-[#7A6958] mt-0.5">
              Letters, postmarked photographs, and messages from friends and fellow voyagers.
            </p>
          </div>

          {myReceivedPackages.length === 0 ? (
            <div className="paper-sheet rounded-2xl p-8 text-center space-y-3">
              <Inbox className="w-10 h-10 text-[#7A6958] mx-auto opacity-60" />
              <h4 className="font-bold text-[#2D241E]">Your Mailbox is Clear</h4>
              <p className="text-xs text-[#7A6958] max-w-sm mx-auto">
                No keepsakes have arrived yet. When friends dispatch postcards to you, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReceivedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="paper-sheet rounded-2xl p-5 border border-[#DECDB9] shadow-xs space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#2D241E]">From: {pkg.senderName}</span>
                      <span className="text-[10px] text-[#7A6958]">({pkg.fromCity})</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      Delivered
                    </span>
                  </div>

                  <div className="flex items-start space-x-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D8]">
                    {pkg.photoUrls[0] && (
                      <img
                        src={pkg.photoUrls[0]}
                        alt="Received photograph"
                        className="w-20 h-20 rounded-lg object-cover border border-[#DECDB9] shrink-0"
                      />
                    )}
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-[#2D241E]">{pkg.albumTitle || 'Captured Keepsake'}</div>
                      <p className="text-[#5A4E42] italic font-handwriting text-sm leading-snug">
                        &ldquo;{pkg.personalNote}&rdquo;
                      </p>
                      <div className="text-[10px] text-[#8C7A6B] font-mono pt-1">
                        Postmark: {pkg.postmarkText}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inspect Treasure Modal with Reply Chain */}
      {selectedTreasure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EDE4D8] pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏴‍☠️</span>
                <h3 className="font-bold text-base text-[#2D241E]">
                  Buried Treasure at {selectedTreasure.locationName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTreasure(null)}
                className="text-[#8C7A6B] hover:text-[#2D241E] text-xs font-bold p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Treasure Photo */}
            <div className="polaroid-frame rounded-lg overflow-hidden">
              <img
                src={selectedTreasure.photo.url}
                alt={selectedTreasure.photo.title}
                className="w-full h-52 object-cover rounded"
              />
              <div className="pt-2 text-center font-handwriting text-base font-bold text-[#2D241E]">
                {selectedTreasure.photo.title}
              </div>
            </div>

            <p className="text-xs text-[#5A4E42] italic bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE4D8]">
              &ldquo;{selectedTreasure.note}&rdquo;
            </p>

            {/* Reply Chain */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-[#2D241E]">
                Treasure Reply Chain ({selectedTreasure.replyChain?.length || 0})
              </div>
              {selectedTreasure.replyChain?.map((r) => (
                <div key={r.id} className="flex items-start space-x-2.5 p-2 bg-white rounded-xl border border-[#EDE4D8] text-xs">
                  <img src={r.authorAvatar} className="w-6 h-6 rounded-full object-cover shrink-0" />
                  <div>
                    <span className="font-bold text-[#2D241E]">{r.authorName}: </span>
                    <span className="text-[#5A4E42]">{r.note}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Reply */}
            <div className="flex space-x-2 pt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Leave a note in this treasure chest..."
                className="flex-1 p-2 border border-[#DECDB9] rounded-xl text-xs bg-white focus:outline-hidden"
              />
              <button
                onClick={() => handleAddTreasureReply(selectedTreasure)}
                className="px-3 py-2 bg-[#2D241E] text-white text-xs font-bold rounded-xl hover:bg-black cursor-pointer"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bury Memory Here */}
      {isBuryingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4D8] pb-2">
              <h3 className="font-bold text-base text-[#2D241E]">
                Bury a Secret Memory at {currentUser.homeCity}
              </h3>
              <button
                onClick={() => setIsBuryingModalOpen(false)}
                className="text-[#8C7A6B] hover:text-[#2D241E] text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBuryTreasureSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2D241E] mb-1">
                  Select Photo to Bury
                </label>
                <select
                  value={buryPhotoId}
                  onChange={(e) => setBuryPhotoId(e.target.value)}
                  className="w-full p-2 border border-[#DECDB9] rounded-xl text-xs bg-white"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D241E] mb-1">
                  Note in the Chest
                </label>
                <input
                  type="text"
                  value={buryNote}
                  onChange={(e) => setBuryNote(e.target.value)}
                  className="w-full p-2 border border-[#DECDB9] rounded-xl text-xs bg-white"
                  placeholder="A secret message for whoever unearths this..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D241E] mb-1">
                  Riddle Clue for Friends
                </label>
                <input
                  type="text"
                  value={buryRiddle}
                  onChange={(e) => setBuryRiddle(e.target.value)}
                  className="w-full p-2 border border-[#DECDB9] rounded-xl text-xs bg-white"
                  placeholder="Where the cliff flowers bloom at dawn..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#EDE4D8]">
                <button
                  type="button"
                  onClick={() => setIsBuryingModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#7A6958]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#B83A28] text-white text-xs font-bold rounded-xl hover:bg-[#9E2F20] cursor-pointer"
                >
                  Bury Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
