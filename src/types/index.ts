export type ColorFamily =
  | 'warm'
  | 'blue'
  | 'green'
  | 'golden'
  | 'earthy'
  | 'rose'
  | 'monochrome'
  | 'purple';

export interface MuseumSpeechNote {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: number;
}

export interface Photo {
  id: string;
  url: string; // Base64 dataURL or sample image URL
  name: string;
  dateTaken: string; // ISO string
  year: number;
  month: number; // 0-11
  latitude: number | null;
  longitude: number | null;
  isPlaced: boolean;
  locationName: string;
  locationDetails?: {
    city?: string;
    state?: string;
    country?: string;
  };
  dominantColor: string; // Hex code
  colorFamily: ColorFamily;
  palette: string[];
  tags: string[];
  title: string;
  note: string;
  songUrl?: string; // YouTube or Spotify URL
  gameReady: boolean; // Starts private (false)
  isOffLimits?: boolean;
  albumIds?: string[];
  createdAt: number;
  // Custom Museum Description
  customMuseumDescription?: string;
  // Friends Speech Bubble Notes in Museum
  speechBubbleNotes?: MuseumSpeechNote[];
  // Mystery Frame attributes
  isMysteryFrame?: boolean;
  mysteryHint?: string;
  mysteryDifficulty?: 'easy' | 'medium' | 'hard';
  solvedByFriends?: string[]; // friend IDs who solved it
  // Safety & Privacy
  isReported?: boolean;
  reportReason?: string;
  // Account Ownership
  ownerId?: string;
  ownerName?: string;
}

export interface MemoryPin {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoIds: string[];
  date: string;
  year: number;
  title: string;
  note: string;
  songUrl?: string;
}

export interface GhostPin {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string;
  title: string;
  note: string;
  wishDate?: string;
  color?: string;
  createdAt: number;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  coverPhotoId?: string;
  photoIds: string[];
  type: 'trip' | 'theme' | 'color' | 'custom';
  colorDot?: string; // Color identifier dot for Apple Photos style
  isTrip?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: number;
  ownerId?: string;
  ownerName?: string;
}

export interface OffLimitsZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: number;
}

export interface Friend {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  stampDesign: string;
  postalCode: string;
  homeCity: string;
  latitude: number;
  longitude: number;
  status?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  avatar: string;
  homeCity: string;
  latitude: number;
  longitude: number;
  friendIds: string[];
}

export interface UserHomeLocation {
  city: string;
  latitude: number;
  longitude: number;
  postalCode: string;
}

export type ActiveTab = 'library' | 'map' | 'museum' | 'party' | 'dispatches' | 'demo';

export type AppTheme = 'gallery' | 'parchment' | 'midnight' | 'terracotta';

export interface StructuredSearchFilter {
  queryText?: string;
  year?: number;
  place?: string;
  colorFamily?: ColorFamily;
  tags?: string[];
  season?: string;
  textFilter?: string;
}

// Guess-The-Spot Types
export interface GuessLogEntry {
  id: string;
  photoId: string;
  photoTitle: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  guessLat: number;
  guessLon: number;
  actualLat: number;
  actualLon: number;
  distanceKm: number;
  score: number;
  accuracy: 'bullseye' | 'close' | 'miss';
  timestamp: number;
}

// Send / Postcard Delivery Types
export type CarrierType = 'pigeon' | 'plane' | 'ship';

export interface InTransitPackage {
  id: string;
  photoIds: string[];
  photoUrls: string[];
  albumTitle?: string;
  senderId: string; // 'user' or friend ID
  senderName: string;
  recipientId: string; // friend ID or 'user' or 'stranger'
  recipientName: string;
  carrier: CarrierType;
  speedType: 'instant' | 'slow';
  distanceKm: number;
  startTime: number;
  durationMs: number;
  arrived: boolean;
  weatherDelaySec: number;
  weatherNotice?: string;
  isMessageInBottle: boolean;
  fromCity: string;
  fromLat: number;
  fromLon: number;
  toCity: string;
  toLat: number;
  toLon: number;
  postmarkText: string;
  personalNote?: string;
  isReported?: boolean;
}

// Buried Treasure Types
export interface TreasureReply {
  id: string;
  photoId: string;
  photoUrl: string;
  note: string;
  authorName: string;
  authorAvatar: string;
  timestamp: number;
}

export interface BuriedTreasure {
  id: string;
  photoId: string;
  photo: Photo;
  latitude: number;
  longitude: number;
  locationName: string;
  note: string;
  riddleHint?: string;
  ownerId: string;
  ownerName: string;
  allowedFriendId?: string; // undefined means all friends
  unlockDate?: string; // ISO date for time capsule
  isDugUp: boolean;
  dugUpLogs: {
    friendId: string;
    friendName: string;
    friendAvatar: string;
    timestamp: number;
  }[];
  replyChain: TreasureReply[];
  createdAt: number;
  isReported?: boolean;
}
