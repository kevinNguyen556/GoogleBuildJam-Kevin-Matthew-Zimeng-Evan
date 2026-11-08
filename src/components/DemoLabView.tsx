import React, { useState } from 'react';
import {
  FlaskConical,
  UserCheck,
  Waves,
  Compass,
  Send,
  MessageSquare,
  Sparkles,
  MapPin,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  RefreshCw,
  Trophy,
  Plane,
  Ship,
  Bird,
  Eye,
  HelpCircle,
} from 'lucide-react';
import {
  Photo,
  Friend,
  BuriedTreasure,
  InTransitPackage,
  UserAccount,
  MuseumSpeechNote,
  GuessLogEntry,
  ActiveTab,
} from '../types';
import confetti from 'canvas-confetti';

interface DemoLabViewProps {
  photos: Photo[];
  friends: Friend[];
  treasures: BuriedTreasure[];
  packages: InTransitPackage[];
  currentUser: UserAccount;
  accounts: UserAccount[];
  onSwitchAccount: (account: UserAccount) => void;
  onUpdatePhoto: (photo: Photo) => void;
  onAddTreasure: (treasure: BuriedTreasure) => void;
  onUpdateTreasure: (treasure: BuriedTreasure) => void;
  onAddPackage: (pkg: InTransitPackage) => void;
  onUpdatePackage: (pkg: InTransitPackage) => void;
  onRecordGuess: (entry: GuessLogEntry) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const DemoLabView: React.FC<DemoLabViewProps> = ({
  photos,
  friends,
  treasures,
  packages,
  currentUser,
  accounts,
  onSwitchAccount,
  onUpdatePhoto,
  onAddTreasure,
  onUpdateTreasure,
  onAddPackage,
  onUpdatePackage,
  onRecordGuess,
  onNavigateTab,
}) => {
  // Currently acting as this persona (either a simulated friend or current user)
  const [activePersonaId, setActivePersonaId] = useState<string>(currentUser.id);

  // Active testing tool sub-panel
  const [activeTool, setActiveTool] = useState<'bottle' | 'treasure' | 'send' | 'notes' | 'guess'>(
    'bottle'
  );

  // New Bottle state
  const [selectedBottlePhotoId, setSelectedBottlePhotoId] = useState<string>(photos[0]?.id || '');
  const [bottleMessage, setBottleMessage] = useState<string>('Greetings from across the waves! Found this serene spot.');

  // New Treasure state
  const [selectedTreasurePhotoId, setSelectedTreasurePhotoId] = useState<string>(photos[1]?.id || '');
  const [treasureNote, setTreasureNote] = useState<string>('Buried under the old pine tree near the bay.');
  const [treasureRiddle, setTreasureRiddle] = useState<string>('Where the cliff flowers bloom at dawn.');

  // Treasure Reply chain state
  const [replyTreasureId, setReplyTreasureId] = useState<string | null>(null);
  const [treasureReplyNote, setTreasureReplyNote] = useState<string>('');

  // New Airmail state
  const [sendPhotoId, setSendPhotoId] = useState<string>(photos[0]?.id || '');
  const [recipientFriendId, setRecipientFriendId] = useState<string>('user');
  const [sendCarrier, setSendCarrier] = useState<'pigeon' | 'plane' | 'ship'>('pigeon');
  const [sendNote, setSendNote] = useState<string>('Sending this keepsake to your collection!');

  // Museum Note state
  const [notePhotoId, setNotePhotoId] = useState<string>(photos[0]?.id || '');
  const [bubbleNoteText, setBubbleNoteText] = useState<string>('We definitely have to come back here!');

  // Guess spot state
  const [guessPhotoId, setGuessPhotoId] = useState<string>(photos[1]?.id || '');
  const [guessCityInput, setGuessCityInput] = useState<string>('Kyoto, Japan');

  // Find persona details
  const activePersona: { id: string; name: string; avatar: string; homeCity: string } =
    activePersonaId === 'user'
      ? {
          id: 'user',
          name: currentUser.displayName,
          avatar: currentUser.avatar,
          homeCity: currentUser.homeCity,
        }
      : friends.find((f) => f.id === activePersonaId) || {
          id: friends[0]?.id || 'unknown',
          name: friends[0]?.name || 'Demo Persona',
          avatar: friends[0]?.avatar || '',
          homeCity: friends[0]?.homeCity || 'Paris, France',
        };

  // Helper: Cast bottle as current persona
  const handleCastBottleAsPersona = () => {
    const photo = photos.find((p) => p.id === selectedBottlePhotoId) || photos[0];
    if (!photo) return;

    const newBottle: InTransitPackage = {
      id: `bottle-${Date.now()}`,
      photoIds: [photo.id],
      photoUrls: [photo.url],
      senderId: activePersona.id,
      senderName: activePersona.name,
      recipientId: 'stranger',
      recipientName: 'Curious Wanderer',
      carrier: 'ship',
      speedType: 'slow',
      distanceKm: Math.floor(Math.random() * 4000) + 1200,
      startTime: Date.now(),
      durationMs: 25000,
      arrived: false,
      weatherDelaySec: 0,
      isMessageInBottle: true,
      fromCity: activePersona.homeCity,
      fromLat: 48.8566,
      fromLon: 2.3522,
      toCity: 'Open Oceanic Currents',
      toLat: 34.0,
      toLon: -32.0,
      postmarkText: `BOTTLE CAST BY ${activePersona.name.toUpperCase()}`,
      personalNote: bottleMessage,
    };

    onAddPackage(newBottle);
    confetti({ particleCount: 30, spread: 60 });
  };

  // Helper: Dig up treasure as current persona
  const handleDigUpTreasureAsPersona = (t: BuriedTreasure) => {
    const alreadyDug = t.dugUpLogs.some((l) => l.friendId === activePersona.id);
    if (alreadyDug) return;

    const updated: BuriedTreasure = {
      ...t,
      isDugUp: true,
      dugUpLogs: [
        ...t.dugUpLogs,
        {
          friendId: activePersona.id,
          friendName: activePersona.name,
          friendAvatar: activePersona.avatar,
          timestamp: Date.now(),
        },
      ],
    };

    onUpdateTreasure(updated);
    confetti({ particleCount: 45, spread: 70 });
  };

  // Helper: Add reply to treasure chain
  const handleAddTreasureReply = (treasureId: string) => {
    const target = treasures.find((t) => t.id === treasureId);
    if (!target || !treasureReplyNote.trim()) return;

    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];

    const updated: BuriedTreasure = {
      ...target,
      replyChain: [
        ...target.replyChain,
        {
          id: `reply-${Date.now()}`,
          photoId: randomPhoto.id,
          photoUrl: randomPhoto.url,
          note: treasureReplyNote.trim(),
          authorName: activePersona.name,
          authorAvatar: activePersona.avatar,
          timestamp: Date.now(),
        },
      ],
    };

    onUpdateTreasure(updated);
    setReplyTreasureId(null);
    setTreasureReplyNote('');
    confetti({ particleCount: 35, spread: 60 });
  };

  // Helper: Bury new treasure as current persona
  const handleBuryTreasureAsPersona = () => {
    const photo = photos.find((p) => p.id === selectedTreasurePhotoId) || photos[0];
    if (!photo) return;

    const newT: BuriedTreasure = {
      id: `treasure-${Date.now()}`,
      photoId: photo.id,
      photo,
      latitude: photo.latitude || 48.8566,
      longitude: photo.longitude || 2.3522,
      locationName: photo.locationName,
      note: treasureNote,
      riddleHint: treasureRiddle,
      ownerId: activePersona.id,
      ownerName: activePersona.name,
      isDugUp: false,
      dugUpLogs: [],
      replyChain: [],
      createdAt: Date.now(),
    };

    onAddTreasure(newT);
    confetti({ particleCount: 40, spread: 60 });
  };

  // Helper: Send airmail/courier as persona
  const handleSendAirmailAsPersona = () => {
    const photo = photos.find((p) => p.id === sendPhotoId) || photos[0];
    if (!photo) return;

    const recipient =
      recipientFriendId === 'user'
        ? { id: 'user', name: currentUser.displayName, homeCity: currentUser.homeCity }
        : friends.find((f) => f.id === recipientFriendId) || {
            id: 'friend-clara',
            name: 'Clara Delacroix',
            homeCity: 'Paris, France',
          };

    const newPkg: InTransitPackage = {
      id: `pkg-${Date.now()}`,
      photoIds: [photo.id],
      photoUrls: [photo.url],
      senderId: activePersona.id,
      senderName: activePersona.name,
      recipientId: recipient.id,
      recipientName: recipient.name,
      carrier: sendCarrier,
      speedType: 'slow',
      distanceKm: 4200,
      startTime: Date.now(),
      durationMs: 16000,
      arrived: false,
      weatherDelaySec: 0,
      isMessageInBottle: false,
      fromCity: activePersona.homeCity,
      fromLat: 48.8566,
      fromLon: 2.3522,
      toCity: recipient.homeCity,
      toLat: 42.3601,
      toLon: -71.0589,
      postmarkText: `AIRMAIL • FROM ${activePersona.name.toUpperCase()} TO ${recipient.name.toUpperCase()}`,
      personalNote: sendNote,
    };

    onAddPackage(newPkg);
    confetti({ particleCount: 35, spread: 60 });
  };

  // Helper: Fast forward / deliver package immediately
  const handleDeliverNow = (pkg: InTransitPackage) => {
    const updated: InTransitPackage = {
      ...pkg,
      arrived: true,
      durationMs: 1,
    };
    onUpdatePackage(updated);
    confetti({ particleCount: 25, spread: 50 });
  };

  // Helper: Pin speech bubble note on museum wall photo
  const handlePinSpeechBubbleAsPersona = () => {
    const photo = photos.find((p) => p.id === notePhotoId);
    if (!photo || !bubbleNoteText.trim()) return;

    const newNote: MuseumSpeechNote = {
      id: `sn-${Date.now()}`,
      authorName: activePersona.name,
      authorAvatar: activePersona.avatar,
      text: bubbleNoteText.trim(),
      createdAt: Date.now(),
    };

    const updated: Photo = {
      ...photo,
      speechBubbleNotes: [...(photo.speechBubbleNotes || []), newNote],
    };

    onUpdatePhoto(updated);
    setBubbleNoteText('');
    confetti({ particleCount: 30, spread: 50 });
  };

  // Helper: Simulate mystery guess as persona
  const handleSimulateGuessAsPersona = () => {
    const photo = photos.find((p) => p.id === guessPhotoId) || photos[0];
    if (!photo) return;

    // Simulate distance
    const distKm = Math.floor(Math.random() * 85) + 5; // close or bullseye
    const score = Math.max(500, Math.round(5000 * Math.exp(-distKm / 100)));
    const accuracy = distKm < 15 ? 'bullseye' : 'close';

    const entry: GuessLogEntry = {
      id: `guess-${Date.now()}`,
      photoId: photo.id,
      photoTitle: photo.title,
      friendId: activePersona.id,
      friendName: activePersona.name,
      friendAvatar: activePersona.avatar,
      guessLat: (photo.latitude || 35.0) + (Math.random() - 0.5) * 0.5,
      guessLon: (photo.longitude || 135.0) + (Math.random() - 0.5) * 0.5,
      actualLat: photo.latitude || 35.0,
      actualLon: photo.longitude || 135.0,
      distanceKm: distKm,
      score,
      accuracy,
      timestamp: Date.now(),
    };

    onRecordGuess(entry);

    // Update photo's solvedByFriends
    const solved = photo.solvedByFriends || [];
    if (!solved.includes(activePersona.id)) {
      onUpdatePhoto({
        ...photo,
        solvedByFriends: [...solved, activePersona.id],
      });
    }

    confetti({ particleCount: 45, spread: 65 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* DEMO HIGHLIGHT HEADER BANNER */}
      <div className="bg-gradient-to-r from-amber-950 via-[#2D241E] to-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-amber-500/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider bg-amber-500 text-amber-950 shadow-sm flex items-center space-x-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Demo Lab • Offline Simulation</span>
              </span>
              <span className="text-xs text-amber-200/80 hidden sm:inline">
                Test friend interactions with zero backend required
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage tracking-tight">
              Act as Different Friends to Test Social Features
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Switch your persona below to simulate sending message bottles, digging up secret
              treasures, receiving airmail postcards, leaving speech bubbles in the 3D museum, and
              taking guess-the-spot turns.
            </p>
          </div>

          {/* Active Persona Pill */}
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-400/40 shrink-0">
            <img
              src={activePersona.avatar}
              alt={activePersona.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md"
            />
            <div>
              <span className="text-[10px] font-mono uppercase text-amber-300 block font-bold">
                Currently Acting As:
              </span>
              <h4 className="text-sm font-bold text-white font-serif-vintage">
                {activePersona.name}
              </h4>
              <p className="text-[11px] text-stone-300 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{activePersona.homeCity}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONA / ACCOUNT SWITCHER SELECTOR */}
      <div className="bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6A5A4B] flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Switch Entire Account Perspective</span>
          </span>
          <span className="text-[11px] text-[#8C7A6B]">
            Selecting an account completely updates your Library, Museum, & Dispatches
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {accounts.map((acc) => {
            const isSelected = acc.id === currentUser.id;
            return (
              <button
                key={acc.id}
                onClick={() => {
                  setActivePersonaId(acc.id);
                  onSwitchAccount(acc);
                }}
                className={`p-3 rounded-2xl border-2 text-left flex flex-col items-center sm:items-start space-y-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-500/20'
                    : 'border-[#E5DAC8] bg-[#FAF7F2] hover:bg-white'
                }`}
              >
                <img
                  src={acc.avatar}
                  alt={acc.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-[#DECDB9] shrink-0"
                />
                <div className="truncate w-full text-center sm:text-left">
                  <h5 className="text-xs font-bold text-[#2D241E] truncate">{acc.displayName}</h5>
                  <p className="text-[10px] text-[#7A6958] truncate">{acc.homeCity}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action jump banner */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-amber-950 font-medium">
            Active Account: <strong className="font-bold text-[#2D241E]">{currentUser.displayName}</strong> ({currentUser.homeCity}).
            Library & 3D Museum are curated to this account.
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('library')}
              className="px-3 py-1.5 bg-[#2D241E] hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Open {currentUser.displayName.split(' ')[0]}&rsquo;s Library →
            </button>
            <button
              onClick={() => onNavigateTab('museum')}
              className="px-3 py-1.5 bg-[#B83A28] hover:bg-[#9E2F20] text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Walk in 3D Museum →
            </button>
            <button
              onClick={() => onNavigateTab('dispatches')}
              className="px-3 py-1.5 bg-white border border-[#D8C7B0] text-[#2D241E] font-bold rounded-xl hover:bg-[#F5EFEB] transition-all cursor-pointer shadow-xs"
            >
              Dispatches & Radar →
            </button>
          </div>
        </div>
      </div>

      {/* FEATURE TESTING SUB-TABS */}
      <div className="flex border-b border-[#DECDB9] bg-[#FAF7F2] rounded-2xl p-1.5 space-x-1.5 overflow-x-auto scrollbar-none shadow-2xs">
        <button
          onClick={() => setActiveTool('bottle')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTool === 'bottle'
              ? 'bg-white text-blue-900 shadow-xs border border-blue-200'
              : 'text-[#6A5A4B] hover:text-[#2D241E] hover:bg-white/60'
          }`}
        >
          <Waves className="w-4 h-4 text-blue-600" />
          <span>Message in a Bottle ({packages.filter((p) => p.isMessageInBottle).length})</span>
        </button>

        <button
          onClick={() => setActiveTool('treasure')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTool === 'treasure'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
              : 'text-[#6A5A4B] hover:text-[#2D241E] hover:bg-white/60'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-600" />
          <span>Buried Treasures ({treasures.length})</span>
        </button>

        <button
          onClick={() => setActiveTool('send')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTool === 'send'
              ? 'bg-white text-rose-900 shadow-xs border border-rose-200'
              : 'text-[#6A5A4B] hover:text-[#2D241E] hover:bg-white/60'
          }`}
        >
          <Send className="w-4 h-4 text-rose-600" />
          <span>Airmail & Couriers ({packages.filter((p) => !p.isMessageInBottle).length})</span>
        </button>

        <button
          onClick={() => setActiveTool('notes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTool === 'notes'
              ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
              : 'text-[#6A5A4B] hover:text-[#2D241E] hover:bg-white/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Museum Wall Speech Bubbles</span>
        </button>

        <button
          onClick={() => setActiveTool('guess')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTool === 'guess'
              ? 'bg-white text-violet-900 shadow-xs border border-violet-200'
              : 'text-[#6A5A4B] hover:text-[#2D241E] hover:bg-white/60'
          }`}
        >
          <Trophy className="w-4 h-4 text-violet-600" />
          <span>Simulate Spot Guess</span>
        </button>
      </div>

      {/* 1. MESSAGE IN A BOTTLE SIMULATOR */}
      {activeTool === 'bottle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cast new bottle form */}
          <div className="bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Waves className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Cast Bottle as {activePersona.name}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Select Photo to Enclose
              </label>
              <select
                value={selectedBottlePhotoId}
                onChange={(e) => setSelectedBottlePhotoId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.locationName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Note on the Parchment Scroll
              </label>
              <textarea
                rows={3}
                value={bottleMessage}
                onChange={(e) => setBottleMessage(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-[#DECDB9] bg-[#FAF7F2] font-serif-vintage text-sm outline-hidden resize-none"
              />
            </div>

            <button
              onClick={handleCastBottleAsPersona}
              className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Waves className="w-4 h-4" />
              <span>Toss Bottle Into Oceanic Currents</span>
            </button>
          </div>

          {/* Active bottles floating */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Bottles Adrift Across the Oceans
              </h3>
              <span className="text-xs text-[#7A6958]">
                {packages.filter((p) => p.isMessageInBottle).length} active bottles
              </span>
            </div>

            <div className="space-y-3">
              {packages
                .filter((p) => p.isMessageInBottle)
                .map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={b.photoUrls[0]}
                        alt="bottle"
                        className="w-14 h-14 rounded-xl object-cover border border-blue-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-blue-950">{b.senderName}</span>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            From: {b.fromCity}
                          </span>
                        </div>
                        <p className="text-xs font-serif-vintage text-blue-900 mt-1 italic">
                          "{b.personalNote}"
                        </p>
                        <p className="text-[10px] text-blue-600 mt-1">
                          📍 Drifting at {b.toCity} • {b.distanceKm} km from port
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                        🌊 Intact at Sea
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. BURIED TREASURE SIMULATOR */}
      {activeTool === 'treasure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bury New Treasure Form */}
          <div className="bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Bury Treasure as {activePersona.name}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Select Photo to Bury
              </label>
              <select
                value={selectedTreasurePhotoId}
                onChange={(e) => setSelectedTreasurePhotoId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.locationName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">Secret Note</label>
              <input
                type="text"
                value={treasureNote}
                onChange={(e) => setTreasureNote(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">Riddle Hint</label>
              <input
                type="text"
                value={treasureRiddle}
                onChange={(e) => setTreasureRiddle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden"
              />
            </div>

            <button
              onClick={handleBuryTreasureAsPersona}
              className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Compass className="w-4 h-4" />
              <span>Bury at Landmark Coordinates</span>
            </button>
          </div>

          {/* Treasures List & Dig Site */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Buried Treasures on the Memory Map
              </h3>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-bold text-amber-700 hover:underline flex items-center space-x-1"
              >
                <span>View on Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {treasures.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={t.photo.url}
                        alt="treasure"
                        className="w-14 h-14 rounded-xl object-cover border border-amber-300 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-[#2D241E]">{t.photo.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.isDugUp
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.isDugUp ? '✓ Discovered' : '🏴‍☠️ Hidden Under Ground'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A6958] mt-0.5">
                          📍 {t.locationName} • Buried by {t.ownerName}
                        </p>
                        <p className="text-xs font-serif-vintage text-[#4A3D2F] mt-1">
                          Hint: "{t.riddleHint}"
                        </p>
                      </div>
                    </div>

                    {/* Dig Up Button */}
                    <button
                      onClick={() => handleDigUpTreasureAsPersona(t)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs shrink-0"
                    >
                      ⛏️ Dig Up as {activePersona.name}
                    </button>
                  </div>

                  {/* Discovery Log */}
                  {t.dugUpLogs.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/70 text-xs flex items-center space-x-2 text-stone-600">
                      <span className="font-bold text-amber-900">Found by:</span>
                      {t.dugUpLogs.map((log, i) => (
                        <span
                          key={i}
                          className="bg-white px-2 py-0.5 rounded-full border border-amber-200 text-[10px] font-medium"
                        >
                          {log.friendName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Keepsake Reply Chain */}
                  {t.replyChain.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-amber-200/70">
                      <span className="text-[10px] uppercase font-bold text-amber-800">
                        Keepsake Trail & Replies:
                      </span>
                      {t.replyChain.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-2 bg-white rounded-xl border border-amber-100 flex items-center space-x-2 text-xs"
                        >
                          <img
                            src={rep.photoUrl}
                            alt="reply"
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div>
                            <span className="font-bold text-[#2D241E]">{rep.authorName}:</span>{' '}
                            <span className="font-serif-vintage italic">"{rep.note}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Keepsake Reply */}
                  {replyTreasureId === t.id ? (
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="text"
                        value={treasureReplyNote}
                        onChange={(e) => setTreasureReplyNote(e.target.value)}
                        placeholder={`Leave a souvenir note as ${activePersona.name}...`}
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-amber-300 bg-white outline-hidden"
                      />
                      <button
                        onClick={() => handleAddTreasureReply(t.id)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-xl"
                      >
                        Pin Note
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReplyTreasureId(t.id);
                        setTreasureReplyNote('');
                      }}
                      className="text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      + Add Keepsake Souvenir Note as {activePersona.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. AIRMAIL & SLOW COURIER CARRIER SIMULATOR */}
      {activeTool === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatch Airmail Form */}
          <div className="bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <Send className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Dispatch Courier as {activePersona.name}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Select Photo to Mail
              </label>
              <select
                value={sendPhotoId}
                onChange={(e) => setSendPhotoId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Recipient Friend
              </label>
              <select
                value={recipientFriendId}
                onChange={(e) => setRecipientFriendId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
              >
                <option value="user">You (Curator) • {currentUser.homeCity}</option>
                {friends
                  .filter((f) => f.id !== activePersona.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} • {f.homeCity}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Select Courier Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pigeon', label: 'Pigeon', icon: Bird },
                  { id: 'plane', label: 'Air Clipper', icon: Plane },
                  { id: 'ship', label: 'Steamship', icon: Ship },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSendCarrier(c.id as any)}
                      className={`p-2 rounded-xl border text-center text-xs font-semibold flex flex-col items-center space-y-1 ${
                        sendCarrier === c.id
                          ? 'border-rose-500 bg-rose-50 text-rose-800'
                          : 'border-[#DECDB9] bg-[#FAF7F2]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-rose-600" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Postcard Message
              </label>
              <textarea
                rows={2}
                value={sendNote}
                onChange={(e) => setSendNote(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-serif-vintage text-sm outline-hidden resize-none"
              />
            </div>

            <button
              onClick={handleSendAirmailAsPersona}
              className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Launch Courier Dispatch</span>
            </button>
          </div>

          {/* Couriers In-Flight */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Couriers & Postcards In-Transit
              </h3>
              <span className="text-xs text-[#7A6958]">
                {packages.filter((p) => !p.isMessageInBottle).length} deliveries logged
              </span>
            </div>

            <div className="space-y-3">
              {packages
                .filter((p) => !p.isMessageInBottle)
                .map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={pkg.photoUrls[0]}
                        alt="mail"
                        className="w-14 h-14 rounded-xl object-cover border border-rose-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-rose-950">
                            From: {pkg.senderName} ➔ To: {pkg.recipientName}
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                            {pkg.carrier}
                          </span>
                        </div>
                        <p className="text-xs font-serif-vintage text-rose-900 mt-1 italic">
                          "{pkg.personalNote}"
                        </p>
                        <p className="text-[10px] text-rose-700 mt-1">
                          {pkg.fromCity} ➔ {pkg.toCity} ({pkg.distanceKm} km)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {pkg.arrived ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                          ✓ Delivered
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeliverNow(pkg)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                          title="Instantly deliver this package without waiting"
                        >
                          ⚡ Deliver Instantly
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MUSEUM WALL SPEECH BUBBLES SIMULATOR */}
      {activeTool === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add speech note form */}
          <div className="bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Pin Speech Bubble as {activePersona.name}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Select Museum Artwork
              </label>
              <select
                value={notePhotoId}
                onChange={(e) => setNotePhotoId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
              >
                {photos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.speechBubbleNotes?.length || 0} notes)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                Speech Bubble Comment
              </label>
              <textarea
                rows={3}
                value={bubbleNoteText}
                onChange={(e) => setBubbleNoteText(e.target.value)}
                placeholder="Leave your reaction, memory, or praise on this photo frame..."
                className="w-full text-xs p-3 rounded-2xl border border-[#DECDB9] bg-[#FAF7F2] font-serif-vintage text-sm outline-hidden resize-none"
              />
            </div>

            <button
              onClick={handlePinSpeechBubbleAsPersona}
              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Pin Speech Bubble to Museum Frame</span>
            </button>

            <button
              onClick={() => onNavigateTab('museum')}
              className="w-full py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Jump to 3D Museum to View Walls</span>
            </button>
          </div>

          {/* Wall Speech Notes Preview */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-[#DECDB9] shadow-xs space-y-4">
            <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
              Speech Bubbles Currently Pinned on Museum Frames
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {photos
                .filter((p) => p.speechBubbleNotes && p.speechBubbleNotes.length > 0)
                .map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3.5 rounded-2xl border border-[#DECDB9] bg-[#FAF7F2] space-y-2.5"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-12 h-12 rounded-xl object-cover border border-[#DECDB9]"
                      />
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#2D241E] truncate">
                          {photo.title}
                        </h4>
                        <p className="text-[10px] text-[#7A6958] truncate">
                          {photo.locationName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {photo.speechBubbleNotes?.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white p-2.5 rounded-xl border border-[#E5DAC8] flex items-start space-x-2 shadow-2xs"
                        >
                          <img
                            src={note.authorAvatar}
                            alt={note.authorName}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-[#2D241E]">{note.authorName}:</span>{' '}
                            <span className="font-serif-vintage text-[#4A3D2F]">
                              "{note.text}"
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SIMULATE SPOT GUESS */}
      {activeTool === 'guess' && (
        <div className="bg-white p-6 rounded-3xl border border-[#DECDB9] shadow-xs max-w-xl mx-auto space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-serif-vintage text-[#2D241E]">
                Simulate Spot Guess as {activePersona.name}
              </h3>
              <p className="text-xs text-[#7A6958]">
                Take a mystery guess to update distance score and museum leaderboard
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
              Select Mystery Photo
            </label>
            <select
              value={guessPhotoId}
              onChange={(e) => setGuessPhotoId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] font-medium outline-hidden"
            >
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.locationName})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSimulateGuessAsPersona}
            className="w-full py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Submit Guess as {activePersona.name}</span>
          </button>
        </div>
      )}
    </div>
  );
};
