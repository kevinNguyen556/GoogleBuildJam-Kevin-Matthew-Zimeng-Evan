import React, { useState, useEffect } from 'react';
import {
  Photo,
  Album,
  GhostPin,
  OffLimitsZone,
  Friend,
  UserHomeLocation,
  InTransitPackage,
  BuriedTreasure,
  GuessLogEntry,
  ActiveTab,
  AppTheme,
  UserAccount,
} from './types';
import {
  getAllPhotosFromDB,
  savePhotoToDB,
  savePhotosBatchToDB,
  deletePhotoFromDB,
  getAllAlbumsFromDB,
  saveAlbumToDB,
  deleteAlbumFromDB,
  getAllGhostPinsFromDB,
  saveGhostPinToDB,
  deleteGhostPinFromDB,
  getAllOffLimitsZonesFromDB,
  saveOffLimitsZoneToDB,
  deleteOffLimitsZoneFromDB,
  getAllFriendsFromDB,
  saveFriendsBatchToDB,
  saveFriendToDB,
  getAllPackagesFromDB,
  savePackageToDB,
  getAllTreasuresFromDB,
  saveTreasureToDB,
  getAllGuessLogsFromDB,
  saveGuessLogToDB,
  getAllAccountsFromDB,
  saveAccountToDB,
} from './utils/indexedDB';
import {
  INITIAL_PHOTOS,
  INITIAL_ALBUMS,
  INITIAL_GHOST_PINS,
  INITIAL_OFF_LIMITS_ZONES,
  SAMPLE_FRIENDS,
  DEFAULT_USER_HOME,
  INITIAL_PACKAGES,
  INITIAL_TREASURES,
  DEFAULT_ACCOUNTS,
} from './utils/sampleData';
import { Navigation } from './components/Navigation';
import { LibraryView } from './components/LibraryView';
import { MapView } from './components/MapView';
import { MuseumView } from './components/MuseumView';
import { PartyGameView } from './components/PartyGameView';
import { DemoLabView } from './components/DemoLabView';
import { StartTripModal } from './components/StartTripModal';
import { ImportModal } from './components/ImportModal';
import { MemoryCardModal } from './components/MemoryCardModal';
import { OffLimitsModal } from './components/OffLimitsModal';
import { SettingsModal } from './components/SettingsModal';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [ghostPins, setGhostPins] = useState<GhostPin[]>([]);
  const [offLimitsZones, setOffLimitsZones] = useState<OffLimitsZone[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userHome, setUserHome] = useState<UserHomeLocation>(DEFAULT_USER_HOME);
  const [packages, setPackages] = useState<InTransitPackage[]>([]);
  const [treasures, setTreasures] = useState<BuriedTreasure[]>([]);
  const [guessLogs, setGuessLogs] = useState<GuessLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Theme state
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('googleheim_theme') as AppTheme) || 'parchment';
  });

  // Account System state
  const [accounts, setAccounts] = useState<UserAccount[]>(DEFAULT_ACCOUNTS);
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEFAULT_ACCOUNTS[0]);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Trip State
  const [activeTripAlbumId, setActiveTripAlbumId] = useState<string | null>(null);
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);

  // Modals & Selection
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOffLimitsOpen, setIsOffLimitsOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Placing unplaced photo on map
  const [unplacedPhotoToPlace, setUnplacedPhotoToPlace] = useState<Photo | null>(null);

  // Toast / Status notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('googleheim_theme', newTheme);
    showToast(`Theme changed to ${newTheme.toUpperCase()}`);
  };

  // Load or Initialize IndexedDB data
  useEffect(() => {
    async function loadData() {
      try {
        let storedPhotos = await getAllPhotosFromDB();
        let storedAlbums = await getAllAlbumsFromDB();
        let storedGhostPins = await getAllGhostPinsFromDB();
        let storedZones = await getAllOffLimitsZonesFromDB();
        let storedFriends = await getAllFriendsFromDB();
        let storedPackages = await getAllPackagesFromDB();
        let storedTreasures = await getAllTreasuresFromDB();
        let storedLogs = await getAllGuessLogsFromDB();
        let storedAccounts = await getAllAccountsFromDB();

        if (storedPhotos.length === 0) {
          await savePhotosBatchToDB(INITIAL_PHOTOS);
          storedPhotos = INITIAL_PHOTOS;
        }

        if (storedAlbums.length === 0) {
          for (const a of INITIAL_ALBUMS) {
            await saveAlbumToDB(a);
          }
          storedAlbums = INITIAL_ALBUMS;
        }

        if (storedGhostPins.length === 0) {
          for (const g of INITIAL_GHOST_PINS) {
            await saveGhostPinToDB(g);
          }
          storedGhostPins = INITIAL_GHOST_PINS;
        }

        if (storedZones.length === 0) {
          for (const z of INITIAL_OFF_LIMITS_ZONES) {
            await saveOffLimitsZoneToDB(z);
          }
          storedZones = INITIAL_OFF_LIMITS_ZONES;
        }

        if (storedFriends.length === 0) {
          await saveFriendsBatchToDB(SAMPLE_FRIENDS);
          storedFriends = SAMPLE_FRIENDS;
        }

        if (storedPackages.length === 0) {
          for (const p of INITIAL_PACKAGES) {
            await savePackageToDB(p);
          }
          storedPackages = INITIAL_PACKAGES;
        }

        if (storedTreasures.length === 0) {
          for (const t of INITIAL_TREASURES) {
            await saveTreasureToDB(t);
          }
          storedTreasures = INITIAL_TREASURES;
        }

        if (storedAccounts.length === 0) {
          for (const acc of DEFAULT_ACCOUNTS) {
            await saveAccountToDB(acc);
          }
          storedAccounts = DEFAULT_ACCOUNTS;
        }

        setPhotos(storedPhotos);
        setAlbums(storedAlbums);
        setGhostPins(storedGhostPins);
        setOffLimitsZones(storedZones);
        setFriends(storedFriends);
        setPackages(storedPackages);
        setTreasures(storedTreasures);
        setGuessLogs(storedLogs);
        setAccounts(storedAccounts);
        if (storedAccounts.length > 0) {
          setCurrentUser(storedAccounts[0]);
        }
      } catch (err) {
        console.warn('Could not load IndexedDB, using in-memory fallbacks:', err);
        setPhotos(INITIAL_PHOTOS);
        setAlbums(INITIAL_ALBUMS);
        setGhostPins(INITIAL_GHOST_PINS);
        setOffLimitsZones(INITIAL_OFF_LIMITS_ZONES);
        setFriends(SAMPLE_FRIENDS);
        setPackages(INITIAL_PACKAGES);
        setTreasures(INITIAL_TREASURES);
        setAccounts(DEFAULT_ACCOUNTS);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const activeTrip = albums.find((a) => a.id === activeTripAlbumId) || null;

  // Check photos against off-limits privacy zones
  const isCoordInOffLimits = (lat: number, lon: number, zones: OffLimitsZone[]): boolean => {
    for (const zone of zones) {
      const dLat = (lat - zone.latitude) * 111000;
      const dLon = (lon - zone.longitude) * 111000 * Math.cos((zone.latitude * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist <= zone.radiusMeters) {
        return true;
      }
    }
    return false;
  };

  // Handle Photo Import (Auto-adds to active trip if trip is in progress!)
  const handlePhotosImported = async (newPhotos: Photo[]) => {
    const tripId = activeTripAlbumId;

    const audited = newPhotos.map((p) => {
      let albumIds = p.albumIds || [];
      if (tripId && !albumIds.includes(tripId)) {
        albumIds = [...albumIds, tripId];
      }

      let isOffLimits = false;
      if (p.isPlaced && p.latitude !== null && p.longitude !== null) {
        isOffLimits = isCoordInOffLimits(p.latitude, p.longitude, offLimitsZones);
      }

      return {
        ...p,
        albumIds,
        isOffLimits,
      };
    });

    const combined = [...audited, ...photos];
    setPhotos(combined);
    await savePhotosBatchToDB(audited);

    if (tripId) {
      const newIds = audited.map((p) => p.id);
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id === tripId) {
            const updated = {
              ...a,
              photoIds: Array.from(new Set([...a.photoIds, ...newIds])),
            };
            saveAlbumToDB(updated);
            return updated;
          }
          return a;
        })
      );
      showToast(`📸 ${newPhotos.length} photo(s) auto-added to trip: ${activeTrip?.title}`);
    } else {
      showToast(`📸 ${newPhotos.length} photo(s) imported and auto-added to Googleheim Museum!`);
    }
  };

  // Update Photo details
  const handleUpdatePhoto = async (updated: Photo) => {
    let isOffLimits = false;
    if (updated.isPlaced && updated.latitude !== null && updated.longitude !== null) {
      isOffLimits = isCoordInOffLimits(updated.latitude, updated.longitude, offLimitsZones);
    }
    const finalPhoto = { ...updated, isOffLimits };

    setPhotos((prev) => prev.map((p) => (p.id === finalPhoto.id ? finalPhoto : p)));
    setSelectedPhoto(finalPhoto);
    await savePhotoToDB(finalPhoto);
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setAlbums((prev) =>
      prev.map((a) => ({
        ...a,
        photoIds: a.photoIds.filter((id) => id !== photoId),
      }))
    );
    await deletePhotoFromDB(photoId);
    showToast('Photo deleted.');
  };

  // Add / Remove photo from album
  const handleAddPhotoToAlbum = async (photoId: string, albumId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      const cur = photo.albumIds || [];
      if (!cur.includes(albumId)) {
        const updatedPhoto = { ...photo, albumIds: [...cur, albumId] };
        setPhotos((prev) => prev.map((p) => (p.id === photoId ? updatedPhoto : p)));
        await savePhotoToDB(updatedPhoto);
      }
    }

    const album = albums.find((a) => a.id === albumId);
    if (album && !album.photoIds.includes(photoId)) {
      const updatedAlb = { ...album, photoIds: [...album.photoIds, photoId] };
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? updatedAlb : a)));
      await saveAlbumToDB(updatedAlb);
      showToast(`Added to "${album.title}"`);
    }
  };

  const handleRemovePhotoFromAlbum = async (photoId: string, albumId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo && photo.albumIds) {
      const updatedPhoto = { ...photo, albumIds: photo.albumIds.filter((id) => id !== albumId) };
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? updatedPhoto : p)));
      await savePhotoToDB(updatedPhoto);
    }

    const album = albums.find((a) => a.id === albumId);
    if (album) {
      const updatedAlb = { ...album, photoIds: album.photoIds.filter((id) => id !== photoId) };
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? updatedAlb : a)));
      await saveAlbumToDB(updatedAlb);
      showToast(`Removed from "${album.title}"`);
    }
  };

  // Update Photo Location (from map click)
  const handleUpdatePhotoLocation = async (
    photoId: string,
    lat: number,
    lon: number,
    locationName: string
  ) => {
    const target = photos.find((p) => p.id === photoId);
    if (!target) return;

    const inZone = isCoordInOffLimits(lat, lon, offLimitsZones);
    const updated: Photo = {
      ...target,
      latitude: lat,
      longitude: lon,
      isPlaced: true,
      locationName,
      isOffLimits: inZone,
    };

    setPhotos((prev) => prev.map((p) => (p.id === photoId ? updated : p)));
    setUnplacedPhotoToPlace(null);
    await savePhotoToDB(updated);
    showToast(`Pinned to ${locationName}`);
  };

  const handleStartPlacement = (photo: Photo) => {
    setUnplacedPhotoToPlace(photo);
    setActiveTab('map');
  };

  // Start & End a Trip
  const handleStartTrip = async (tripAlbum: Album) => {
    const updatedAlbums = [tripAlbum, ...albums];
    setAlbums(updatedAlbums);
    setActiveTripAlbumId(tripAlbum.id);
    await saveAlbumToDB(tripAlbum);
    confetti({ particleCount: 40, spread: 60 });
    showToast(`✈️ Trip started: "${tripAlbum.title}". Photos will auto-record here!`);
  };

  const handleEndTrip = () => {
    if (activeTrip) {
      showToast(`Trip finished: "${activeTrip.title}". Saved in gallery.`);
    }
    setActiveTripAlbumId(null);
  };

  // Photo Actions (Available everywhere including inside Museum)
  const handleBuryAsTreasure = async (photo: Photo) => {
    const lat = photo.latitude ?? 40.634;
    const lon = photo.longitude ?? 14.6027;

    const newTreasure: BuriedTreasure = {
      id: `treasure-${Date.now()}`,
      photoId: photo.id,
      photo,
      latitude: lat,
      longitude: lon,
      locationName: photo.locationName,
      note: photo.note || 'A hidden memory buried at this spot.',
      riddleHint: 'Look for this landmark where the picture was captured.',
      ownerId: currentUser.id,
      ownerName: currentUser.displayName,
      isDugUp: false,
      dugUpLogs: [],
      replyChain: [],
      createdAt: Date.now(),
    };

    setTreasures((prev) => [newTreasure, ...prev]);
    await saveTreasureToDB(newTreasure);
    confetti({ particleCount: 40, spread: 60 });
    showToast(`🏴‍☠️ Buried "${photo.title}" as treasure on the memory map!`);
  };

  const handleSendAsBottle = async (photo: Photo) => {
    const newPkg: InTransitPackage = {
      id: `pkg-${Date.now()}`,
      photoIds: [photo.id],
      photoUrls: [photo.url],
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: 'stranger',
      recipientName: 'Curious Wanderer',
      carrier: 'ship',
      speedType: 'slow',
      distanceKm: 4800,
      startTime: Date.now(),
      durationMs: 18000,
      arrived: false,
      weatherDelaySec: 0,
      isMessageInBottle: true,
      fromCity: currentUser.homeCity || userHome.city,
      fromLat: currentUser.latitude || userHome.latitude,
      fromLon: currentUser.longitude || userHome.longitude,
      toCity: 'Open Atlantic Ocean',
      toLat: 36.5,
      toLon: -28.0,
      postmarkText: 'BOTTLE • CAST TO DIGITAL OCEAN',
      personalNote: photo.note || 'Greetings from a fellow traveler.',
    };

    setPackages((prev) => [newPkg, ...prev]);
    await savePackageToDB(newPkg);
    confetti({ particleCount: 30, spread: 50 });
    showToast(`🌊 Cast "${photo.title}" into the ocean as a message in a bottle!`);
  };

  const handleSendToFriend = async (photo: Photo, friend: Friend) => {
    const newPkg: InTransitPackage = {
      id: `pkg-${Date.now()}`,
      photoIds: [photo.id],
      photoUrls: [photo.url],
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: friend.id,
      recipientName: friend.name,
      carrier: 'plane',
      speedType: 'slow',
      distanceKm: 5200,
      startTime: Date.now(),
      durationMs: 15000,
      arrived: false,
      weatherDelaySec: 0,
      isMessageInBottle: false,
      fromCity: currentUser.homeCity || userHome.city,
      fromLat: currentUser.latitude || userHome.latitude,
      fromLon: currentUser.longitude || userHome.longitude,
      toCity: friend.homeCity,
      toLat: friend.latitude,
      toLon: friend.longitude,
      postmarkText: `AIRMAIL • TO ${friend.name.toUpperCase()}`,
      personalNote: photo.note || 'Sent you this keepsake from Googleheim!',
    };

    setPackages((prev) => [newPkg, ...prev]);
    await savePackageToDB(newPkg);
    confetti({ particleCount: 35, spread: 55 });
    showToast(`✉️ Sent "${photo.title}" to ${friend.name}!`);
  };

  // Account Operations
  const handleLogin = (account: UserAccount) => {
    setCurrentUser(account);
    showToast(`Signed in as ${account.displayName}`);
  };

  const handleCreateAccount = async (newAccount: UserAccount) => {
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    setCurrentUser(newAccount);
    await saveAccountToDB(newAccount);
    confetti({ particleCount: 35, spread: 50 });
    showToast(`Welcome, ${newAccount.displayName}! Account created.`);
  };

  // Friend Operations
  const handleAddFriend = async (newFriend: Friend) => {
    const updated = [...friends, newFriend];
    setFriends(updated);
    await saveFriendToDB(newFriend);
    showToast(`Added ${newFriend.name} to Friends Circle.`);
  };

  const handleRemoveFriend = async (friendId: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    showToast('Friend removed.');
  };

  // Album creation & deletion
  const handleCreateAlbum = async (album: Album) => {
    setAlbums((prev) => [album, ...prev]);
    await saveAlbumToDB(album);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (activeTripAlbumId === albumId) {
      setActiveTripAlbumId(null);
    }
    await deleteAlbumFromDB(albumId);
  };

  // Ghost Pins
  const handleAddGhostPin = async (pin: GhostPin) => {
    setGhostPins((prev) => [pin, ...prev]);
    await saveGhostPinToDB(pin);
  };

  const handleDeleteGhostPin = async (pinId: string) => {
    setGhostPins((prev) => prev.filter((p) => p.id !== pinId));
    await deleteGhostPinFromDB(pinId);
  };

  // Off Limits
  const handleAddOffLimitsZone = async (zone: OffLimitsZone) => {
    const updatedZones = [...offLimitsZones, zone];
    setOffLimitsZones(updatedZones);
    await saveOffLimitsZoneToDB(zone);

    const reAudited = photos.map((p) => {
      if (p.isPlaced && p.latitude !== null && p.longitude !== null) {
        return {
          ...p,
          isOffLimits: isCoordInOffLimits(p.latitude, p.longitude, updatedZones),
        };
      }
      return p;
    });
    setPhotos(reAudited);
    await savePhotosBatchToDB(reAudited);
  };

  const handleDeleteOffLimitsZone = async (zoneId: string) => {
    const updatedZones = offLimitsZones.filter((z) => z.id !== zoneId);
    setOffLimitsZones(updatedZones);
    await deleteOffLimitsZoneFromDB(zoneId);

    const reAudited = photos.map((p) => {
      if (p.isPlaced && p.latitude !== null && p.longitude !== null) {
        return {
          ...p,
          isOffLimits: isCoordInOffLimits(p.latitude, p.longitude, updatedZones),
        };
      }
      return p;
    });
    setPhotos(reAudited);
    await savePhotosBatchToDB(reAudited);
  };

  // Guess Logs
  const handleRecordGuess = async (entry: GuessLogEntry) => {
    setGuessLogs((prev) => [entry, ...prev]);
    await saveGuessLogToDB(entry);
  };

  // Game ready batch
  const handleMarkPhotosGameReady = async (photoIds: string[]) => {
    const updatedPhotos = photos.map((p) =>
      photoIds.includes(p.id) ? { ...p, gameReady: true } : p
    );
    setPhotos(updatedPhotos);
    await savePhotosBatchToDB(updatedPhotos);
    showToast(`Marked ${photoIds.length} photos as Game Ready.`);
  };

  const handleReportPhoto = async (photoId: string) => {
    const updatedPhotos = photos.map((p) =>
      p.id === photoId ? { ...p, isReported: true, reportReason: 'Reported' } : p
    );
    setPhotos(updatedPhotos);
    await savePhotosBatchToDB(updatedPhotos);
    showToast('Photo reported.');
  };

  const unplacedCount = photos.filter((p) => !p.isPlaced).length;

  // Theme-specific container styles
  const getThemeClass = (t: AppTheme) => {
    switch (t) {
      case 'gallery':
        return 'bg-[#F8FAFC] text-[#0F172A] selection:bg-slate-200';
      case 'midnight':
        return 'bg-[#0E1217] text-[#F1F5F9] selection:bg-amber-900/40';
      case 'terracotta':
        return 'bg-[#FAF2EC] text-[#3D251E] selection:bg-[#E8C5A8]';
      case 'parchment':
      default:
        return 'bg-[#F6F1EA] text-[#2C241E] selection:bg-[#E8C5A8]';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold font-serif-vintage text-[#2D241E] animate-pulse">
          Googleheim
        </h2>
        <p className="text-xs text-[#7A6958] mt-1 font-mono">Curating Gallery & Memories...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${getThemeClass(theme)} flex flex-col transition-colors duration-300`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D241E] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold animate-fade-in flex items-center space-x-2 border border-white/20">
          <span className="text-[#E8C5A8]">✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top 4-Tab Navigation Bar with Googleheim branding, settings cog next to import */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenOffLimits={() => setIsOffLimitsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        photoCount={photos.length}
        unplacedCount={unplacedCount}
        offLimitsCount={offLimitsZones.length}
        activeTrip={activeTrip}
        onOpenStartTripModal={() => setIsStartTripOpen(true)}
        onEndTrip={handleEndTrip}
      />

      {/* Main Views (4 Tabs: Library, Map, Museum, Party Game) */}
      <main className="flex-1">
        {activeTab === 'library' && (
          <LibraryView
            photos={photos}
            albums={albums}
            friends={friends}
            activeTrip={activeTrip}
            onSelectPhoto={(photo) => {
              setSelectedPhoto(photo);
              setIsMemoryModalOpen(true);
            }}
            onDeletePhoto={handleDeletePhoto}
            onAddPhotoToAlbum={handleAddPhotoToAlbum}
            onRemovePhotoFromAlbum={handleRemovePhotoFromAlbum}
            onCreateAlbum={handleCreateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenStartTripModal={() => setIsStartTripOpen(true)}
            onEndTrip={handleEndTrip}
            onBuryAsTreasure={handleBuryAsTreasure}
            onSendAsBottle={handleSendAsBottle}
            onSendToFriend={handleSendToFriend}
            onPlacePhotoOnMap={handleStartPlacement}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            photos={photos}
            ghostPins={ghostPins}
            offLimitsZones={offLimitsZones}
            onSelectPhoto={(photo) => {
              setSelectedPhoto(photo);
              setIsMemoryModalOpen(true);
            }}
            onAddGhostPin={handleAddGhostPin}
            onDeleteGhostPin={handleDeleteGhostPin}
            onUpdatePhotoLocation={handleUpdatePhotoLocation}
            unplacedPhotoToPlace={unplacedPhotoToPlace}
            onCancelPlacement={() => setUnplacedPhotoToPlace(null)}
          />
        )}

        {activeTab === 'museum' && (
          <MuseumView
            photos={photos}
            albums={albums}
            friends={friends}
            offLimitsZones={offLimitsZones}
            guessLogs={guessLogs}
            currentUser={currentUser}
            onRecordGuess={handleRecordGuess}
            onUpdatePhoto={handleUpdatePhoto}
            onInspectPhoto={(p) => {
              setSelectedPhoto(p);
              setIsMemoryModalOpen(true);
            }}
            onReportPhoto={handleReportPhoto}
            onMarkPhotosGameReady={handleMarkPhotosGameReady}
            onBuryAsTreasure={handleBuryAsTreasure}
            onSendAsBottle={handleSendAsBottle}
            onSendToFriend={handleSendToFriend}
          />
        )}

        {activeTab === 'party' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <PartyGameView
              photos={photos}
              friends={friends}
              offLimitsZones={offLimitsZones}
              onMarkPhotosGameReady={handleMarkPhotosGameReady}
            />
          </div>
        )}

        {activeTab === 'demo' && (
          <DemoLabView
            photos={photos}
            friends={friends}
            treasures={treasures}
            packages={packages}
            currentUser={currentUser}
            onUpdatePhoto={handleUpdatePhoto}
            onAddTreasure={async (t) => {
              setTreasures((prev) => [t, ...prev]);
              await saveTreasureToDB(t);
              showToast(`🏴‍☠️ "${t.photo.title}" buried by ${t.ownerName}!`);
            }}
            onUpdateTreasure={async (t) => {
              setTreasures((prev) => prev.map((item) => (item.id === t.id ? t : item)));
              await saveTreasureToDB(t);
              showToast(`Treasure updated.`);
            }}
            onAddPackage={async (p) => {
              setPackages((prev) => [p, ...prev]);
              await savePackageToDB(p);
              showToast(
                p.isMessageInBottle
                  ? `🌊 Bottle cast by ${p.senderName}!`
                  : `✉️ Courier dispatched by ${p.senderName}!`
              );
            }}
            onUpdatePackage={async (p) => {
              setPackages((prev) => prev.map((item) => (item.id === p.id ? p : item)));
              await savePackageToDB(p);
              showToast(`Delivery status updated.`);
            }}
            onRecordGuess={handleRecordGuess}
            onNavigateTab={setActiveTab}
          />
        )}
      </main>

      {/* Settings Modal (Theme, Accounts, Friends) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        currentUser={currentUser}
        accounts={accounts}
        friends={friends}
        onLogin={handleLogin}
        onCreateAccount={handleCreateAccount}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
      />

      {/* Start Trip Modal */}
      <StartTripModal
        isOpen={isStartTripOpen}
        onClose={() => setIsStartTripOpen(false)}
        onStartTrip={handleStartTrip}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onPhotosImported={handlePhotosImported}
      />

      {/* Memory Card Modal */}
      <MemoryCardModal
        photo={selectedPhoto}
        isOpen={isMemoryModalOpen}
        onClose={() => {
          setIsMemoryModalOpen(false);
          setSelectedPhoto(null);
        }}
        onUpdatePhoto={handleUpdatePhoto}
        onDeletePhoto={handleDeletePhoto}
        onStartManualPlacement={handleStartPlacement}
      />

      {/* Privacy Off-Limits Zones Modal */}
      <OffLimitsModal
        isOpen={isOffLimitsOpen}
        onClose={() => setIsOffLimitsOpen(false)}
        zones={offLimitsZones}
        onAddZone={handleAddOffLimitsZone}
        onDeleteZone={handleDeleteOffLimitsZone}
      />
    </div>
  );
}
