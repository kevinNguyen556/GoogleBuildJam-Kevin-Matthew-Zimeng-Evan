import { ColorFamily } from '../types';

export interface ColorAnalysisResult {
  dominantColor: string; // hex
  colorFamily: ColorFamily;
  palette: string[]; // 4 hex colors
}

// Convert RGB to HEX
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

// Classify HSL into intuitive postal/scrapbook color family
export function classifyColorFamily(r: number, g: number, b: number): ColorFamily {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Very low saturation or very bright/dark -> monochrome
  if (s < 0.14 || l > 0.92 || l < 0.1) {
    return 'monochrome';
  }

  // Earthy tones: low-mid saturation warm hues with mid-low lightness
  if (s < 0.38 && ((h >= 15 && h <= 50) || (h >= 0 && h < 15))) {
    return 'earthy';
  }

  if (h >= 345 || h < 18) {
    return s > 0.45 && l > 0.6 ? 'rose' : 'warm';
  } else if (h >= 18 && h < 45) {
    return 'warm';
  } else if (h >= 45 && h < 70) {
    return 'golden';
  } else if (h >= 70 && h < 165) {
    return 'green';
  } else if (h >= 165 && h < 260) {
    return 'blue';
  } else if (h >= 260 && h < 310) {
    return 'purple';
  } else {
    return 'rose';
  }
}

export async function extractDominantColorsFromImage(
  imageSource: string | HTMLImageElement
): Promise<ColorAnalysisResult> {
  return new Promise((resolve) => {
    const img = imageSource instanceof HTMLImageElement ? imageSource : new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({
          dominantColor: '#B83A28',
          colorFamily: 'warm',
          palette: ['#B83A28', '#D6C7B2', '#235478', '#F5EFEB'],
        });
      }

      // Sample a scaled down 32x32 representation
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 128) continue;

        // Quantize colors to reduce noise
        const qr = Math.floor(r / 32) * 32;
        const qg = Math.floor(g / 32) * 32;
        const qb = Math.floor(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;

        if (!buckets[key]) {
          buckets[key] = { r, g, b, count: 0 };
        }
        buckets[key].count++;
      }

      const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);

      if (sorted.length === 0) {
        return resolve({
          dominantColor: '#8C7A6B',
          colorFamily: 'earthy',
          palette: ['#8C7A6B', '#D6C7B2', '#F7F3EB', '#2D241E'],
        });
      }

      const top = sorted[0];
      const dominantHex = rgbToHex(top.r, top.g, top.b);
      const colorFamily = classifyColorFamily(top.r, top.g, top.b);

      const palette = sorted.slice(0, 4).map((item) => rgbToHex(item.r, item.g, item.b));

      resolve({
        dominantColor: dominantHex,
        colorFamily,
        palette,
      });
    };

    img.onerror = () => {
      resolve({
        dominantColor: '#B83A28',
        colorFamily: 'warm',
        palette: ['#B83A28', '#235478', '#D6C7B2', '#E8D8C3'],
      });
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    }
  });
}
