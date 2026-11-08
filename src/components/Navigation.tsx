import React from 'react';
import {
  MapPin,
  Image as ImageIcon,
  Building2,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Plane,
  X,
  Settings,
  Gamepad2,
  FlaskConical,
} from 'lucide-react';
import { ActiveTab, Album } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenImport: () => void;
  onOpenOffLimits: () => void;
  onOpenSettings: () => void;
  photoCount: number;
  unplacedCount: number;
  offLimitsCount: number;
  activeTrip: Album | null;
  onOpenStartTripModal: () => void;
  onEndTrip: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenImport,
  onOpenOffLimits,
  onOpenSettings,
  photoCount,
  unplacedCount,
  offLimitsCount,
  activeTrip,
  onOpenStartTripModal,
  onEndTrip,
}) => {
  const tabs = [
    { id: 'library' as ActiveTab, label: 'Library', icon: ImageIcon, badge: photoCount },
    {
      id: 'map' as ActiveTab,
      label: 'Memory Map',
      icon: MapPin,
      badge: unplacedCount > 0 ? `${unplacedCount} unplaced` : undefined,
      badgeAlert: unplacedCount > 0,
    },
    { id: 'museum' as ActiveTab, label: 'Museum', icon: Building2, tag: '3D Gallery' },
    { id: 'party' as ActiveTab, label: 'Party Game', icon: Gamepad2, tag: 'Friends' },
    {
      id: 'demo' as ActiveTab,
      label: 'Demo Lab',
      icon: FlaskConical,
      tag: 'Demo Only',
      isDemo: true,
    },
  ];

  return (
    <header className="relative bg-[#FCFAF6] border-b border-[#E5DAC8] shadow-xs sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Heading - Clean Googleheim typography with logo box and strip removed */}
          <div
            className="flex items-baseline space-x-2.5 cursor-pointer select-none"
            onClick={() => onTabChange('library')}
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif-vintage text-[#2D241E]">
              Googleheim
            </h1>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C7A6B] hidden sm:inline">
              Gallery & Museum
            </span>
          </div>

          {/* Center: Active Trip Indicator or Start Trip Button */}
          <div className="hidden md:flex items-center">
            {activeTrip ? (
              <div className="flex items-center space-x-2 bg-[#FAF0ED] border border-[#ECCDC5] rounded-full px-3.5 py-1 text-xs shadow-xs animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-[#B83A28] animate-ping" />
                <span className="font-semibold text-[#B83A28]">Active Trip:</span>
                <span className="font-medium text-[#2D241E] truncate max-w-[180px]">
                  {activeTrip.title}
                </span>
                <button
                  onClick={onEndTrip}
                  className="ml-1 p-0.5 text-[#B83A28] hover:bg-[#F2D7D0] rounded-full"
                  title="End current trip"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenStartTripModal}
                className="flex items-center space-x-1.5 px-3.5 py-1 text-xs font-semibold text-[#235478] bg-[#F0F5F9] hover:bg-[#E4EFF7] border border-[#CDE0ED] rounded-full transition-all"
              >
                <Plane className="w-3.5 h-3.5 text-[#235478]" />
                <span>Start a Trip</span>
              </button>
            )}
          </div>

          {/* Action Buttons: Privacy, Import, and Settings Cog next to Import */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Mobile Start Trip button */}
            <div className="md:hidden">
              {activeTrip ? (
                <button
                  onClick={onEndTrip}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#FAF0ED] text-[#B83A28] border border-[#ECCDC5] rounded-full"
                >
                  Trip Active ✕
                </button>
              ) : (
                <button
                  onClick={onOpenStartTripModal}
                  className="px-2 py-1 text-[11px] font-semibold bg-[#F0F5F9] text-[#235478] border border-[#CDE0ED] rounded-full"
                >
                  + Trip
                </button>
              )}
            </div>

            {/* Privacy Zones Button */}
            <button
              onClick={onOpenOffLimits}
              title="Manage Off-Limits Privacy Zones"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5A4E42] bg-[#F3EDE2] hover:bg-[#EAE2D3] border border-[#DDD0BE] rounded-xl transition-colors"
            >
              {offLimitsCount > 0 ? (
                <ShieldAlert className="w-3.5 h-3.5 text-[#B83A28]" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[#235478]" />
              )}
              <span className="hidden sm:inline">Privacy</span>
              {offLimitsCount > 0 && (
                <span className="bg-[#B83A28] text-white text-[10px] px-1 rounded-full">
                  {offLimitsCount}
                </span>
              )}
            </button>

            {/* Import Photos Button */}
            <button
              onClick={onOpenImport}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#2D241E] hover:bg-[#1B1512] rounded-xl shadow-xs transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>

            {/* Settings Cog Button: Placed directly at the top right next to Import */}
            <button
              onClick={onOpenSettings}
              title="Settings (Change Theme, Account, Friends)"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#D8C7B0] bg-[#FAF5EB] hover:bg-[#EFE6D9] text-[#2D241E] transition-all flex items-center space-x-1.5 shadow-2xs hover:shadow-xs active:scale-95"
            >
              <Settings className="w-4 h-4 text-[#2D241E] animate-[spin_12s_linear_infinite]" />
              <span className="text-xs font-semibold hidden md:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* 4 Top Navigation Tabs: Library, Memory Map, Museum, Party Game */}
        <nav className="flex space-x-2 border-t border-[#EDE4D8] pt-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDemoTab = 'isDemo' in tab && tab.isDemo;

            if (isDemoTab) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-b-2 shadow-2xs ${
                    isActive
                      ? 'border-amber-600 text-amber-950 bg-amber-100 font-bold'
                      : 'border-amber-300/70 text-amber-900 bg-amber-50 hover:bg-amber-100/70'
                  }`}
                  title="Demo Tab: Switch personas to test bottles, treasures, and courier sending"
                >
                  <Icon className="w-4 h-4 text-amber-700 animate-bounce" />
                  <span>{tab.label}</span>
                  <span className="ml-1 text-[9px] uppercase tracking-wider font-extrabold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                    Demo Only
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-[#2D241E] text-[#2D241E] font-bold bg-[#FAF5EB]'
                    : 'border-transparent text-[#6E5E4E] hover:text-[#2D241E] hover:bg-[#F5EFEB]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#B83A28]' : 'text-[#8C7A6B]'}`} />
                <span>{tab.label}</span>

                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${
                      tab.badgeAlert
                        ? 'bg-[#B83A28] text-white animate-pulse'
                        : 'bg-[#E5DAC8] text-[#4A3D2F]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {tab.tag && (
                  <span className="ml-1 text-[9px] uppercase tracking-wider text-[#7A6958] bg-[#EFE6D9] px-1.5 py-0.2 rounded border border-[#DECDB9]">
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
