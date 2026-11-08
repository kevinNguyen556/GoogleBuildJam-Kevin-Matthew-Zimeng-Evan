import React, { useState } from 'react';
import { Plane, X, Calendar, MapPin, Sparkles } from 'lucide-react';
import { Album } from '../types';

interface StartTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTrip: (tripAlbum: Album) => void;
}

export const StartTripModal: React.FC<StartTripModalProps> = ({
  isOpen,
  onClose,
  onStartTrip,
}) => {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [colorDot, setColorDot] = useState('#B83A28');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTripAlbum: Album = {
      id: `trip-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `Chronicle of our expedition to ${destination || 'the unknown'}.`,
      photoIds: [],
      type: 'trip',
      isTrip: true,
      colorDot,
      startDate: new Date().toISOString(),
      createdAt: Date.now(),
    };

    onStartTrip(newTripAlbum);
    onClose();
  };

  const tripColors = ['#B83A28', '#235478', '#4A7C59', '#D97706', '#7C3AED', '#E11D48'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl p-6 relative">
        <div className="airmail-border -mt-6 -mx-6 mb-4" />

        <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0ED] border border-[#ECCDC5] flex items-center justify-center text-[#B83A28]">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                Start a New Trip
              </h3>
              <p className="text-[11px] text-[#7A6958]">
                Auto-records newly imported photos into this trip
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8C7A6B] hover:text-[#2D241E]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#5A4B3C] mb-1">
              Trip Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kyoto Autumn 2026, Coastal Highway Roadtrip"
              className="w-full p-2.5 bg-[#FAF5EB] border border-[#DECDB9] rounded-xl outline-hidden focus:border-[#B83A28] text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-[#5A4B3C] mb-1">
              Destination City / Region
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Japan, Amalfi Coast, Swiss Alps"
              className="w-full p-2 bg-[#FAF5EB] border border-[#DECDB9] rounded-lg outline-hidden focus:border-[#B83A28] text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-[#5A4B3C] mb-1">
              Trip Identifier Dot
            </label>
            <div className="flex items-center space-x-2 pt-1">
              {tripColors.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColorDot(hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    colorDot === hex ? 'scale-125 border-[#2D241E]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#5A4B3C] mb-1">
              Notes or Journal Goal
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A few words about this expedition..."
              className="w-full p-2 bg-[#FAF5EB] border border-[#DECDB9] rounded-lg outline-hidden resize-none focus:border-[#B83A28] text-xs"
            />
          </div>

          <div className="p-3 bg-[#FAF4EA] rounded-xl border border-[#E5DAC8] text-[11px] text-[#6A5A4B]">
            💡 <strong>How it works:</strong> As long as this trip is active, any photos you upload or import will automatically be filed under this album with your chosen colored dot.
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#EAE0D1]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#7A6958] hover:bg-[#EFE8DD] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded-xl shadow-xs"
            >
              Start Recording Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
