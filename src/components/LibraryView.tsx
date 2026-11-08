import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Trash2,
  FolderPlus,
  Plane,
  Send,
  Ship,
  Sparkle,
  X,
  Check,
  Calendar,
  MapPin,
  Palette,
  LocateFixed,
  Filter,
  CheckCircle2,
  Clock,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { Photo, Album, ColorFamily, StructuredSearchFilter, Friend } from '../types';

interface LibraryViewProps {
  photos: Photo[];
  albums: Album[];
  friends: Friend[];
  activeTrip: Album | null;
  onSelectPhoto: (photo: Photo) => void;
  onDeletePhoto: (photoId: string) => void;
  onAddPhotoToAlbum: (photoId: string, albumId: string) => void;
  onRemovePhotoFromAlbum: (photoId: string, albumId: string) => void;
  onCreateAlbum: (album: Album) => void;
  onDeleteAlbum: (albumId: string) => void;
  onOpenImport: () => void;
  onOpenStartTripModal: () => void;
  onEndTrip: () => void;
  onBuryAsTreasure: (photo: Photo) => void;
  onSendAsBottle: (photo: Photo) => void;
  onSendToFriend: (photo: Photo, friend: Friend) => void;
  onPlacePhotoOnMap: (photo: Photo) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  photos,
  albums,
  friends,
  activeTrip,
  onSelectPhoto,
  onDeletePhoto,
  onAddPhotoToAlbum,
  onRemovePhotoFromAlbum,
  onCreateAlbum,
  onDeleteAlbum,
  onOpenImport,
  onOpenStartTripModal,
  onEndTrip,
  onBuryAsTreasure,
  onSendAsBottle,
  onSendToFriend,
  onPlacePhotoOnMap,
}) => {
  // Active Album filter
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');

  // Search & Filter state
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [activeAiFilter, setActiveAiFilter] = useState<StructuredSearchFilter | null>(null);

  // Selected Photo for Top Action Bar (Apple Photos style action bar)
  const [activeSelectedPhotoId, setActiveSelectedPhotoId] = useState<string | null>(null);

  // Album selector popover state
  const [isAlbumDropdownOpen, setIsAlbumDropdownOpen] = useState(false);
  const [isFriendSendDropdownOpen, setIsFriendSendDropdownOpen] = useState(false);

  // Filter toolbar states
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Create Album modal state
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumColor, setNewAlbumColor] = useState('#E11D48');

  // Find active selected photo
  const selectedPhoto = photos.find((p) => p.id === activeSelectedPhotoId) || null;

  // Extract years
  const years = useMemo(() => {
    const set = new Set<number>();
    photos.forEach((p) => {
      if (p.year) set.add(p.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [photos]);

  // Color families
  const colorFamilies: ColorFamily[] = [
    'warm',
    'blue',
    'green',
    'golden',
    'earthy',
    'rose',
    'monochrome',
  ];

  // Natural Language Search via Gemini API
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) {
      setActiveAiFilter(null);
      return;
    }

    setIsAiSearching(true);
    try {
      const res = await fetch('/api/gemini/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: naturalQuery }),
      });

      if (res.ok) {
        const parsed = await res.json();
        setActiveAiFilter(parsed);
      }
    } catch (err) {
      console.warn('AI search error, falling back:', err);
      setActiveAiFilter({ queryText: naturalQuery });
    } finally {
      setIsAiSearching(false);
    }
  };

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return photos
      .filter((photo) => {
        // Album filter
        if (selectedAlbumId !== 'all') {
          const album = albums.find((a) => a.id === selectedAlbumId);
          if (album && !album.photoIds.includes(photo.id)) return false;
        }

        // Year filter
        if (selectedYear !== 'all') {
          if (photo.year !== parseInt(selectedYear, 10)) return false;
        }

        // Color filter
        if (selectedColor !== 'all') {
          if (photo.colorFamily !== selectedColor) return false;
        }

        // AI search
        if (activeAiFilter) {
          if (activeAiFilter.year && photo.year !== activeAiFilter.year) return false;
          if (activeAiFilter.place) {
            const loc = (photo.locationName + ' ' + (photo.locationDetails?.city || '')).toLowerCase();
            if (!loc.includes(activeAiFilter.place.toLowerCase())) return false;
          }
          if (activeAiFilter.colorFamily) {
            if (photo.colorFamily.toLowerCase() !== activeAiFilter.colorFamily.toLowerCase()) return false;
          }
          if (activeAiFilter.tags && activeAiFilter.tags.length > 0) {
            const hasAnyTag = activeAiFilter.tags.some((t) =>
              photo.tags?.some((pt) => pt.toLowerCase().includes(t.toLowerCase()))
            );
            if (!hasAnyTag) return false;
          }
          if (activeAiFilter.textFilter || activeAiFilter.queryText) {
            const text = (activeAiFilter.textFilter || activeAiFilter.queryText || '').toLowerCase();
            const matchTitle = photo.title.toLowerCase().includes(text);
            const matchNote = photo.note.toLowerCase().includes(text);
            const matchLoc = photo.locationName.toLowerCase().includes(text);
            const matchTag = photo.tags.some((t) => t.toLowerCase().includes(text));
            if (!matchTitle && !matchNote && !matchLoc && !matchTag) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime();
        } else {
          return new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime();
        }
      });
  }, [photos, albums, selectedAlbumId, selectedYear, selectedColor, activeAiFilter, sortBy]);

  // Color dots for a given photo (each album it belongs to has a colored dot)
  const getPhotoAlbumDots = (photo: Photo) => {
    const parentAlbums = albums.filter((a) => a.photoIds.includes(photo.id));
    return parentAlbums.map((a) => ({
      albumId: a.id,
      title: a.title,
      color: a.colorDot || '#E11D48',
    }));
  };

  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;

    const newAlb: Album = {
      id: `album-${Date.now()}`,
      title: newAlbumTitle.trim(),
      description: 'Custom gallery album.',
      photoIds: activeSelectedPhotoId ? [activeSelectedPhotoId] : [],
      type: 'custom',
      colorDot: newAlbumColor,
      createdAt: Date.now(),
    };

    onCreateAlbum(newAlb);
    setSelectedAlbumId(newAlb.id);
    setNewAlbumTitle('');
    setIsCreatingAlbum(false);
  };

  const activeAlbum = albums.find((a) => a.id === selectedAlbumId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Active Trip Banner (If trip in progress) */}
      {activeTrip && (
        <div className="bg-[#FAF0ED] border border-[#ECCDC5] rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-[#B83A28] animate-ping" />
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#B83A28] block">
                Trip In Progress
              </span>
              <h3 className="text-sm font-bold text-[#2D241E]">
                {activeTrip.title}
              </h3>
              <p className="text-[11px] text-[#7A6958]">
                Every imported photo will automatically be added to this trip until you finish it.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedAlbumId(activeTrip.id)}
              className="px-3 py-1.5 text-xs font-semibold text-[#2D241E] bg-white border border-[#D8C7B0] rounded-lg hover:bg-[#FAF5EB]"
            >
              View Trip Photos ({activeTrip.photoIds.length})
            </button>
            <button
              onClick={onEndTrip}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg shadow-xs"
            >
              Finish Trip
            </button>
          </div>
        </div>
      )}

      {/* TOP CONTEXTUAL ACTION BAR (Combines Treasure / Bottle / Send / Album / Delete on Selected Photo) */}
      {selectedPhoto && (
        <div className="sticky top-20 z-20 bg-[#2D241E] text-white rounded-2xl p-3 sm:px-5 sm:py-3 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-[#4A3D2F]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="w-10 h-10 rounded-lg object-cover border border-white/20"
            />
            <div className="truncate">
              <span className="text-[10px] font-mono text-[#E8C5A8] uppercase tracking-wider block font-bold">
                Selected Photo
              </span>
              <h4 className="text-xs font-bold truncate max-w-[200px] sm:max-w-[280px]">
                {selectedPhoto.title}
              </h4>
            </div>
          </div>

          {/* Action Buttons: Treasure Chest, Bottle, Send, Add to Album, Delete */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs">
            {/* Bury as Treasure */}
            <button
              onClick={() => {
                onBuryAsTreasure(selectedPhoto);
                setActiveSelectedPhotoId(null);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Bury as treasure chest on map"
            >
              <span>🏴‍☠️</span>
              <span className="hidden sm:inline">Bury Treasure</span>
            </button>

            {/* Message in a Bottle */}
            <button
              onClick={() => {
                onSendAsBottle(selectedPhoto);
                setActiveSelectedPhotoId(null);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Cast as message in a bottle to stranger"
            >
              <span>🌊</span>
              <span className="hidden sm:inline">Bottle</span>
            </button>

            {/* Send / Airmail to Friend Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsFriendSendDropdownOpen(!isFriendSendDropdownOpen);
                  setIsAlbumDropdownOpen(false);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#235478] hover:bg-[#1A4260] rounded-lg transition-colors font-medium"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isFriendSendDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#FFFDF9] text-[#2D241E] rounded-xl shadow-2xl border border-[#D8C7B0] p-1.5 z-30 space-y-1">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8C7A6B]">
                    Airmail to Friend:
                  </div>
                  {friends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onSendToFriend(selectedPhoto, f);
                        setIsFriendSendDropdownOpen(false);
                        setActiveSelectedPhotoId(null);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#F2EAE0] flex items-center space-x-2"
                    >
                      <img src={f.avatar} alt={f.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add to Album Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAlbumDropdownOpen(!isAlbumDropdownOpen);
                  setIsFriendSendDropdownOpen(false);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Album</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isAlbumDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#FFFDF9] text-[#2D241E] rounded-xl shadow-2xl border border-[#D8C7B0] p-1.5 z-30 space-y-1 max-h-56 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8C7A6B]">
                    Toggle in Album:
                  </div>
                  {albums.map((alb) => {
                    const isInAlbum = alb.photoIds.includes(selectedPhoto.id);
                    return (
                      <button
                        key={alb.id}
                        onClick={() => {
                          if (isInAlbum) {
                            onRemovePhotoFromAlbum(selectedPhoto.id, alb.id);
                          } else {
                            onAddPhotoToAlbum(selectedPhoto.id, alb.id);
                          }
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#F2EAE0] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: alb.colorDot || '#E11D48' }}
                          />
                          <span className="truncate font-medium">{alb.title}</span>
                        </div>
                        {isInAlbum && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                  <div className="pt-1 border-t border-[#EAE0D1]">
                    <button
                      onClick={() => {
                        setIsAlbumDropdownOpen(false);
                        setIsCreatingAlbum(true);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-[#B83A28] font-semibold hover:underline"
                    >
                      + Create New Album
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Photo */}
            <button
              onClick={() => {
                if (confirm('Delete this photo from your gallery?')) {
                  onDeletePhoto(selectedPhoto.id);
                  setActiveSelectedPhotoId(null);
                }
              }}
              className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-900/40 rounded-lg transition-colors"
              title="Delete photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Deselect */}
            <button
              onClick={() => setActiveSelectedPhotoId(null)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Apple Photos Header: Search & Albums Strip */}
      <div className="space-y-3">
        {/* Search & Stats Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold font-serif-vintage tracking-tight text-[#2D241E]">
              {selectedAlbumId === 'all' ? 'All Photos' : activeAlbum?.title}
            </h2>
            <p className="text-xs text-[#7A6958]">
              {filteredPhotos.length} photos • Colored dots indicate albums
            </p>
          </div>

          {/* Clean Search Input */}
          <form onSubmit={handleAiSearch} className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              placeholder="Search by place, season, color..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[#D8C7B0] focus:border-[#2D241E] rounded-xl outline-hidden shadow-xs transition-all placeholder:text-[#9A8A7A]"
            />
            {naturalQuery && (
              <button
                type="button"
                onClick={() => {
                  setNaturalQuery('');
                  setActiveAiFilter(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#2D241E]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Albums Horizontal Strip with Colored Dots */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {/* All Photos Pill */}
          <button
            onClick={() => setSelectedAlbumId('all')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border flex items-center space-x-1.5 ${
              selectedAlbumId === 'all'
                ? 'bg-[#2D241E] text-white border-[#2D241E] font-semibold'
                : 'bg-white text-[#4A3D2F] border-[#DECDB9] hover:bg-[#FAF5EC]'
            }`}
          >
            <span>All Photos</span>
            <span className="text-[10px] opacity-75">({photos.length})</span>
          </button>

          {/* Album Pills with Colored Dots */}
          {albums.map((album) => {
            const isSelected = selectedAlbumId === album.id;
            const dotColor = album.colorDot || '#E11D48';

            return (
              <button
                key={album.id}
                onClick={() => setSelectedAlbumId(album.id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#2D241E] text-white border-[#2D241E] font-semibold shadow-xs'
                    : 'bg-white text-[#4A3D2F] border-[#DECDB9] hover:bg-[#FAF5EC]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="truncate max-w-[140px]">{album.title}</span>
                <span className="text-[10px] opacity-70">({album.photoIds.length})</span>
              </button>
            );
          })}

          {/* New Album button */}
          <button
            onClick={() => setIsCreatingAlbum(true)}
            className="px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all border border-dashed border-[#B83A28] text-[#B83A28] hover:bg-[#FAF0ED] flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Album</span>
          </button>

          {/* Start a Trip Shortcut */}
          {!activeTrip && (
            <button
              onClick={onOpenStartTripModal}
              className="px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all border border-[#235478] text-[#235478] bg-[#F0F5F9] hover:bg-[#E4EFF7] flex items-center space-x-1"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Start Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Sort Micro-Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs border-b border-[#EAE0D1]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-[#6A5A4B]">
            <Calendar className="w-3.5 h-3.5" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-[#2D241E] font-medium outline-hidden cursor-pointer"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 text-[#6A5A4B]">
            <Palette className="w-3.5 h-3.5" />
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="bg-transparent text-[#2D241E] font-medium outline-hidden cursor-pointer capitalize"
            >
              <option value="all">All Colors</option>
              {colorFamilies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[#6A5A4B]">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-[#2D241E] font-medium outline-hidden cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* APPLE PHOTOS STYLE TIGHT GRID (No scrapbook borders, pictures close together) */}
      {filteredPhotos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#DECDB9]">
          <p className="text-sm font-semibold text-[#2D241E]">No photos found in this view</p>
          <p className="text-xs text-[#7A6958] mt-1">Import new photos or clear filters to view pictures.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-1.5">
          {filteredPhotos.map((photo) => {
            const isSelected = activeSelectedPhotoId === photo.id;
            const albumDots = getPhotoAlbumDots(photo);

            return (
              <div
                key={photo.id}
                onClick={() => {
                  // Toggle selection or open details
                  if (activeSelectedPhotoId === photo.id) {
                    onSelectPhoto(photo);
                  } else {
                    setActiveSelectedPhotoId(photo.id);
                  }
                }}
                onDoubleClick={() => onSelectPhoto(photo)}
                className={`relative group aspect-square overflow-hidden cursor-pointer transition-all duration-150 rounded-sm sm:rounded-md bg-[#EFE8DD] ${
                  isSelected ? 'ring-3 ring-[#2D241E] ring-offset-2 z-10' : 'hover:opacity-90'
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />

                {/* Top Overlay Controls: Trash / Select Indicator */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this photo?')) onDeletePhoto(photo.id);
                    }}
                    title="Delete photo"
                    className="p-1 rounded-full bg-black/60 text-white hover:bg-[#B83A28] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Bottom Left: Colored Dots representing albums photo belongs to */}
                {albumDots.length > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center space-x-1 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded-full pointer-events-none">
                    {albumDots.slice(0, 3).map((dot, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full shadow-xs"
                        style={{ backgroundColor: dot.color }}
                        title={`In album: ${dot.title}`}
                      />
                    ))}
                    {albumDots.length > 3 && (
                      <span className="text-[8px] text-white font-mono font-bold">
                        +{albumDots.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Unplaced indicator */}
                {!photo.isPlaced && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlacePhotoOnMap(photo);
                    }}
                    className="absolute top-1 left-1 bg-[#B83A28] text-white p-1 rounded-md shadow-xs"
                    title="Unplaced: Click to place on map"
                  >
                    <LocateFixed className="w-2.5 h-2.5 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ALBUM MODAL */}
      {isCreatingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-[#D8C7B0] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE0D1]">
              <h3 className="text-base font-bold text-[#2D241E]">New Album</h3>
              <button
                onClick={() => setIsCreatingAlbum(false)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlbumSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#5A4B3C] mb-1">Album Title</label>
                <input
                  type="text"
                  required
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="e.g. Summer in Tokyo, Foodie Tour"
                  className="w-full p-2 border border-[#DECDB9] rounded-lg outline-hidden focus:border-[#2D241E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5A4B3C] mb-1">Album Color Dot</label>
                <div className="flex items-center space-x-2 pt-1">
                  {['#E11D48', '#D97706', '#0284C7', '#16A34A', '#7C3AED', '#475569'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewAlbumColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newAlbumColor === hex ? 'scale-125 border-[#2D241E]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAE0D1]">
                <button
                  type="button"
                  onClick={() => setIsCreatingAlbum(false)}
                  className="px-3 py-1.5 text-[#7A6958]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2D241E] text-white rounded-lg font-semibold hover:bg-black"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
