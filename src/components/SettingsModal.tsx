import React, { useState } from 'react';
import {
  X,
  Palette,
  User,
  Users,
  Lock,
  Plus,
  Trash2,
  Check,
  MapPin,
  Sparkles,
  LogIn,
  UserPlus,
  ShieldCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { AppTheme, UserAccount, Friend } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  currentUser: UserAccount;
  accounts: UserAccount[];
  friends: Friend[];
  onLogin: (account: UserAccount) => void;
  onCreateAccount: (account: UserAccount) => void;
  onAddFriend: (friend: Friend) => void;
  onRemoveFriend: (friendId: string) => void;
}

const THEME_OPTIONS: {
  id: AppTheme;
  title: string;
  description: string;
  previewClass: string;
  accentColor: string;
  textColor: string;
}[] = [
  {
    id: 'gallery',
    title: 'Gallery Crisp',
    description: 'Clean modern museum aesthetic with subtle borders and crisp typography.',
    previewClass: 'bg-white border-zinc-200 text-zinc-900',
    accentColor: '#18181B',
    textColor: '#18181B',
  },
  {
    id: 'parchment',
    title: 'Cozy Parchment',
    description: 'Warm postal paper, sepia tones, and timeless handwritten accents.',
    previewClass: 'bg-[#F6F1EA] border-[#DECDB9] text-[#2C241E]',
    accentColor: '#B83A28',
    textColor: '#2C241E',
  },
  {
    id: 'midnight',
    title: 'Midnight Guggenheim',
    description: 'Dark architectural gallery with dramatic spotlights and amber accents.',
    previewClass: 'bg-[#12151A] border-[#2A303C] text-slate-100',
    accentColor: '#F59E0B',
    textColor: '#F8FAFC',
  },
  {
    id: 'terracotta',
    title: 'Terracotta & Clay',
    description: 'Earthy warmth inspired by Mediterranean clay, warm sun, and olive groves.',
    previewClass: 'bg-[#F8F1EB] border-[#E8D1C2] text-[#3D251E]',
    accentColor: '#C85A32',
    textColor: '#3D251E',
  },
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  currentUser,
  accounts,
  friends,
  onLogin,
  onCreateAccount,
  onAddFriend,
  onRemoveFriend,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'account' | 'friends'>('theme');

  // Account form state
  const [authMode, setAuthMode] = useState<'view' | 'login' | 'signup'>('view');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [homeCityInput, setHomeCityInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [authError, setAuthError] = useState<string | null>(null);

  // New Friend form state
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendCity, setFriendCity] = useState('');
  const [friendAvatar, setFriendAvatar] = useState(AVATAR_PRESETS[2]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const found = accounts.find(
      (a) => a.username.toLowerCase() === usernameInput.trim().toLowerCase()
    );

    if (!found) {
      setAuthError('User not found. Check username or create a new account.');
      return;
    }

    if (found.password && found.password !== passwordInput) {
      setAuthError('Incorrect password. Please try again.');
      return;
    }

    onLogin(found);
    setAuthMode('view');
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const userClean = usernameInput.trim().toLowerCase();
    if (!userClean) {
      setAuthError('Please enter a username.');
      return;
    }

    if (accounts.some((a) => a.username.toLowerCase() === userClean)) {
      setAuthError('Username already taken. Please choose another.');
      return;
    }

    const newAcc: UserAccount = {
      id: `account-${Date.now()}`,
      username: userClean,
      password: passwordInput || 'password123',
      displayName: displayNameInput.trim() || usernameInput.trim(),
      avatar: selectedAvatar,
      homeCity: homeCityInput.trim() || 'New York, USA',
      latitude: 40.7128,
      longitude: -74.006,
      friendIds: friends.map((f) => f.id),
    };

    onCreateAccount(newAcc);
    setAuthMode('view');
    setUsernameInput('');
    setPasswordInput('');
    setDisplayNameInput('');
    setHomeCityInput('');
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) return;

    const newF: Friend = {
      id: `friend-${Date.now()}`,
      name: friendName.trim(),
      username: friendName.toLowerCase().replace(/\s+/g, '_'),
      avatar: friendAvatar,
      stampDesign: 'Postal Airmail 2024',
      postalCode: 'POST-001',
      homeCity: friendCity.trim() || 'London, UK',
      latitude: 51.5074,
      longitude: -0.1278,
      status: 'Active Voyager',
    };

    onAddFriend(newF);
    setFriendName('');
    setFriendCity('');
    setIsAddingFriend(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-[#FAF7F2] text-[#2C241E] rounded-3xl border border-[#DECDB9] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-[#E8DCCB] flex items-center justify-between bg-white/70">
          <div>
            <h2 className="text-xl font-bold font-serif-vintage tracking-tight">
              Googleheim Settings
            </h2>
            <p className="text-xs text-[#7A6958] mt-0.5">
              Customize theme, manage your account, and curate your circle of friends.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8C7A6B] hover:text-[#2C241E] hover:bg-[#EFE6D9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E8DCCB] bg-[#F2EDE4] px-4 pt-2">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'theme'
                ? 'bg-[#FAF7F2] text-[#2C241E] border-[#2C241E]'
                : 'text-[#7A6958] border-transparent hover:text-[#2C241E]'
            }`}
          >
            <Palette className="w-4 h-4 text-[#B83A28]" />
            <span>Theme & Aesthetics</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'account'
                ? 'bg-[#FAF7F2] text-[#2C241E] border-[#2C241E]'
                : 'text-[#7A6958] border-transparent hover:text-[#2C241E]'
            }`}
          >
            <User className="w-4 h-4 text-[#235478]" />
            <span>Account & Login</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'friends'
                ? 'bg-[#FAF7F2] text-[#2C241E] border-[#2C241E]'
                : 'text-[#7A6958] border-transparent hover:text-[#2C241E]'
            }`}
          >
            <Users className="w-4 h-4 text-[#C85A32]" />
            <span>Friends Circle ({friends.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* THEME TAB */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">Select Gallery Theme</h3>
                <p className="text-xs text-[#7A6958] mt-0.5">
                  Change the color atmosphere of Googleheim, museum galleries, and memory albums.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = currentTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onThemeChange(theme.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-[#2C241E] shadow-md ring-2 ring-[#2C241E]/20'
                          : 'border-[#DECDB9] hover:border-[#B5A18C] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#2C241E]">{theme.title}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#2C241E] text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#6A5A4B] leading-relaxed mb-3">
                        {theme.description}
                      </p>

                      {/* Swatch preview bar */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <div
                          className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <div className="h-2 flex-1 rounded-full bg-[#EAE0D3] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ backgroundColor: theme.accentColor, width: '40%' }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div className="space-y-5">
              {/* Active User Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#DECDB9] shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-[#2C241E] shadow-xs"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-[#2C241E]">
                        {currentUser.displayName}
                      </span>
                      <span className="text-[10px] font-mono bg-[#EFE6D9] text-[#5A4B3C] px-2 py-0.5 rounded-full">
                        @{currentUser.username}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A6958] flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#B83A28]" />
                      <span>{currentUser.homeCity}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'view' : 'login')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#D8C7B0] bg-[#FAF5EB] hover:bg-white text-[#2C241E] transition-colors"
                  >
                    Switch Account
                  </button>
                  <button
                    onClick={() => setAuthMode(authMode === 'signup' ? 'view' : 'signup')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#2C241E] text-white hover:bg-black transition-colors"
                  >
                    + New
                  </button>
                </div>
              </div>

              {/* Login Form */}
              {authMode === 'login' && (
                <form
                  onSubmit={handleLoginSubmit}
                  className="p-5 rounded-2xl bg-white border-2 border-[#235478] shadow-md space-y-3.5 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#235478] flex items-center space-x-1.5">
                      <LogIn className="w-4 h-4" />
                      <span>Log into Account</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAuthMode('view')}
                      className="text-xs text-[#7A6958]"
                    >
                      Cancel
                    </button>
                  </div>

                  {authError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      {authError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#4A3D2F] mb-1">Username</label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="e.g. curator or wanderer"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#235478]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A3D2F] mb-1">Password</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter password"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#235478]"
                      required
                    />
                  </div>

                  <div className="text-[11px] text-[#7A6958] bg-[#F5EFEB] p-2 rounded-lg">
                    💡 Sample Accounts: <strong>curator</strong> (password: <code>password123</code>) or{' '}
                    <strong>wanderer</strong> (password: <code>password123</code>)
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-bold text-white bg-[#235478] hover:bg-[#1A4260] rounded-xl shadow-xs transition-colors"
                  >
                    Log In
                  </button>
                </form>
              )}

              {/* Sign Up Form */}
              {authMode === 'signup' && (
                <form
                  onSubmit={handleSignupSubmit}
                  className="p-5 rounded-2xl bg-white border-2 border-[#B83A28] shadow-md space-y-3.5 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#B83A28] flex items-center space-x-1.5">
                      <UserPlus className="w-4 h-4" />
                      <span>Create New Account</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAuthMode('view')}
                      className="text-xs text-[#7A6958]"
                    >
                      Cancel
                    </button>
                  </div>

                  {authError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      {authError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3D2F] mb-1">Username</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="e.g. artlover"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#B83A28]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A3D2F] mb-1">Password</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Choose a password"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#B83A28]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3D2F] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="e.g. Maya Chen"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#B83A28]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A3D2F] mb-1">Home City</label>
                      <input
                        type="text"
                        value={homeCityInput}
                        onChange={(e) => setHomeCityInput(e.target.value)}
                        placeholder="e.g. San Francisco, USA"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#B83A28]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A3D2F] mb-1.5">
                      Choose Avatar
                    </label>
                    <div className="flex items-center space-x-2">
                      {AVATAR_PRESETS.map((av, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setSelectedAvatar(av)}
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform ${
                            selectedAvatar === av
                              ? 'border-[#B83A28] scale-110 shadow-sm'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={av} alt="avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-bold text-white bg-[#B83A28] hover:bg-[#9B2E20] rounded-xl shadow-xs transition-colors"
                  >
                    Register & Sign In
                  </button>
                </form>
              )}

              {/* All Saved Accounts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A6958]">
                  Available Accounts on this Device
                </h4>
                <div className="space-y-1.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-2.5 rounded-xl bg-white border border-[#E5DAC8] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={acc.avatar}
                          alt={acc.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-[#2C241E]">
                            {acc.displayName}{' '}
                            {acc.id === currentUser.id && (
                              <span className="text-[10px] text-green-700 font-normal">
                                (Active)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#7A6958]">
                            @{acc.username} • {acc.homeCity}
                          </p>
                        </div>
                      </div>
                      {acc.id !== currentUser.id && (
                        <button
                          onClick={() => onLogin(acc)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FAF5EB] hover:bg-[#EFE6D9] text-[#2C241E] border border-[#DECDB9]"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FRIENDS TAB */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">Friends Circle</h3>
                  <p className="text-xs text-[#7A6958] mt-0.5">
                    Friends can explore your museum, guess mystery spots, and leave speech bubble notes.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingFriend(!isAddingFriend)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#2C241E] text-white hover:bg-black transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Friend</span>
                </button>
              </div>

              {/* Add Friend Form */}
              {isAddingFriend && (
                <form
                  onSubmit={handleAddFriendSubmit}
                  className="p-4 rounded-2xl bg-white border-2 border-[#DECDB9] shadow-md space-y-3 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C241E]">New Friend Profile</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingFriend(false)}
                      className="text-xs text-[#7A6958]"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#4A3D2F] mb-1">
                        Friend Name
                      </label>
                      <input
                        type="text"
                        value={friendName}
                        onChange={(e) => setFriendName(e.target.value)}
                        placeholder="e.g. Liam O'Connor"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#2C241E]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4A3D2F] mb-1">
                        Home City
                      </label>
                      <input
                        type="text"
                        value={friendCity}
                        onChange={(e) => setFriendCity(e.target.value)}
                        placeholder="e.g. Dublin, Ireland"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECDB9] bg-[#FAF7F2] outline-hidden focus:border-[#2C241E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A3D2F] mb-1.5">
                      Avatar
                    </label>
                    <div className="flex items-center space-x-2">
                      {AVATAR_PRESETS.map((av, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setFriendAvatar(av)}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform ${
                            friendAvatar === av
                              ? 'border-[#2C241E] scale-110 shadow-sm'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={av} alt="avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-bold text-white bg-[#2C241E] hover:bg-black rounded-xl shadow-xs transition-colors"
                  >
                    Save Friend to Circle
                  </button>
                </form>
              )}

              {/* Friends List */}
              <div className="space-y-2">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl bg-white border border-[#E5DAC8] flex items-center justify-between shadow-2xs hover:border-[#DECDB9] transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={f.avatar}
                        alt={f.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#DECDB9]"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#2C241E]">{f.name}</h4>
                        <p className="text-[11px] text-[#7A6958] flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#B83A28]" />
                          <span>{f.homeCity}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#6A5A4B] border border-[#DECDB9]">
                        {f.status || 'Active'}
                      </span>
                      {friends.length > 1 && (
                        <button
                          onClick={() => onRemoveFriend(f.id)}
                          className="p-1.5 text-[#B5A18C] hover:text-red-600 rounded-lg transition-colors"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8DCCB] bg-white/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2C241E] hover:bg-black rounded-xl shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
