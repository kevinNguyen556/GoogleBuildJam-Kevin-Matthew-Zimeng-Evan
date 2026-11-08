import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sliders,
  Sparkles,
  MapPin,
  Ghost,
  Shield,
  LocateFixed,
  X,
  Compass,
  Calendar,
  Layers,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Photo, GhostPin, OffLimitsZone } from '../types';
import { reverseGeocode } from '../utils/geocoding';

interface MapViewProps {
  photos: Photo[];
  ghostPins: GhostPin[];
  offLimitsZones: OffLimitsZone[];
  onSelectPhoto: (photo: Photo) => void;
  onAddGhostPin: (pin: GhostPin) => void;
  onDeleteGhostPin: (pinId: string) => void;
  onUpdatePhotoLocation: (photoId: string, lat: number, lon: number, locationName: string) => void;
  unplacedPhotoToPlace: Photo | null;
  onCancelPlacement: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  photos,
  ghostPins,
  offLimitsZones,
  onSelectPhoto,
  onAddGhostPin,
  onDeleteGhostPin,
  onUpdatePhotoLocation,
  unplacedPhotoToPlace,
  onCancelPlacement,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const ghostMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);

  // Time slider state
  const placedPhotos = useMemo(() => {
    return photos.filter((p) => p.isPlaced && p.latitude !== null && p.longitude !== null);
  }, [photos]);

  const yearRange = useMemo(() => {
    if (placedPhotos.length === 0) return { min: 2020, max: 2026 };
    const yrs = placedPhotos.map((p) => p.year).filter(Boolean);
    const min = Math.min(...yrs, 2020);
    const max = Math.max(...yrs, 2026);
    return { min, max };
  }, [placedPhotos]);

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState<boolean>(false);
  const timelapseIntervalRef = useRef<any>(null);

  // Tour Mode State
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourIndex, setTourIndex] = useState<number>(0);
  const [isTourPaused, setIsTourPaused] = useState<boolean>(false);
  const tourTimerRef = useRef<any>(null);

  // Ghost Pin Creation Mode
  const [isAddingGhostPin, setIsAddingGhostPin] = useState<boolean>(false);
  const [showGhostPins, setShowGhostPins] = useState<boolean>(true);
  const [newGhostTitle, setNewGhostTitle] = useState('');
  const [newGhostNote, setNewGhostNote] = useState('');
  const [pendingGhostCoords, setPendingGhostCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Active memory card preview during Tour Mode
  const [activeTourPhoto, setActiveTourPhoto] = useState<Photo | null>(null);

  // Chronologically sorted photos for Tour
  const chronologicalPhotos = useMemo(() => {
    return [...placedPhotos].sort(
      (a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()
    );
  }, [placedPhotos]);

  // Photos visible based on Time Slider
  const visiblePhotos = useMemo(() => {
    return placedPhotos.filter((p) => p.year <= currentYear);
  }, [placedPhotos, currentYear]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center on Europe/Global or first photo
    const initialLat = placedPhotos[0]?.latitude || 40.0;
    const initialLng = placedPhotos[0]?.longitude || 15.0;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Warm, sepia-toned OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Wayfarer',
      maxZoom: 19,
    }).addTo(map);

    // Create Layer Groups
    const markersLayer = L.layerGroup().addTo(map);
    const ghostLayer = L.layerGroup().addTo(map);
    const zonesLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    ghostMarkersLayerRef.current = ghostLayer;
    zonesLayerRef.current = zonesLayer;
    mapInstanceRef.current = map;

    // Handle map clicks for placing unplaced photos or ghost pins
    map.on('click', async (e: L.LeafletMouseEvent) => {
      // Check if unplacedPhotoToPlace is active
      const pendingPhoto = (window as any).__wayfarer_pending_photo;
      if (pendingPhoto) {
        const { lat, lng } = e.latlng;
        const geo = await reverseGeocode(lat, lng);
        onUpdatePhotoLocation(pendingPhoto.id, lat, lng, geo.locationName);
        (window as any).__wayfarer_pending_photo = null;
        return;
      }

      // Check if adding ghost pin
      const isAddingGhost = (window as any).__wayfarer_adding_ghost;
      if (isAddingGhost) {
        setPendingGhostCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync window globals for click listeners
  useEffect(() => {
    (window as any).__wayfarer_pending_photo = unplacedPhotoToPlace;
  }, [unplacedPhotoToPlace]);

  useEffect(() => {
    (window as any).__wayfarer_adding_ghost = isAddingGhostPin;
  }, [isAddingGhostPin]);

  // Update Off-Limits Zones Overlay
  useEffect(() => {
    const zonesLayer = zonesLayerRef.current;
    if (!zonesLayer) return;
    zonesLayer.clearLayers();

    offLimitsZones.forEach((zone) => {
      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radiusMeters,
        color: '#B83A28',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#B83A28',
        fillOpacity: 0.12,
      });

      circle.bindTooltip(
        `<div class="text-xs font-semibold text-[#B83A28] flex items-center">
          <span class="mr-1">🛡️</span> ${zone.name} (Off-Limits Sanctuary)
        </div>`,
        { direction: 'top', className: 'postal-tooltip' }
      );

      zonesLayer.addLayer(circle);
    });
  }, [offLimitsZones]);

  // Update Memory Photo Pins (Clustered / Grouped)
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;
    markersLayer.clearLayers();

    // Group photos that share very close coordinates (within 0.05 lat/lon)
    const clusters: { lat: number; lon: number; photos: Photo[] }[] = [];

    visiblePhotos.forEach((photo) => {
      if (photo.latitude === null || photo.longitude === null) return;

      const existingCluster = clusters.find(
        (c) =>
          Math.abs(c.lat - photo.latitude!) < 0.04 &&
          Math.abs(c.lon - photo.longitude!) < 0.04
      );

      if (existingCluster) {
        existingCluster.photos.push(photo);
      } else {
        clusters.push({
          lat: photo.latitude,
          lon: photo.longitude,
          photos: [photo],
        });
      }
    });

    // Render Pin Markers
    clusters.forEach((cluster) => {
      const topPhoto = cluster.photos[0];
      const count = cluster.photos.length;

      // Custom Postal Stamp / Polaroid HTML Marker
      const markerHtml = `
        <div class="wayfarer-marker-pin cursor-pointer relative group" style="width: 44px; height: 52px;">
          <div class="polaroid-frame relative p-1 pb-3 rounded shadow-md bg-[#FFFDF9] border border-[#DFCBB5] text-center" style="transform: rotate(${
            ((topPhoto.year % 5) - 2) * 3
          }deg);">
            <div class="w-full h-8 overflow-hidden rounded-xs bg-[#EAE0D3]">
              <img src="${topPhoto.url}" alt="${topPhoto.title}" class="w-full h-full object-cover" />
            </div>
            ${
              count > 1
                ? `<div class="absolute -top-1.5 -right-1.5 bg-[#B83A28] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs">
                    ${count}
                  </div>`
                : ''
            }
            <div class="mt-0.5 text-[8px] font-mono text-[#5A4B3C] font-semibold truncate leading-none">
              ${topPhoto.year}
            </div>
          </div>
          <div class="w-2 h-2 bg-[#B83A28] rounded-full mx-auto -mt-1 shadow-xs border border-white"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-wayfarer-pin',
        html: markerHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 50],
      });

      const marker = L.marker([cluster.lat, cluster.lon], { icon: customIcon });

      marker.on('click', () => {
        onSelectPhoto(topPhoto);
      });

      // Tooltip preview
      const tooltipContent = `
        <div class="p-1 max-w-[200px]">
          <p class="font-serif-vintage font-bold text-xs text-[#2D241E]">${topPhoto.title}</p>
          <p class="text-[10px] text-[#7A6958] italic">${topPhoto.locationName}</p>
          <p class="text-[10px] font-mono text-[#B83A28] mt-0.5">${cluster.photos.length} memories</p>
        </div>
      `;
      marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -45] });

      markersLayer.addLayer(marker);
    });
  }, [visiblePhotos, onSelectPhoto]);

  // Update Ghost Pins
  useEffect(() => {
    const ghostLayer = ghostMarkersLayerRef.current;
    if (!ghostLayer) return;
    ghostLayer.clearLayers();

    if (!showGhostPins) return;

    ghostPins.forEach((pin) => {
      const ghostHtml = `
        <div class="wayfarer-marker-pin cursor-pointer relative opacity-85 hover:opacity-100 transition-opacity" style="width: 38px; height: 46px;">
          <div class="p-1 rounded-lg border-2 border-dashed border-[#235478] bg-[#F0F5F9]/90 backdrop-blur-xs text-center shadow-sm">
            <div class="w-full h-6 flex items-center justify-center text-[#235478]">
              <span class="text-xs">✨</span>
            </div>
            <div class="text-[7.5px] uppercase font-bold text-[#235478] truncate leading-none mt-0.5">
              WISH
            </div>
          </div>
          <div class="w-1.5 h-1.5 bg-[#235478] rounded-full mx-auto mt-0.5 border border-white"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-ghost-pin',
        html: ghostHtml,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      });

      const marker = L.marker([pin.latitude, pin.longitude], { icon });

      marker.bindPopup(`
        <div class="p-2 max-w-[220px]">
          <div class="flex items-center space-x-1 text-[#235478] font-bold text-[11px] mb-1">
            <span>✨ Wish Destination</span>
          </div>
          <h4 class="font-serif-vintage font-bold text-sm text-[#2D241E]">${pin.title}</h4>
          <p class="text-[11px] text-[#6A5A4B] mt-1">${pin.note}</p>
          <p class="text-[10px] text-[#8C7A6B] font-mono mt-1">${pin.locationName} • ${pin.wishDate || 'Future'}</p>
        </div>
      `);

      ghostLayer.addLayer(marker);
    });
  }, [ghostPins, showGhostPins]);

  // Timelapse Player Effect
  useEffect(() => {
    if (isPlayingTimelapse) {
      timelapseIntervalRef.current = setInterval(() => {
        setCurrentYear((prev) => {
          if (prev >= yearRange.max) {
            return yearRange.min;
          }
          return prev + 1;
        });
      }, 1400);
    } else {
      if (timelapseIntervalRef.current) {
        clearInterval(timelapseIntervalRef.current);
      }
    }
    return () => {
      if (timelapseIntervalRef.current) clearInterval(timelapseIntervalRef.current);
    };
  }, [isPlayingTimelapse, yearRange]);

  // Tour Mode Controller
  useEffect(() => {
    if (!isTourActive || chronologicalPhotos.length === 0 || isTourPaused) {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
      return;
    }

    const currentTourPhoto = chronologicalPhotos[tourIndex];
    if (!currentTourPhoto || currentTourPhoto.latitude === null || currentTourPhoto.longitude === null) {
      return;
    }

    setActiveTourPhoto(currentTourPhoto);

    // Fly camera smoothly to the memory pin
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [currentTourPhoto.latitude, currentTourPhoto.longitude],
        9,
        { duration: 2.2 }
      );
    }

    // Advance to next stop after 5.5 seconds
    tourTimerRef.current = setTimeout(() => {
      setTourIndex((prev) => {
        if (prev + 1 >= chronologicalPhotos.length) {
          setIsTourActive(false);
          setActiveTourPhoto(null);
          return 0;
        }
        return prev + 1;
      });
    }, 5500);

    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    };
  }, [isTourActive, tourIndex, isTourPaused, chronologicalPhotos]);

  const handleStartTour = () => {
    if (chronologicalPhotos.length === 0) {
      return;
    }
    setTourIndex(0);
    setIsTourActive(true);
    setIsTourPaused(false);
  };

  const handleStopTour = () => {
    setIsTourActive(false);
    setActiveTourPhoto(null);
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
  };

  const handleGhostPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGhostCoords) return;

    const geo = await reverseGeocode(pendingGhostCoords.lat, pendingGhostCoords.lng);

    const newGhost: GhostPin = {
      id: `ghost-${Date.now()}`,
      latitude: pendingGhostCoords.lat,
      longitude: pendingGhostCoords.lng,
      locationName: geo.locationName || 'Dream Destination',
      title: newGhostTitle.trim() || 'Places I Wish I’d Been',
      note: newGhostNote.trim() || 'A dream journey waiting for future footprints.',
      wishDate: 'Future Expedition',
      createdAt: Date.now(),
    };

    onAddGhostPin(newGhost);
    setIsAddingGhostPin(false);
    setPendingGhostCoords(null);
    setNewGhostTitle('');
    setNewGhostNote('');
  };

  return (
    <div className="relative w-full h-[calc(100vh-125px)] min-h-[500px] overflow-hidden bg-[#ECE5DC]">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Unplaced Photo Placement Banner (If user selected a photo to place) */}
      {unplacedPhotoToPlace && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#FFFDF9] border-2 border-[#B83A28] rounded-xl shadow-2xl p-3 sm:p-4 max-w-md w-[92%] flex items-center justify-between animate-bounce-short">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={unplacedPhotoToPlace.url}
              alt={unplacedPhotoToPlace.title}
              className="w-12 h-12 object-cover rounded-md border border-[#D8C7B0]"
            />
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B83A28] block">
                Click Map to Place Memory
              </span>
              <h4 className="text-xs font-bold text-[#2D241E] truncate font-serif-vintage">
                {unplacedPhotoToPlace.title}
              </h4>
              <p className="text-[10px] text-[#7A6958]">Click any city or land on the map</p>
            </div>
          </div>
          <button
            onClick={onCancelPlacement}
            className="p-1 text-[#8C7A6B] hover:text-[#2D241E] rounded-md hover:bg-[#F2EAE0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Ghost Pin Mode Active Banner */}
      {isAddingGhostPin && !pendingGhostCoords && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#F0F5F9] border-2 border-[#235478] rounded-xl shadow-2xl p-3 sm:p-4 max-w-md w-[92%] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Ghost className="w-5 h-5 text-[#235478] animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-[#235478]">
                Add "Places I Wish I'd Been"
              </h4>
              <p className="text-[11px] text-[#4A6478]">Click anywhere on the world map to drop a wish marker</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingGhostPin(false)}
            className="p-1 text-[#4A6478] hover:text-[#235478]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Left Floating Controls: Tour & Ghost Pins */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {/* Tour Mode Button */}
        {!isTourActive ? (
          <button
            onClick={handleStartTour}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#FFFDF9]/95 backdrop-blur-xs border border-[#DECDB9] shadow-md hover:bg-white text-[#2D241E] text-xs font-semibold hover:border-[#B83A28] transition-all"
          >
            <Play className="w-3.5 h-3.5 text-[#B83A28] fill-current" />
            <span>Tour Mode</span>
            <span className="text-[10px] text-[#8C7A6B] bg-[#EFE8DD] px-1.5 py-0.2 rounded-full">
              {chronologicalPhotos.length}
            </span>
          </button>
        ) : (
          <div className="flex items-center space-x-1 bg-[#FFFDF9] border-2 border-[#B83A28] rounded-xl shadow-lg p-1.5">
            <button
              onClick={() => setIsTourPaused(!isTourPaused)}
              className="p-1.5 text-[#B83A28] hover:bg-[#FAF0ED] rounded-lg transition-colors"
              title={isTourPaused ? 'Resume tour' : 'Pause tour'}
            >
              {isTourPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() =>
                setTourIndex((prev) => (prev + 1 < chronologicalPhotos.length ? prev + 1 : 0))
              }
              className="p-1.5 text-[#5A4B3C] hover:bg-[#F2EAE0] rounded-lg"
              title="Next stop"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 font-bold text-[#B83A28]">
              {tourIndex + 1}/{chronologicalPhotos.length}
            </span>
            <button
              onClick={handleStopTour}
              className="p-1 text-[#8C7A6B] hover:text-[#2D241E] rounded-md hover:bg-[#F2EAE0]"
              title="Stop tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ghost Pins Toggle & Add */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowGhostPins(!showGhostPins)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-xs transition-colors backdrop-blur-xs ${
              showGhostPins
                ? 'bg-[#F2F7FA]/95 text-[#235478] border-[#BDD5E7]'
                : 'bg-[#FFFDF9]/90 text-[#8C7A6B] border-[#DECDB9]'
            }`}
          >
            {showGhostPins ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Wish Pins ({ghostPins.length})</span>
          </button>

          {!isAddingGhostPin && (
            <button
              onClick={() => setIsAddingGhostPin(true)}
              className="p-1.5 bg-[#FFFDF9]/95 text-[#235478] hover:bg-[#EAF2F7] rounded-xl border border-[#DECDB9] shadow-xs text-xs font-semibold"
              title="Add a place you wish you'd been"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tour Mode Floating Memory Card Preview */}
      {isTourActive && activeTourPhoto && (
        <div className="absolute top-18 left-4 z-20 w-80 max-w-[90vw] animate-fade-in">
          <div
            onClick={() => onSelectPhoto(activeTourPhoto)}
            className="polaroid-frame bg-[#FFFDF9] cursor-pointer shadow-2xl border border-[#DFCBB5] transform rotate-1"
          >
            <div className="relative aspect-16/10 rounded overflow-hidden bg-[#EAE0D3]">
              <img
                src={activeTourPhoto.url}
                alt={activeTourPhoto.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 postmark-circle w-10 h-10 border border-[#B83A28]/50 text-[7px] text-[#B83A28] font-mono flex items-center justify-center">
                <span>{activeTourPhoto.year}</span>
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-[10px] font-mono text-[#B83A28] font-semibold">
                Stop #{tourIndex + 1} • {new Date(activeTourPhoto.dateTaken).toLocaleDateString()}
              </span>
              <h4 className="font-serif-vintage text-sm font-bold text-[#2D241E] leading-snug">
                {activeTourPhoto.title}
              </h4>
              <p className="font-handwriting text-xs text-[#554637] line-clamp-2 mt-0.5">
                "{activeTourPhoto.note}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ghost Pin Modal (When coordinates clicked on map) */}
      {pendingGhostCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border-2 border-[#235478] shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0D1]">
              <div className="flex items-center space-x-2">
                <Ghost className="w-5 h-5 text-[#235478]" />
                <h3 className="text-base font-bold font-serif-vintage text-[#2D241E]">
                  Wish Destination
                </h3>
              </div>
              <button
                onClick={() => setPendingGhostCoords(null)}
                className="text-[#8C7A6B] hover:text-[#2D241E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGhostPinSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#5A4B3C] mb-1">
                  Place You Wish You’d Been
                </label>
                <input
                  type="text"
                  required
                  value={newGhostTitle}
                  onChange={(e) => setNewGhostTitle(e.target.value)}
                  placeholder="e.g. Hiking Patagonia, Seeing the Taj Mahal"
                  className="w-full text-xs bg-[#FAF5EB] border border-[#DECDB9] rounded-lg px-3 py-2 outline-hidden focus:border-[#235478]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A4B3C] mb-1">
                  Dream Note or Wishlist Reason
                </label>
                <textarea
                  rows={3}
                  value={newGhostNote}
                  onChange={(e) => setNewGhostNote(e.target.value)}
                  placeholder="What calls you to this corner of the Earth?"
                  className="w-full text-xs bg-[#FAF5EB] border border-[#DECDB9] rounded-lg p-3 outline-hidden resize-none focus:border-[#235478]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#EAE0D1]">
                <button
                  type="button"
                  onClick={() => setPendingGhostCoords(null)}
                  className="px-3 py-1.5 text-xs text-[#7A6958] hover:bg-[#EFE8DD] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#235478] hover:bg-[#1A4260] rounded shadow-xs"
                >
                  Plant Wish Pin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Floating Time Slider Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-xl bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border-2 border-[#D8C7B0] shadow-xl p-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlayingTimelapse(!isPlayingTimelapse)}
              className="p-1 rounded-full bg-[#FAF0ED] border border-[#EED0C8] text-[#B83A28] hover:bg-[#F6E1DC] transition-colors"
              title={isPlayingTimelapse ? 'Pause timelapse' : 'Play time travel animation'}
            >
              {isPlayingTimelapse ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
            <span className="text-xs uppercase font-bold tracking-wider text-[#5A4B3C]">
              Time Traveler Slider
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#7A6958]">Showing up to:</span>
            <span className="font-serif-vintage text-base font-bold text-[#B83A28] bg-[#FAF2EF] px-2 py-0.5 rounded border border-[#ECCDC5]">
              {currentYear}
            </span>
          </div>
        </div>

        {/* Range slider */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={yearRange.min}
            max={yearRange.max}
            step={1}
            value={currentYear}
            onChange={(e) => {
              setCurrentYear(parseInt(e.target.value, 10));
              setIsPlayingTimelapse(false);
            }}
            className="w-full accent-[#B83A28] h-2 bg-[#EADDCB] rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-[#8C7A6B] mt-1">
          <span>{yearRange.min}</span>
          <span className="italic font-sans text-[#7A6958]">
            {visiblePhotos.length} memory pin{visiblePhotos.length === 1 ? '' : 's'} on map
          </span>
          <span>{yearRange.max}</span>
        </div>
      </div>
    </div>
  );
};
