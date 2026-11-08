import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Trash2, MapPin, CheckCircle, Info } from 'lucide-react';
import { OffLimitsZone } from '../types';

interface OffLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: OffLimitsZone[];
  onAddZone: (zone: OffLimitsZone) => void;
  onDeleteZone: (zoneId: string) => void;
}

export const OffLimitsModal: React.FC<OffLimitsModalProps> = ({
  isOpen,
  onClose,
  zones,
  onAddZone,
  onDeleteZone,
}) => {
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(5));
          setLongitude(pos.coords.longitude.toFixed(5));
          if (!name) setName('My Current Location');
        },
        (err) => {
          alert('Could not access current location: ' + err.message);
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid numeric latitude and longitude.');
      return;
    }

    const newZone: OffLimitsZone = {
      id: `zone-${Date.now()}`,
      name: name.trim() || 'Restricted Zone',
      latitude: lat,
      longitude: lon,
      radiusMeters,
      createdAt: Date.now(),
    };

    onAddZone(newZone);
    setName('');
    setLatitude('');
    setLongitude('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#FFFDF9] rounded-2xl border-2 border-[#D8C7B0] shadow-2xl overflow-hidden my-6">
        <div className="airmail-border" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#EAE0D1]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-[#FAF0ED] border border-[#F0D0C8] rounded-lg">
                <ShieldAlert className="w-6 h-6 text-[#B83A28]" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif-vintage text-[#2D241E]">
                  Off-Limits Privacy Zones
                </h2>
                <p className="text-xs text-[#7A6958]">
                  Exclude sensitive coordinates (e.g. Home, Workplace) from games, tours, and future sharing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#8C7A6B] hover:text-[#2D241E] hover:bg-[#F2EAE0] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-[#FAF4EA] rounded-lg border border-[#E4D7C5] flex items-start space-x-2 text-xs text-[#6B5A4B]">
            <Info className="w-4 h-4 text-[#235478] shrink-0 mt-0.5" />
            <div>
              Any photo taken within an off-limits zone is automatically protected. Even if exported or shared in future modes, photos inside these boundaries will remain shielded.
            </div>
          </div>

          {/* Zones List */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold tracking-wider text-[#8A7865]">
                Configured Off-Limits Sanctuaries ({zones.length})
              </h3>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#B83A28] hover:text-[#942718] bg-[#F9F0EE] hover:bg-[#F4E3E0] px-2.5 py-1 rounded border border-[#EED4CE] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sanctuary</span>
                </button>
              )}
            </div>

            {zones.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-[#DFCBB5] rounded-xl bg-[#FAF7F0]">
                <p className="text-xs text-[#7A6958]">
                  No off-limits zones yet. Add your home, school, or office to protect your private locations.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#E5DAC8] bg-[#FAF6EE] hover:bg-white transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#FAF0ED] border border-[#EED2CB] flex items-center justify-center text-[#B83A28]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#2D241E]">{zone.name}</h4>
                        <p className="text-[11px] text-[#7A6958]">
                          {zone.latitude.toFixed(4)}°, {zone.longitude.toFixed(4)}° •{' '}
                          <span className="font-medium text-[#235478]">
                            {zone.radiusMeters >= 1000
                              ? `${(zone.radiusMeters / 1000).toFixed(1)} km radius`
                              : `${zone.radiusMeters} m radius`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteZone(zone.id)}
                      title="Remove zone"
                      className="p-1.5 text-[#9A8A7A] hover:text-[#B83A28] hover:bg-[#F2EAE0] rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Zone Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="mt-5 p-4 rounded-xl bg-[#FAF5EC] border border-[#DFCBB5] space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[#2D241E]">
                Add New Off-Limits Zone
              </h4>

              <div>
                <label className="block text-[11px] font-medium text-[#7A6958] mb-1">
                  Zone Label
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Home, Personal Office, Family Cabin"
                  className="w-full text-xs bg-white border border-[#D8C7B0] rounded-md px-3 py-1.5 outline-hidden focus:border-[#B83A28]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#7A6958] mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 37.7749"
                    className="w-full text-xs bg-white border border-[#D8C7B0] rounded-md px-3 py-1.5 outline-hidden focus:border-[#B83A28]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#7A6958] mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. -122.4194"
                    className="w-full text-xs bg-white border border-[#D8C7B0] rounded-md px-3 py-1.5 outline-hidden focus:border-[#B83A28]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-[#235478] hover:underline flex items-center"
                >
                  <MapPin className="w-3 h-3 mr-1" /> Use My Current Location
                </button>

                <div className="flex items-center space-x-1.5">
                  <label className="text-[11px] text-[#7A6958]">Radius:</label>
                  <select
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                    className="text-xs bg-white border border-[#D8C7B0] rounded-md px-2 py-1"
                  >
                    <option value={500}>500 meters</option>
                    <option value={1000}>1 kilometer</option>
                    <option value={2000}>2 kilometers</option>
                    <option value={5000}>5 kilometers</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E8DCC9]">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 text-xs text-[#7A6958] hover:bg-[#EFE8DD] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-semibold text-white bg-[#B83A28] hover:bg-[#A12F1F] rounded"
                >
                  Save Zone
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[#EADFCF] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-[#6B5A4B] bg-[#EFE8DD] hover:bg-[#E5DAC8] rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
