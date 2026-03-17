import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Waves, Compass, Search, Bell, User, Menu, X, LogOut, LogIn, Clock, ChevronDown, ChevronRight, Settings as SettingsIcon, Zap, Shield, MessageSquare, Trophy, Sliders, Scissors, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AuthModal } from '../auth';
import { FeedbackModal } from '../ui';

// Simple relative time formatter for history items
function getTimeAgo(timestamp) {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(time).toLocaleDateString();
}

/**
 * Sidebar navigation component
 * Desktop: Fixed left sidebar
 * Mobile: Slide-in overlay
 */
export function Sidebar({ theme }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const { user, profile, signOut, loading, isPro, isAdmin, unreadNotifications, unreadMessages } = useAuth();
  const [recentItems, setRecentItems] = useState([]);
  const location = useLocation();

  const isAnalyzeActive = location.pathname === '/analyze';

  // Fetch recent analyses directly from Supabase (independent of useHistory)
  useEffect(() => {
    if (!user) {
      setRecentItems([]);
      return;
    }

    async function fetchRecent() {
      const { data } = await supabase
        .from('analyses')
        .select('id, title, instrument, stem_type, audio_url, stem_urls, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentItems(data || []);
    }

    fetchRecent();
  }, [user]);

  // Collapse Recent when leaving Analyze page
  useEffect(() => {
    if (!isAnalyzeActive) {
      setRecentOpen(false);
    }
  }, [isAnalyzeActive]);

  const mainNavItems = [
    { to: '/', icon: Home, label: 'Home', animClass: 'nav-icon-home' },
    { to: '/analyze', icon: Waves, label: 'Analyze', hasSubItems: true, animClass: 'nav-icon-waves' },
    { to: '/discover', icon: Compass, label: 'Discover', animClass: 'nav-icon-compass' },
    ...(user ? [{ to: '/my-presets', icon: Sliders, label: 'My Presets', animClass: 'nav-icon-presets' }] : []),
    { to: '/search', icon: Search, label: 'Search', animClass: 'nav-icon-search' },
    ...(user ? [
      { to: '/messages', icon: MessageSquare, label: 'Messages', animClass: 'nav-icon-message' },
      { to: '/challenges', icon: Trophy, label: 'Challenges', animClass: 'nav-icon-trophy' },
      { to: '/notifications', icon: Bell, label: 'Notifications', animClass: 'nav-icon-bell' },
      { to: '/profile', icon: User, label: 'Profile', animClass: 'nav-icon-user' },
    ] : []),
  ];

  const NavItem = ({ to, icon: Icon, label, animClass }) => (
    <NavLink
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${animClass || ''} ${
          isActive
            ? `nav-icon-active ${theme === 'dark'
              ? 'bg-zinc-800 text-zinc-50'
              : 'bg-amber-50 text-amber-700'}`
            : theme === 'dark'
              ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
              : 'text-stone-500 hover:text-amber-700 hover:bg-stone-100'
        }`
      }
    >
      <span className="relative">
        <Icon className="w-5 h-5 nav-icon-target" />
        {to === '/notifications' && unreadNotifications > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 text-[10px] font-bold flex items-center justify-center bg-ember-500 text-zinc-950 rounded-full px-1">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
        {to === '/messages' && unreadMessages > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 text-[10px] font-bold flex items-center justify-center bg-ember-500 text-zinc-950 rounded-full px-1">
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </span>
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed top-4 left-4 z-40 p-2 rounded-md md:hidden ${
          theme === 'dark' ? 'bg-zinc-900 text-zinc-50' : 'bg-white text-stone-900 shadow-md'
        }`}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 flex flex-col ${
          theme === 'dark' ? 'bg-zinc-950 border-r border-zinc-800' : 'bg-white border-r border-stone-200'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64`}
      >
        {/* Logo/Brand */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B"/>
                    <stop offset="100%" stopColor="#D97706"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="6" fill="url(#logo-grad)"/>
                <g stroke="#09090B" strokeWidth="2.2" strokeLinecap="round" fill="none">
                  <line x1="7" y1="12" x2="7" y2="20"/>
                  <line x1="11" y1="8" x2="11" y2="24"/>
                  <line x1="15" y1="5" x2="15" y2="27"/>
                  <line x1="19" y1="9" x2="19" y2="23"/>
                  <line x1="23" y1="11" x2="23" y2="21"/>
                  <line x1="27" y1="13" x2="27" y2="19"/>
                </g>
              </svg>
              <span className={`text-xl font-bold font-display ${
                theme === 'dark' ? 'text-zinc-50' : 'text-stone-900'
              }`}>
                SoundSauce
              </span>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1"
              aria-label="Close menu"
            >
              <X className={`w-5 h-5 ${theme === 'dark' ? 'text-zinc-50' : 'text-stone-900'}`} />
            </button>
          </div>
        </div>

        {/* Scrollable middle section */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <nav className="py-4 px-2">
            {mainNavItems.map((item) => (
              <div key={item.to}>
                <NavItem {...item} />

                {/* Recent analyses sub-items — only visible when on Analyze page */}
                {item.hasSubItems && isAnalyzeActive && user && recentItems.length > 0 && (
                  <div className="ml-2">
                    <button
                      onClick={() => setRecentOpen(!recentOpen)}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${
                        theme === 'dark'
                          ? 'text-zinc-500 hover:text-zinc-300'
                          : 'text-stone-400 hover:text-amber-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium text-xs uppercase tracking-wider">Recent</span>
                      {recentOpen
                        ? <ChevronDown className="w-3 h-3 ml-auto" />
                        : <ChevronRight className="w-3 h-3 ml-auto" />
                      }
                    </button>
                    {recentOpen && (
                      <div className="space-y-0.5 pb-1">
                        {recentItems.map((item) => {
                          const hasAudio = !!item.audio_url;
                          const hasStems = !!item.stem_urls;
                          const isResumable = hasAudio || hasStems;
                          return (
                          <Link
                            key={item.id}
                            to={`/analyze?id=${item.id}`}
                            onClick={() => setMobileOpen(false)}
                            className={`block px-6 py-1.5 ml-2 rounded-md transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-zinc-900'
                                : 'hover:bg-stone-100'
                            }`}
                          >
                            <div className={`text-xs font-medium truncate flex items-center gap-1.5 ${
                              theme === 'dark' ? 'text-zinc-300' : 'text-stone-700'
                            }`}>
                              <span className="truncate">{item.title || 'Untitled'}</span>
                            </div>
                            <div className={`text-xs truncate flex items-center gap-1 ${
                              theme === 'dark' ? 'text-zinc-600' : 'text-stone-400'
                            }`}>
                              {item.stem_type && (
                                <span className={`inline-flex items-center gap-0.5 ${
                                  theme === 'dark' ? 'text-zinc-500' : 'text-amber-600'
                                }`}>
                                  <Music className="w-2.5 h-2.5" />
                                  <span className="capitalize">{item.stem_type}</span>
                                  <span className={theme === 'dark' ? 'text-zinc-700' : 'text-stone-300'}>·</span>
                                </span>
                              )}
                              <span className="capitalize">
                                {item.instrument && item.instrument !== 'full' ? item.instrument : 'Full Track'}
                              </span>
                              <span className={theme === 'dark' ? 'text-zinc-700' : 'text-stone-300'}>·</span>
                              <span>{getTimeAgo(item.created_at)}</span>
                              {isResumable && hasStems && (
                                <Scissors className={`w-2.5 h-2.5 ml-auto flex-shrink-0 ${
                                  theme === 'dark' ? 'text-zinc-600' : 'text-amber-400'
                                }`} title="Stems available" />
                              )}
                            </div>
                          </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Settings + Admin nav items — bottom of scrollable area */}
          <div className={`border-t px-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
            <NavLink
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors nav-icon-settings ${
                  isActive
                    ? `nav-icon-active ${theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'bg-amber-50 text-amber-700'}`
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                      : 'text-stone-500 hover:text-amber-700 hover:bg-stone-100'
                }`
              }
            >
              <SettingsIcon className="w-5 h-5 nav-icon-target" />
              <span className="font-medium">Settings</span>
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors nav-icon-admin ${
                    isActive
                      ? `nav-icon-active ${theme === 'dark'
                        ? 'bg-zinc-800 text-zinc-50'
                        : 'bg-amber-50 text-amber-700'}`
                      : theme === 'dark'
                        ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                        : 'text-stone-500 hover:text-amber-700 hover:bg-stone-100'
                  }`
                }
              >
                <Shield className="w-5 h-5 nav-icon-target" />
                <span className="font-medium">Admin</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Bottom section - User info or Sign In */}
        <div className={`p-4 border-t ${
          theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
        }`}>
          {!loading && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden ${
                  theme === 'dark' ? 'bg-zinc-800' : 'bg-amber-100'
                }`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 object-cover rounded-full" />
                  ) : (
                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-amber-600'}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate flex items-center gap-1.5 ${theme === 'dark' ? 'text-zinc-50' : 'text-stone-900'}`}>
                    {profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User'}
                    {isPro && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        theme === 'dark' ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <Zap className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                  </div>
                  <div className={`text-xs truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'}`}>
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : !loading ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 font-medium text-sm rounded-md transition-colors ${
                theme === 'dark'
                  ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          ) : (
            <div className={`text-xs text-center ${theme === 'dark' ? 'text-zinc-600' : 'text-stone-400'}`}>
              Loading...
            </div>
          )}
          {/* Footer links */}
          <div className={`flex items-center justify-center gap-3 pt-2 pb-1 text-xs flex-wrap ${theme === 'dark' ? 'text-zinc-600' : 'text-stone-400'}`}>
            <button onClick={() => { setFeedbackOpen(true); setMobileOpen(false); }} className="hover:underline">Feedback</button>
            <span>·</span>
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="hover:underline">Pricing</Link>
            <span>·</span>
            <Link to="/privacy" onClick={() => setMobileOpen(false)} className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link to="/terms" onClick={() => setMobileOpen(false)} className="hover:underline">Terms</Link>
          </div>
        </div>
      </aside>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        theme={theme}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        theme={theme}
      />
    </>
  );
}
