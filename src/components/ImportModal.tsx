import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  Palette,
  AlertTriangle,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { Photo } from '../types';
import { extractExifFromPhoto } from '../utils/exif';
import { extractDominantColorsFromImage } from '../utils/color';
import { reverseGeocode } from '../utils/geocoding';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosImported: (photos: Photo[]) => void;
}

interface ProcessStatus {
  fileName: string;
  stage: 'reading' | 'exif' | 'color' | 'geocoding' | 'ai' | 'done' | 'error';
  message: string;
  previewUrl?: string;
  hasGps?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onPhotosImported,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statuses, setStatuses] = useState<ProcessStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: imageFiles.length });

    const initialStatuses: ProcessStatus[] = imageFiles.map((file) => ({
      fileName: file.name,
      stage: 'reading',
      message: 'Awaiting postal processing...',
    }));
    setStatuses(initialStatuses);

    const importedPhotos: Photo[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setProgress({ current: i + 1, total: imageFiles.length });

      // Update status helper
      const updateStatus = (stage: ProcessStatus['stage'], message: string, extra?: Partial<ProcessStatus>) => {
        setStatuses((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], stage, message, ...extra };
          return next;
        });
      };

      try {
        updateStatus('reading', 'Developing photo print...');
        const base64Url = await fileToBase64(file);
        updateStatus('reading', 'Loaded photo image', { previewUrl: base64Url });

        // Step 1: EXIF parsing
        updateStatus('exif', 'Inspecting camera EXIF data...');
        const exifData = await extractExifFromPhoto(file);
        const dateTaken = exifData.dateTaken;
        const parsedDate = new Date(dateTaken);
        const year = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : new Date().getFullYear();
        const month = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() : new Date().getMonth();

        // Step 2: Canvas Color Palette
        updateStatus('color', 'Mixing pigment & color family...');
        const colorResult = await extractDominantColorsFromImage(base64Url);

        // Step 3: Geocoding
        let locationName = 'Unplaced Memory';
        let locationDetails = undefined;
        let isPlaced = false;

        if (exifData.latitude !== null && exifData.longitude !== null) {
          updateStatus('geocoding', 'Reverse geocoding postal coordinates...');
          const geo = await reverseGeocode(exifData.latitude, exifData.longitude);
          locationName = geo.locationName;
          locationDetails = {
            city: geo.city,
            state: geo.state,
            country: geo.country,
          };
          isPlaced = true;
        } else {
          locationName = 'Unplaced (Click map to position)';
          isPlaced = false;
        }

        // Step 4: AI Tagging via Gemini Vision
        updateStatus('ai', 'Consulting Gemini AI vision for tags & caption...', {
          hasGps: isPlaced,
        });

        let aiTags: string[] = ['photo', 'travel'];
        let aiTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        let aiNote = 'Captured along life’s beautiful path.';

        try {
          const res = await fetch('/api/gemini/tag-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Url,
              mimeType: file.type || 'image/jpeg',
              existingTitle: aiTitle,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.tags && Array.isArray(data.tags)) {
              aiTags = data.tags;
            }
            if (data.suggestedTitle) {
              aiTitle = data.suggestedTitle;
            }
            if (data.description) {
              aiNote = data.description;
            }
          }
        } catch (aiErr) {
          console.warn('AI tagging call failed, using heuristic defaults:', aiErr);
        }

        // Create Photo Object
        const newPhoto: Photo = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: base64Url,
          name: file.name,
          dateTaken,
          year,
          month,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          isPlaced,
          locationName,
          locationDetails,
          dominantColor: colorResult.dominantColor,
          colorFamily: colorResult.colorFamily,
          palette: colorResult.palette,
          tags: aiTags,
          title: aiTitle,
          note: aiNote,
          gameReady: false, // Starts private
          isOffLimits: false,
          albumIds: [],
          createdAt: Date.now(),
        };

        importedPhotos.push(newPhoto);
        updateStatus(
          'done',
          isPlaced ? 'Stamped and filed with GPS!' : 'Stamped (Unplaced on map)',
          { hasGps: isPlaced }
        );
      } catch (err) {
        console.error('Error importing file:', file.name, err);
        updateStatus('error', 'Could not process photo.');
      }
    }

    if (importedPhotos.length > 0) {
      onPhotosImported(importedPhotos);
    }

    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#231F20]/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-xl border border-[#D8C7B0] shadow-2xl overflow-hidden my-8">
        {/* Airmail header */}
        <div className="airmail-border" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#EADFCF]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-[#FAF2E6] border border-[#DFCBB5] rounded-lg">
                <FolderPlus className="w-6 h-6 text-[#B83A28]" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif-vintage text-[#2D241E]">
                  Import Travel Photos
                </h2>
                <p className="text-xs text-[#7D6B58]">
                  Extracts EXIF dates & GPS, detects dominant palette, and summons Gemini AI tags
                </p>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-[#8C7A6B] hover:text-[#2D241E] hover:bg-[#F2EAE0] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          {!isProcessing ? (
            <div className="mt-5 space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#B83A28] bg-[#FBF0EE]'
                    : 'border-[#DFCBB5] hover:border-[#B83A28]/60 bg-[#FAF7F0] hover:bg-[#F5EFE4]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <div className="mx-auto w-14 h-14 mb-3 rounded-full bg-[#F2E8DB] flex items-center justify-center border border-[#DECDB9]">
                  <UploadCloud className="w-7 h-7 text-[#B83A28]" />
                </div>
                <h3 className="font-semibold text-base text-[#2D241E]">
                  Drag and drop your photos here
                </h3>
                <p className="text-xs text-[#7A6B5C] mt-1">
                  or <span className="text-[#B83A28] underline font-medium">browse local files</span> from your camera roll
                </p>
                <div className="flex flex-wrap justify-center items-center gap-3 mt-4 text-[11px] text-[#8C7A6B]">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-[#235478]" /> EXIF Timestamps
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-[#B83A28]" /> GPS Geotagging
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Palette className="w-3.5 h-3.5 mr-1 text-[#C28B38]" /> Palette Sampling
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-[#8C4D32]" /> Gemini AI Vision
                  </span>
                </div>
              </div>

              <div className="bg-[#F8F3EA] border border-[#E5DAC8] rounded-lg p-3.5 text-xs text-[#6B5A4B] flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E8DCB8] flex items-center justify-center shrink-0 mt-0.5 text-[#5A452D] font-bold text-[10px]">
                  i
                </div>
                <div>
                  <span className="font-semibold text-[#2D241E]">Postal Privacy Guarantee:</span>{' '}
                  All photos stay right in your browser via IndexedDB. Photos start strictly private. Photos lacking GPS will be marked <span className="font-semibold text-[#B83A28]">unplaced</span> so you can click anywhere on the map to pin them!
                </div>
              </div>
            </div>
          ) : (
            /* Processing View */
            <div className="mt-5 space-y-4">
              <div className="bg-[#F9F5EE] border border-[#E5DAC8] p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 text-[#B83A28] animate-spin" />
                    <span className="text-sm font-semibold text-[#2D241E]">
                      Processing Photo {progress.current} of {progress.total}
                    </span>
                  </div>
                  <span className="text-xs font-handwriting text-base text-[#8C7A6B]">
                    {Math.round((progress.current / progress.total) * 100)}% filed
                  </span>
                </div>
                <div className="w-full bg-[#E5DAC8] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#B83A28] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Status List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {statuses.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#EBE1D2] bg-[#FFFDF8] text-xs"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="w-9 h-9 object-cover rounded border border-[#DECDB9]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-[#EDE3D4] flex items-center justify-center text-[10px] text-[#7A6B5C]">
                          IMG
                        </div>
                      )}
                      <div className="truncate">
                        <p className="font-medium text-[#2D241E] truncate max-w-[200px] sm:max-w-[280px]">
                          {item.fileName}
                        </p>
                        <p className="text-[11px] text-[#7A6B5C] flex items-center space-x-1">
                          {item.stage === 'done' ? (
                            <span className="text-emerald-700 flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" /> {item.message}
                            </span>
                          ) : item.stage === 'error' ? (
                            <span className="text-[#B83A28] flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1 inline" /> {item.message}
                            </span>
                          ) : (
                            <span className="flex items-center text-[#235478]">
                              <Loader2 className="w-3 h-3 mr-1 inline animate-spin" /> {item.message}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {item.hasGps === false && item.stage === 'done' && (
                        <span className="text-[10px] bg-[#FFF0E8] text-[#B83A28] border border-[#F0D5C5] px-1.5 py-0.5 rounded font-medium">
                          Unplaced
                        </span>
                      )}
                      {item.hasGps === true && item.stage === 'done' && (
                        <span className="text-[10px] bg-[#EAF5EC] text-emerald-800 border border-[#CDE5D2] px-1.5 py-0.5 rounded font-medium">
                          Geotagged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[#EADFCF] flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#6B5A4B] bg-[#EFE8DD] hover:bg-[#E5DAC8] rounded-md transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
