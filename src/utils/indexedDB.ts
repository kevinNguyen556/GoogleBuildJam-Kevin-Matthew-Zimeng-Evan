import {
  Photo,
  Album,
  GhostPin,
  OffLimitsZone,
  Friend,
  BuriedTreasure,
  InTransitPackage,
  GuessLogEntry,
  UserHomeLocation,
  UserAccount,
} from '../types';

const DB_NAME = 'wayfarer_db';
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const stores = [
        'photos',
        'albums',
        'ghostPins',
        'offLimitsZones',
        'geocodeCache',
        'friends',
        'packages',
        'treasures',
        'guessLogs',
        'settings',
        'accounts',
      ];
      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Photos
export async function getAllPhotosFromDB(): Promise<Photo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhotoToDB(photo: Photo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const req = tx.objectStore('photos').put(photo);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function savePhotosBatchToDB(photos: Photo[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    for (const p of photos) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePhotoFromDB(photoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const req = tx.objectStore('photos').delete(photoId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Albums
export async function getAllAlbumsFromDB(): Promise<Album[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readonly');
    const req = tx.objectStore('albums').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAlbumToDB(album: Album): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readwrite');
    const req = tx.objectStore('albums').put(album);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAlbumFromDB(albumId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readwrite');
    const req = tx.objectStore('albums').delete(albumId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Ghost Pins
export async function getAllGhostPinsFromDB(): Promise<GhostPin[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ghostPins', 'readonly');
    const req = tx.objectStore('ghostPins').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGhostPinToDB(pin: GhostPin): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ghostPins', 'readwrite');
    const req = tx.objectStore('ghostPins').put(pin);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGhostPinFromDB(pinId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ghostPins', 'readwrite');
    const req = tx.objectStore('ghostPins').delete(pinId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Off Limits Zones
export async function getAllOffLimitsZonesFromDB(): Promise<OffLimitsZone[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offLimitsZones', 'readonly');
    const req = tx.objectStore('offLimitsZones').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOffLimitsZoneToDB(zone: OffLimitsZone): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offLimitsZones', 'readwrite');
    const req = tx.objectStore('offLimitsZones').put(zone);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOffLimitsZoneFromDB(zoneId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offLimitsZones', 'readwrite');
    const req = tx.objectStore('offLimitsZones').delete(zoneId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Friends
export async function getAllFriendsFromDB(): Promise<Friend[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('friends', 'readonly');
    const req = tx.objectStore('friends').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFriendsBatchToDB(friends: Friend[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('friends', 'readwrite');
    const store = tx.objectStore('friends');
    for (const f of friends) {
      store.put(f);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveFriendToDB(friend: Friend): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('friends', 'readwrite');
    const req = tx.objectStore('friends').put(friend);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// In-Transit Packages
export async function getAllPackagesFromDB(): Promise<InTransitPackage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('packages', 'readonly');
    const req = tx.objectStore('packages').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePackageToDB(pkg: InTransitPackage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('packages', 'readwrite');
    const req = tx.objectStore('packages').put(pkg);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Buried Treasures
export async function getAllTreasuresFromDB(): Promise<BuriedTreasure[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('treasures', 'readonly');
    const req = tx.objectStore('treasures').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTreasureToDB(treasure: BuriedTreasure): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('treasures', 'readwrite');
    const req = tx.objectStore('treasures').put(treasure);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Guess Log Entries
export async function getAllGuessLogsFromDB(): Promise<GuessLogEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('guessLogs', 'readonly');
    const req = tx.objectStore('guessLogs').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGuessLogToDB(entry: GuessLogEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('guessLogs', 'readwrite');
    const req = tx.objectStore('guessLogs').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// User Accounts
export async function getAllAccountsFromDB(): Promise<UserAccount[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readonly');
    const req = tx.objectStore('accounts').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAccountToDB(account: UserAccount): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readwrite');
    const req = tx.objectStore('accounts').put(account);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAccountFromDB(accountId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('accounts', 'readwrite');
    const req = tx.objectStore('accounts').delete(accountId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
