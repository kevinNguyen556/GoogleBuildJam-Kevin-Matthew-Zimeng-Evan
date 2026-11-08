import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Music,
  Tag,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  ExternalLink,
  Save,
  Palette,
  LocateFixed,
} from 'lucide-react';
import { Photo, ColorFamily } from '../types';

interface MemoryCardModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePhoto: (updated: Photo) => void;
  onDeletePhoto: (photoId: string) => void;
  onStartManualPlacement?: (photo: Photo) => void;
}

export const MemoryCardModal: React.FC<MemoryCardModalProps> = ({
  photo,
  isOpen,
  onClose,
  onUpdatePhoto,
  onDeletePhoto,
  onStartManualPlacement,
}) => {
  if (!isOpen || !photo) return null;

  const [title, setTitle] = useState(photo.title);
  const [note, setNote] = useState(photo.note);
  const [songUrl, setSongUrl] = useState(photo.songUrl || '');
  const [gameReady, setGameReady] = useState(photo.gameReady);
  const [tags, setTags] = useState<string[]>(photo.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [isMysteryFrame, setIsMysteryFrame] = useState(!!photo.isMysteryFrame);
  const [mysteryHint, setMysteryHint] = useState(photo.mysteryHint || '');
  const [mysteryDifficulty, setMysteryDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    photo.mysteryDifficulty || 'medium'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTitle(photo.title);
    setNote(photo.note);
    setSongUrl(photo.songUrl || '');
    setGameReady(photo.gameReady);
    setTags(photo.tags || []);
    setIsMysteryFrame(!!photo.isMysteryFrame);
    setMysteryHint(photo.mysteryHint || '');
    setMysteryDifficulty(photo.mysteryDifficulty || 'medium');
    setIsEditing(false);
    setHasChanges(false);
  }, [photo]);

  const handleSave = () => {
    const updated: Photo = {
      ...photo,
      title: title.trim() || 'Untitled Memory',
      note: note.trim(),
      songUrl: songUrl.trim(),
      gameReady,
      tags,
      isMysteryFrame,
      mysteryHint: mysteryHint.trim(),
      mysteryDifficulty,
    };
    onUpdatePhoto(updated);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setHasChanges(true);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setHasChanges(true);
  };

  const formattedDate = new Date(photo.dateTaken).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Extract Spotify or YouTube embed URL if valid
  const getEmbedInfo = (url: string) => {
    if (!url) return null;
    if (url.includes('spotify.com')) {
      const match = url.match(/track\/([a-zA-Z0-9]+)/);
      if (match) {
        return {
          type: 'spotify',
          src: `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`,
        };
      }
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      const vMatch = url.match(/[?&]v=([^&#]+)/);
      if (vMatch) videoId = vMatch[1];
      else {
        const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
        if (shortMatch) videoId = shortMatch[1];
      }
      if (videoId) {
        return {
          type: 'youtube',
          src: `https://www.youtube.com/embed/${videoId}`,
        };
      }
    }
    return null;
  };

  const embed = getEmbedInfo(songUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl overflow-hidden my-6">
        {/* Airmail ribbon top */}
        <div className="airmail-border" />

        {/* Modal Actions */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to remove this photo from your scrapbook?')) {
                onDeletePhoto(photo.id);
                onClose();
              }
            }}
            title="Delete photo"
            className="p-2 text-[#9A8A7A] hover:text-[#B83A28] hover:bg-[#F4ECE1] rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-[#9A8A7A] hover:text-[#2D241E] hover:bg-[#F4ECE1] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Polaroid Style Picture */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="polaroid-frame w-full max-w-[320px] transform -rotate-1 hover:rotate-0 transition-transform">
              <div className="relative overflow-hidden rounded bg-[#ECE3D5] aspect-4/5 flex items-center justify-center">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />

                {/* Postage Stamp Watermark / Cancellation */}
                <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-[#B83A28]/40 postmark-circle flex items-center justify-center text-[9px] font-mono uppercase text-[#B83A28]/70 pointer-events-none select-none">
                  <div className="text-center leading-tight">
                    <span>WAYFARER</span>
                    <br />
                    <span>{photo.year}</span>
                  </div>
                </div>
              </div>

              {/* Polaroid Footer caption */}
              <div className="mt-3 text-center">
                <p className="font-handwriting text-xl text-[#3A2E24] leading-snug">
                  {title || 'Untitled Memory'}
                </p>
                <p className="text-[11px] font-serif-vintage italic text-[#8A7968] mt-0.5">
                  {photo.locationName}
                </p>
              </div>
            </div>

            {/* Color Palette Strip */}
            <div className="w-full max-w-[320px] mt-4 p-2.5 bg-[#FAF4EB] rounded-lg border border-[#E4D7C5]">
              <div className="flex items-center justify-between text-xs text-[#7B6A58] mb-1.5">
                <span className="flex items-center font-medium">
                  <Palette className="w-3.5 h-3.5 mr-1 text-[#C28B38]" /> Dominant Palette
                </span>
                <span className="capitalize font-mono text-[11px] bg-[#EEDDC6] px-1.5 py-0.5 rounded text-[#4A3D2F]">
                  {photo.colorFamily}
                </span>
              </div>
              <div className="flex h-5 rounded overflow-hidden shadow-inner border border-[#D8C7B0]">
                {photo.palette.map((hex, i) => (
                  <div
                    key={i}
                    className="flex-1 group relative transition-transform hover:scale-105"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Memory Details & Editorial Note */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              {/* Geotag & Date Badge Header */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded bg-[#F4ECE0] text-[#5A4B3C] border border-[#DFCBB5]">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-[#235478]" />
                  {formattedDate}
                </span>

                {photo.isPlaced && photo.latitude !== null && photo.longitude !== null ? (
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded bg-[#F8EFE4] text-[#B83A28] border border-[#E9D5C0]">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-[#B83A28]" />
                    {photo.locationName}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (onStartManualPlacement) {
                        onStartManualPlacement(photo);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded bg-[#FFF0E8] text-[#B83A28] border border-[#F2D0BC] hover:bg-[#FFE3D6] transition-colors"
                  >
                    <LocateFixed className="w-3.5 h-3.5 mr-1 animate-pulse" />
                    Unplaced — Click to Pin on Map
                  </button>
                )}

                {photo.isPlaced && onStartManualPlacement && (
                  <button
                    onClick={() => {
                      onStartManualPlacement(photo);
                      onClose();
                    }}
                    className="text-[11px] text-[#7A6956] hover:text-[#B83A28] underline underline-offset-2 ml-auto"
                  >
                    Move location
                  </button>
                )}
              </div>

              {/* Title Input / Display */}
              <div className="mb-3">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#8C7A6B] mb-1">
                  Memory Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Give this moment a title..."
                  className="w-full text-lg sm:text-xl font-bold font-serif-vintage text-[#2D241E] bg-[#FAF5EC] border border-[#DECDB9] focus:border-[#B83A28] focus:bg-white rounded-lg px-3 py-1.5 outline-hidden transition-all"
                />
              </div>

              {/* Journal Note */}
              <div className="mb-4">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#8C7A6B] mb-1">
                  Scrapbook Journal Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setHasChanges(true);
                  }}
                  rows={3}
                  placeholder="Jot down the scents, sounds, feelings, and stories of this day..."
                  className="w-full font-handwriting text-base text-[#3A2E24] bg-[#FAF5EC] border border-[#DECDB9] focus:border-[#B83A28] focus:bg-white rounded-lg p-3 outline-hidden resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Tags Section */}
              <div className="mb-4">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#8C7A6B] mb-1 flex items-center justify-between">
                  <span>Tags (Gemini AI & Custom)</span>
                  <span className="text-[10px] lowercase text-[#A39281]">press enter to add</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#FAF5EC] border border-[#DECDB9] rounded-lg min-h-[42px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center text-xs bg-[#EEDDC6] text-[#4A3B2B] px-2 py-0.5 rounded-md font-medium border border-[#DECCB3]"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-[#8C7965] hover:text-[#B83A28]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="+ tag..."
                    className="text-xs bg-transparent outline-hidden px-1 py-0.5 text-[#2D241E] w-20"
                  />
                </div>
              </div>

              {/* Musical Memory (YouTube / Spotify URL) */}
              <div className="mb-4">
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#8C7A6B] mb-1 flex items-center">
                  <Music className="w-3.5 h-3.5 mr-1 text-[#235478]" />
                  <span>Memory Soundtrack (Spotify or YouTube Link)</span>
                </label>
                <input
                  type="url"
                  value={songUrl}
                  onChange={(e) => {
                    setSongUrl(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="https://open.spotify.com/track/... or https://youtube.com/watch?v=..."
                  className="w-full text-xs text-[#2D241E] bg-[#FAF5EC] border border-[#DECDB9] focus:border-[#235478] focus:bg-white rounded-lg px-3 py-2 outline-hidden transition-all"
                />

                {embed && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[#D8C7B0] bg-[#121212]">
                    {embed.type === 'spotify' ? (
                      <iframe
                        src={embed.src}
                        width="100%"
                        height="80"
                        allow="encrypted-media"
                        loading="lazy"
                        className="border-0"
                      />
                    ) : (
                      <iframe
                        src={embed.src}
                        width="100%"
                        height="140"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="border-0"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Privacy: Game Ready Toggle */}
              <div className="p-3 bg-[#F6EFE3] rounded-lg border border-[#E0D2BE] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-1.5 rounded-full ${
                      gameReady ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E5D7C3] text-[#786653]'
                    }`}
                  >
                    {gameReady ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Shield className="w-4 h-4 text-[#786653]" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#2D241E] block">
                      Game-Ready Status: {gameReady ? 'Active for Play & Games' : 'Strictly Private'}
                    </span>
                    <span className="text-[11px] text-[#7A6958] block">
                      {gameReady
                        ? 'Permitted to appear in trivia puzzles and scrapbook mini-games.'
                        : 'Default setting. Hidden from any future multi-user games or sharing.'}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameReady}
                    onChange={(e) => {
                      setGameReady(e.target.checked);
                      setHasChanges(true);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#D4C3AC] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#235478]"></div>
                </label>
              </div>

              {/* Museum Mystery Frame Option */}
              <div className="p-3 bg-[#FAF5EC] rounded-lg border border-[#E3D5C1] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#2D241E] block">
                      Museum Mystery Frame (Guess-The-Spot)
                    </span>
                    <span className="text-[11px] text-[#7A6958] block">
                      Hides place name on gallery plaque and shows "Where was this?" for visitors.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMysteryFrame}
                      onChange={(e) => {
                        setIsMysteryFrame(e.target.checked);
                        setHasChanges(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#D4C3AC] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B83A28]"></div>
                  </label>
                </div>

                {isMysteryFrame && (
                  <div className="pt-2 border-t border-[#E8DAC6] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7A6958] mb-1">
                        Curator's Hint (Optional)
                      </label>
                      <input
                        type="text"
                        value={mysteryHint}
                        onChange={(e) => {
                          setMysteryHint(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="e.g. Near ancient gas lanterns..."
                        className="w-full text-xs p-1.5 bg-white border border-[#D8C7B0] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#7A6958] mb-1">
                        Difficulty
                      </label>
                      <select
                        value={mysteryDifficulty}
                        onChange={(e) => {
                          setMysteryDifficulty(e.target.value as any);
                          setHasChanges(true);
                        }}
                        className="w-full text-xs p-1.5 bg-white border border-[#D8C7B0] rounded capitalize"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#EAE0D1] flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-[#7A6956] hover:bg-[#F2E8DC] rounded-md transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
