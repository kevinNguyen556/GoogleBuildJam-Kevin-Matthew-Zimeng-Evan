import React, { useState } from 'react';
import {
  Building2,
  Gamepad2,
  Send,
  Sparkles,
  Stamp,
  Award,
  Globe2,
  Mail,
  Heart,
  HelpCircle,
  CheckCircle,
  Puzzle,
  Compass,
} from 'lucide-react';
import { Photo, Friend } from '../types';
import { SAMPLE_FRIENDS } from '../utils/sampleData';
import confetti from 'canvas-confetti';

interface TabPlaceholderProps {
  photos: Photo[];
  onSelectPhoto?: (photo: Photo) => void;
}

// 1. Museum Tab
export const MuseumView: React.FC<TabPlaceholderProps> = ({ photos }) => {
  const [selectedExhibition, setSelectedExhibition] = useState<'stamps' | 'postcards' | 'artifacts'>('stamps');

  const stampExhibits = [
    { title: 'Trans-Atlantic Airmail 1938', color: '#B83A28', denomination: '25¢', origin: 'USA / France' },
    { title: 'Imperial Kyoto Crane', color: '#235478', denomination: '50¥', origin: 'Japan' },
    { title: 'Aegean Blue Maritime', color: '#2B6F96', denomination: '15₯', origin: 'Greece' },
    { title: 'Alpine Matterhorn First Ascent', color: '#536878', denomination: '1.20 Fr', origin: 'Switzerland' },
    { title: 'Amazonian Orchid Specimen', color: '#4A7C59', denomination: '80 R$', origin: 'Peru' },
    { title: 'Vespa Riviera Special', color: '#C28B38', denomination: '100 L', origin: 'Italy' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Postal Museum Header */}
      <div className="paper-sheet p-6 sm:p-8 rounded-2xl border border-[#DECDB9] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B83A28] font-bold">
                The Wayfarer Museum & Curio
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-vintage text-[#2D241E]">
                Postal Archives & Curated Exhibits
              </h2>
            </div>
          </div>

          <div className="flex space-x-2 bg-[#F1E8DC] p-1 rounded-xl">
            {(['stamps', 'postcards', 'artifacts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedExhibition(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedExhibition === tab
                    ? 'bg-[#2D241E] text-white shadow-xs'
                    : 'text-[#6A5A4B] hover:text-[#2D241E]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exhibition Grid */}
      {selectedExhibition === 'stamps' && (
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-bold text-[#6B5A4B] flex items-center">
            <Stamp className="w-4 h-4 mr-1.5 text-[#B83A28]" />
            Postage Stamp Vitrine
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {stampExhibits.map((stamp, idx) => (
              <div
                key={idx}
                className="stamp-edge p-3 bg-[#FFFDF9] rounded-sm text-center transform hover:-translate-y-1 hover:rotate-1 transition-all duration-200 cursor-pointer"
              >
                <div
                  className="w-full h-24 rounded border border-dashed flex flex-col items-center justify-between p-2"
                  style={{ borderColor: stamp.color, backgroundColor: `${stamp.color}15` }}
                >
                  <span className="text-[10px] font-mono font-bold" style={{ color: stamp.color }}>
                    {stamp.origin}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-xs" style={{ color: stamp.color }}>
                    ✦
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: stamp.color }}>
                    {stamp.denomination}
                  </span>
                </div>
                <h4 className="text-[11px] font-semibold text-[#2D241E] mt-2 truncate">
                  {stamp.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedExhibition === 'postcards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {photos.slice(0, 3).map((p) => (
            <div key={p.id} className="polaroid-frame p-4 bg-[#FCFAF6] border border-[#DECDB9]">
              <div className="border-b border-dashed border-[#D8C7B0] pb-3 mb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#B83A28] uppercase font-bold">AIR MAIL</span>
                  <h4 className="font-serif-vintage font-bold text-sm text-[#2D241E]">{p.locationName}</h4>
                </div>
                <div className="w-9 h-11 border border-dashed border-[#B83A28] bg-[#FAF0ED] text-[9px] font-mono flex items-center justify-center text-[#B83A28]">
                  STAMP
                </div>
              </div>
              <p className="font-handwriting text-sm text-[#554637] leading-relaxed">
                "{p.note || 'Treasured memories inscribed in traveler ink.'}"
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedExhibition === 'artifacts' && (
        <div className="p-8 text-center bg-[#FAF6EE] rounded-2xl border-2 border-dashed border-[#DECDB9]">
          <Globe2 className="w-10 h-10 text-[#235478] mx-auto mb-2" />
          <h4 className="font-serif-vintage font-bold text-base text-[#2D241E]">Curio Vitrine: Field Antiques</h4>
          <p className="text-xs text-[#7A6958] mt-1 max-w-md mx-auto">
            Vintage compasses, pocket leather journals, and antique transit tokens will be showcased here in upcoming expeditions.
          </p>
        </div>
      )}
    </div>
  );
};

// 2. Play Tab
export const PlayView: React.FC<TabPlaceholderProps> = ({ photos }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);

  const gamePhotos = photos.filter((p) => p.isPlaced);
  const currentPhoto = gamePhotos[currentQuestion % (gamePhotos.length || 1)];

  // Create 3 plausible multiple choice city options
  const options = React.useMemo(() => {
    if (!currentPhoto) return [];
    const correct = currentPhoto.locationDetails?.city || currentPhoto.locationName.split(',')[0].trim();
    const candidates = ['Paris', 'Kyoto', 'Boston', 'Amalfi', 'Santorini', 'Zermatt', 'Reykjavik', 'Lisbon'];
    const filtered = candidates.filter((c) => c !== correct).slice(0, 3);
    return [correct, ...filtered].sort();
  }, [currentPhoto]);

  const handleGuess = (city: string) => {
    setSelectedOption(city);
    const correct = currentPhoto.locationDetails?.city || currentPhoto.locationName.split(',')[0].trim();
    if (city === correct) {
      setScore((s) => s + 100);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    }
    setSolved(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setSolved(false);
    setCurrentQuestion((prev) => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="paper-sheet p-6 rounded-2xl border border-[#DECDB9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B83A28] font-bold">
                Mini Game: Where Was This Postcard Sent From?
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
                Wayfarer Geographic Trivia
              </h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#7A6958]">Score:</span>
            <span className="font-serif-vintage text-xl font-bold text-[#B83A28] ml-1.5">{score} pts</span>
          </div>
        </div>
      </div>

      {currentPhoto && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#FCFAF6] p-6 rounded-2xl border border-[#DFCBB5] shadow-xs">
          <div className="md:col-span-6 flex justify-center">
            <div className="polaroid-frame max-w-xs transform -rotate-1">
              <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                <img
                  src={currentPhoto.url}
                  alt="Guess this place"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 text-center">
                <p className="font-handwriting text-lg text-[#3A2E24]">
                  Clue: "{currentPhoto.tags?.slice(0, 3).map((t) => `#${t}`).join(' ')}"
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 flex flex-col justify-center space-y-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#235478] font-semibold">
                Mystery Destination #{currentQuestion + 1}
              </span>
              <h3 className="text-lg font-bold font-serif-vintage text-[#2D241E] mt-0.5">
                Can you recognize where this moment took place?
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {options.map((option) => {
                const correct = currentPhoto.locationDetails?.city || currentPhoto.locationName.split(',')[0].trim();
                const isSelected = selectedOption === option;
                const isCorrect = option === correct;

                let btnStyle = 'bg-white border-[#D8C7B0] text-[#3D3228] hover:bg-[#F8F2E8]';
                if (solved) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-700 text-white border-emerald-700 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-[#B83A28] text-white border-[#B83A28]';
                  }
                }

                return (
                  <button
                    key={option}
                    disabled={solved}
                    onClick={() => handleGuess(option)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all shadow-xs ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {solved && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[#5A4B3C]">
                  {selectedOption === (currentPhoto.locationDetails?.city || currentPhoto.locationName.split(',')[0].trim()) ? (
                    <span className="text-emerald-700 font-bold">✨ Brilliant memory!</span>
                  ) : (
                    <span>
                      Answer: <strong>{currentPhoto.locationName}</strong>
                    </span>
                  )}
                </span>
                <button
                  onClick={nextQuestion}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg shadow-xs"
                >
                  Next Postcard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Send Tab
export const SendView: React.FC<TabPlaceholderProps> = ({ photos }) => {
  const [selectedFriend, setSelectedFriend] = useState<Friend>(SAMPLE_FRIENDS[0]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo>(photos[0]);
  const [message, setMessage] = useState(
    'Wishing you could feel the sea breeze from here! Sending warm thoughts across the miles.'
  );
  const [isSent, setIsSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="paper-sheet p-6 rounded-2xl border border-[#DECDB9]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#B83A28] font-bold">
              Airmail Postcard Studio
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
              Dispatch a Handwritten Postcard
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFDF9] border-2 border-[#D8C7B0] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="airmail-border -mt-6 sm:-mt-8 -mx-6 sm:-mx-8 mb-6" />

        {isSent ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h3 className="font-serif-vintage text-2xl font-bold text-[#2D241E]">
              Postcard Stamped & Dispatched!
            </h3>
            <p className="text-xs text-[#7A6958] max-w-sm mx-auto">
              Your keepsake airmail has been addressed to {selectedFriend.name} ({selectedFriend.postalCode}) and stamped with {selectedFriend.stampDesign}.
            </p>
            <button
              onClick={() => setIsSent(false)}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg"
            >
              Compose Another Postcard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left side: Polaroid picture selection */}
            <div className="md:col-span-5 flex flex-col items-center space-y-3">
              <div className="polaroid-frame max-w-xs transform -rotate-1">
                <div className="aspect-4/5 overflow-hidden rounded bg-[#EAE0D3]">
                  {selectedPhoto && (
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="font-handwriting text-lg text-[#3A2E24]">
                    {selectedPhoto?.title}
                  </p>
                </div>
              </div>

              {/* Choose photo thumbnail strip */}
              <div className="flex space-x-2 overflow-x-auto max-w-full pb-1">
                {photos.slice(0, 5).map((p) => (
                  <img
                    key={p.id}
                    src={p.url}
                    alt={p.title}
                    onClick={() => setSelectedPhoto(p)}
                    className={`w-10 h-10 object-cover rounded cursor-pointer border-2 transition-all ${
                      selectedPhoto?.id === p.id ? 'border-[#B83A28] scale-105' : 'border-[#DECDB9] opacity-70'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right side: Airmail card fields */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              {/* Stamp & Recipient Header */}
              <div className="flex items-start justify-between border-b border-dashed border-[#D8C7B0] pb-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6958] mb-1">
                    Send to Friend
                  </label>
                  <div className="flex items-center space-x-2">
                    {SAMPLE_FRIENDS.map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setSelectedFriend(f)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                          selectedFriend.id === f.id
                            ? 'bg-[#2D241E] text-white border-[#2D241E]'
                            : 'bg-[#FAF5EB] text-[#554637] border-[#DECDB9]'
                        }`}
                      >
                        <img src={f.avatar} alt={f.name} className="w-4 h-4 rounded-full object-cover" />
                        <span>{f.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Postage Stamp Box */}
                <div className="w-14 h-16 border-2 border-dashed border-[#B83A28]/70 bg-[#FAF0ED] rounded flex flex-col items-center justify-center p-1 text-center shrink-0">
                  <span className="text-[7.5px] font-mono text-[#B83A28] uppercase leading-tight font-bold">
                    AIRMAIL
                  </span>
                  <Stamp className="w-4 h-4 text-[#B83A28] my-0.5" />
                  <span className="text-[8px] font-mono text-[#B83A28] font-bold">2026</span>
                </div>
              </div>

              {/* Message body */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6958] mb-1">
                  Handwritten Note
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full font-handwriting text-base text-[#3A2E24] bg-[#FAF5EB] border border-[#DECDB9] rounded-xl p-3 outline-hidden focus:border-[#B83A28] resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#8C7A6B] italic font-serif-vintage">
                  Delivering to: {selectedFriend.postalCode}
                </span>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-lg shadow-sm flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Airmail</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// 4. Treasure Tab
export const TreasureView: React.FC<TabPlaceholderProps> = ({ photos }) => {
  const continents = ['Europe', 'North America', 'Asia'];
  const badges = [
    { name: 'Compass Novice', desc: 'Added your first 5 memory pins', icon: '🧭', unlocked: photos.length >= 5 },
    { name: 'Alpine Pilgrim', desc: 'Photographed mountain peaks & ridges', icon: '🏔️', unlocked: photos.some(p => p.tags.includes('mountains') || p.tags.includes('alps')) },
    { name: 'Maritime Voyager', desc: 'Visited ocean shores and island beaches', icon: '⛵', unlocked: photos.some(p => p.tags.includes('ocean') || p.tags.includes('beach')) },
    { name: 'Gastronomy Chronicler', desc: 'Documented local cafes and culinary arts', icon: '🥐', unlocked: photos.some(p => p.tags.includes('food') || p.tags.includes('coffee')) },
    { name: 'Golden Hour Seeker', desc: 'Captured sunset or temple warmth', icon: '🌅', unlocked: photos.some(p => p.colorFamily === 'warm' || p.colorFamily === 'golden') },
    { name: 'Cartographer Supreme', desc: 'Accumulated 10+ memory coordinates', icon: '🗺️', unlocked: photos.filter(p => p.isPlaced).length >= 10 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="paper-sheet p-6 rounded-2xl border border-[#DECDB9]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#B83A28] font-bold">
              Wayfarer Passport & Badges
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-[#2D241E]">
              Traveler Achievements & Keepsake Seals
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((b, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border transition-all ${
              b.unlocked
                ? 'bg-[#FFFDF9] border-[#D8C7B0] shadow-sm'
                : 'bg-[#F4ECE1]/50 border-dashed border-[#DECDB9] opacity-60'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-3xl p-1 bg-[#FAF2E6] rounded-lg border border-[#EADFCF]">
                {b.icon}
              </span>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-serif-vintage font-bold text-sm text-[#2D241E]">
                    {b.name}
                  </h4>
                  {b.unlocked && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      SEALED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7A6958] mt-1">{b.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
