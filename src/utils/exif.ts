import exifr from 'exifr';

export interface ExifExtractionResult {
  latitude: number | null;
  longitude: number | null;
  dateTaken: string; // ISO string
  hasGps: boolean;
  makeModel?: string;
}

export async function extractExifFromPhoto(file: File | Blob): Promise<ExifExtractionResult> {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let dateTaken = new Date().toISOString();
  let hasGps = false;
  let makeModel: string | undefined = undefined;

  try {
    const output = await exifr.parse(file, {
      gps: true,
      pick: [
        'latitude',
        'longitude',
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'Make',
        'Model',
      ],
    });

    if (output) {
      if (typeof output.latitude === 'number' && typeof output.longitude === 'number') {
        latitude = output.latitude;
        longitude = output.longitude;
        hasGps = true;
      }

      const dateField = output.DateTimeOriginal || output.CreateDate || output.ModifyDate;
      if (dateField instanceof Date && !isNaN(dateField.getTime())) {
        dateTaken = dateField.toISOString();
      } else if (typeof dateField === 'string') {
        const parsed = new Date(dateField);
        if (!isNaN(parsed.getTime())) {
          dateTaken = parsed.toISOString();
        }
      }

      if (output.Make || output.Model) {
        makeModel = [output.Make, output.Model].filter(Boolean).join(' ');
      }
    }
  } catch (err) {
    console.warn('Exif extraction had no EXIF or warning:', err);
  }

  // If file has lastModified and no EXIF date was found
  if (file instanceof File && file.lastModified && dateTaken === new Date().toISOString()) {
    dateTaken = new Date(file.lastModified).toISOString();
  }

  return {
    latitude,
    longitude,
    dateTaken,
    hasGps,
    makeModel,
  };
}
