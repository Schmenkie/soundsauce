import { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- motion is used as motion.div, motion.span etc.
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'motion/react';
import {
  Home, Waves, Compass, Search, Bell, MessageSquare,
  User, LogIn, LogOut, Settings as SettingsIcon, Shield,
  Trophy, Sliders, Zap, MessageCircle, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth';
import { FeedbackModal } from '../ui';

/**
 * DockIcon — Individual nav icon with magnification + amber glow on hover.
 * In vertical mode, grows toward the cursor along the Y axis.
 */
function DockIcon({ to, icon: Icon, label, badge, theme, mouseY, onClick }) {
  const ref = useRef(null);
  const location = useLocation();
  const isDark = theme === 'dark';
  const isActive = !onClick && to && (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const [isHovered, setIsHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Calculate distance from cursor to this icon's center (vertical axis)
  const distance = useTransform(mouseY, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  // Map distance to size: closer = bigger (40px → 56px)
  const sizeSync = useTransform(distance, [-120, 0, 120], [40, 56, 40]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });

  // Amber glow style — radial gradient follows cursor within the icon
  const glowStyle = isHovered ? {
    background: isDark
      ? `radial-gradient(80px circle at ${glowPos.x}px ${glowPos.y}px, rgba(245,158,11,0.25), transparent 70%)`
      : `radial-gradient(80px circle at ${glowPos.x}px ${glowPos.y}px, rgba(217,119,6,0.18), transparent 70%)`,
  } : {};

  const iconContent = (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center justify-center rounded-xl transition-colors duration-200 overflow-hidden ${
        isActive
          ? isDark ? 'bg-zinc-700/80' : 'bg-amber-100/90'
          : isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-stone-200/60 hover:bg-stone-200/90'
      }`}
    >
      {/* Amber glow overlay */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200"
        style={{
          ...glowStyle,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Active amber glow (persistent for active route) */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.15), transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(217,119,6,0.12), transparent 70%)',
          }}
        />
      )}

      <Icon className={`relative z-10 w-[18px] h-[18px] transition-colors ${
        isActive
          ? isDark ? 'text-ember-500' : 'text-amber-700'
          : isHovered
            ? isDark ? 'text-ember-500' : 'text-amber-600'
            : isDark ? 'text-zinc-400' : 'text-stone-500'
      }`} />
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[10px] font-bold flex items-center justify-center bg-ember-500 text-zinc-950 rounded-full px-1 leading-none z-20">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.div>
  );

  return (
    <div className="relative group flex items-center">
      {onClick ? (
        <button onClick={onClick} aria-label={label} type="button">
          {iconContent}
        </button>
      ) : (
        <Link to={to} aria-label={label}>
          {iconContent}
        </Link>
      )}

      {/* Tooltip — appears to the right, hidden on mobile/touch */}
      <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg z-[60] hidden md:block ${
        isDark ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-stone-800 text-white'
      }`}>
        {label}
      </div>
    </div>
  );
}

/**
 * Dock — Vertical left-side navigation bar
 *
 * Fixed to the left edge, centered vertically. Glassmorphic background,
 * icon magnification on hover, amber cursor glow, notification badges,
 * and a compact user avatar popover.
 */
export function Dock({ theme, onToggleTheme, hidden }) {
  const mouseY = useMotionValue(Infinity);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const location = useLocation();
  const isDark = theme === 'dark';

  const { user, profile, signOut, loading, isPro, isAdmin, unreadNotifications, unreadMessages } = useAuth();

  // Close popover on route change
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      queueMicrotask(() => setMenuOpen(false));
    }
  }, [location.pathname]);

  // Close popover on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close popover on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // Focus first menuitem when menu opens
  useEffect(() => {
    if (!menuOpen) return;
    const id = requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector('[role="menuitem"]');
      firstItem?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  // Core nav — always visible
  const coreItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/analyze', icon: Waves, label: 'Analyze' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/search', icon: Search, label: 'Search' },
  ];

  // Badge nav — auth'd users only
  const badgeItems = user ? [
    { to: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
  ] : [];

  // User nav — auth'd users only
  const userItems = user ? [
    { to: '/my-presets', icon: Sliders, label: 'My Presets' },
    { to: '/challenges', icon: Trophy, label: 'Challenges' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ] : [];

  // Horizontal separator for vertical layout
  const Separator = () => (
    <div className={`h-px w-full my-1 ${isDark ? 'bg-zinc-700/50' : 'bg-stone-300/50'}`} />
  );

  return (
    <>
      {/* Desktop: vertical left dock */}
      <motion.nav
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 hidden md:block"
        aria-label="Main navigation"
        initial={false}
        animate={{ x: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <motion.div
          onMouseMove={(e) => mouseY.set(e.clientY)}
          onMouseLeave={() => mouseY.set(Infinity)}
          className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl ${
            isDark
              ? 'bg-zinc-900/70 border-zinc-700/50 shadow-black/40'
              : 'bg-white/70 border-stone-200/60 shadow-stone-300/30'
          }`}
        >
          {/* Core navigation */}
          {coreItems.map((item) => (
            <DockIcon key={item.to} {...item} theme={theme} mouseY={mouseY} />
          ))}

          {/* Badge items (messages/notifications) */}
          {badgeItems.length > 0 && (
            <>
              <Separator />
              {badgeItems.map((item) => (
                <DockIcon key={item.to} {...item} theme={theme} mouseY={mouseY} />
              ))}
            </>
          )}

          {/* User items (presets/challenges/settings/admin) */}
          {userItems.length > 0 && (
            <>
              <Separator />
              {userItems.map((item) => (
                <DockIcon key={item.to} {...item} theme={theme} mouseY={mouseY} />
              ))}
            </>
          )}

          <Separator />

          {/* User avatar with popover — or Sign In for guests */}
          {!loading && user ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={menuTriggerRef}
                onClick={() => setMenuOpen(!menuOpen)}
                className="relative group flex items-center"
                aria-label="User menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                type="button"
              >
                <motion.div
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 overflow-hidden ${
                    menuOpen || location.pathname === '/profile'
                      ? isDark ? 'ring-2 ring-ember-500/60 bg-zinc-700/80' : 'ring-2 ring-amber-400/60 bg-amber-100/90'
                      : isDark ? 'bg-zinc-800/50 hover:bg-zinc-700/50' : 'bg-stone-200/60 hover:bg-stone-200/90'
                  }`}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-[18px] h-[18px] ${isDark ? 'text-zinc-400' : 'text-stone-500'}`} />
                  )}
                </motion.div>
                {isPro && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-ember-500 rounded-full shadow-sm z-10">
                    <Zap className="w-2.5 h-2.5 text-zinc-950" />
                  </span>
                )}
                {/* Tooltip */}
                <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg z-[60] hidden md:block ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-stone-800 text-white'
                }`}>
                  {profile?.username || 'Menu'}
                </div>
              </button>

              {/* User popover — opens to the right */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    role="menu"
                    onKeyDown={(e) => {
                      const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
                      if (!items.length) return;
                      const current = document.activeElement;
                      const idx = items.indexOf(current);
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        items[(idx + 1) % items.length]?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        items[(idx - 1 + items.length) % items.length]?.focus();
                      } else if (e.key === 'Home') {
                        e.preventDefault();
                        items[0]?.focus();
                      } else if (e.key === 'End') {
                        e.preventDefault();
                        items[items.length - 1]?.focus();
                      }
                    }}
                    className={`absolute left-full bottom-0 ml-3 w-56 rounded-xl border shadow-2xl overflow-hidden backdrop-blur-xl ${
                      isDark
                        ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black/50'
                        : 'bg-white/95 border-stone-200 shadow-stone-300/30'
                    }`}
                  >
                    {/* User info header */}
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-stone-100'}`}>
                      <div className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isDark ? 'text-zinc-50' : 'text-stone-900'}`}>
                        {profile?.display_name || profile?.username || user.email?.split('@')[0]}
                        {isPro && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isDark ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <Zap className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        )}
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                        {user.email}
                      </div>
                    </div>

                    {/* Navigation + Actions */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </Link>
                      {onToggleTheme && (
                        <button
                          role="menuitem"
                          onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                          }`}
                        >
                          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      )}
                      <button
                        role="menuitem"
                        onClick={() => { setFeedbackOpen(true); setMenuOpen(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Feedback
                      </button>
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>

                    {/* Footer links */}
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 border-t text-[11px] ${
                      isDark ? 'border-zinc-800 text-zinc-600' : 'border-stone-100 text-stone-400'
                    }`}>
                      <Link to="/pricing" onClick={() => setMenuOpen(false)} className="hover:underline">Pricing</Link>
                      <span>·</span>
                      <Link to="/privacy" onClick={() => setMenuOpen(false)} className="hover:underline">Privacy</Link>
                      <span>·</span>
                      <Link to="/terms" onClick={() => setMenuOpen(false)} className="hover:underline">Terms</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : !loading ? (
            <DockIcon
              icon={LogIn}
              label="Sign In"
              theme={theme}
              mouseY={mouseY}
              onClick={() => setAuthModalOpen(true)}
            />
          ) : (
            /* Loading placeholder */
            <div className="w-10 h-10" />
          )}
        </motion.div>
      </motion.nav>

      {/* Mobile: compact horizontal bottom bar with core items only */}
      <motion.nav
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 md:hidden"
        aria-label="Main navigation"
        initial={false}
        animate={{ y: hidden ? 100 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div
          className={`flex items-center gap-1 px-2 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl ${
            isDark
              ? 'bg-zinc-900/70 border-zinc-700/50 shadow-black/40'
              : 'bg-white/70 border-stone-200/60 shadow-stone-300/30'
          }`}
        >
          {coreItems.map((item) => (
            <Link key={item.to} to={item.to} aria-label={item.label}>
              <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
                  ? isDark ? 'bg-zinc-700/80' : 'bg-amber-100/90'
                  : isDark ? 'bg-zinc-800/50' : 'bg-stone-200/60'
              }`}>
                <item.icon className={`w-5 h-5 ${
                  (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
                    ? isDark ? 'text-ember-500' : 'text-amber-700'
                    : isDark ? 'text-zinc-400' : 'text-stone-500'
                }`} />
              </div>
            </Link>
          ))}

          {/* Notifications with combined badge */}
          {user && (
            <Link to="/notifications" aria-label="Notifications">
              <div className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                location.pathname.startsWith('/notifications')
                  ? isDark ? 'bg-zinc-700/80' : 'bg-amber-100/90'
                  : isDark ? 'bg-zinc-800/50' : 'bg-stone-200/60'
              }`}>
                <Bell className={`w-5 h-5 ${
                  location.pathname.startsWith('/notifications')
                    ? isDark ? 'text-ember-500' : 'text-amber-700'
                    : isDark ? 'text-zinc-400' : 'text-stone-500'
                }`} />
                {((unreadNotifications || 0) + (unreadMessages || 0)) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[10px] font-bold flex items-center justify-center bg-ember-500 text-zinc-950 rounded-full px-1 leading-none">
                    {(unreadNotifications || 0) + (unreadMessages || 0)}
                  </span>
                )}
              </div>
            </Link>
          )}

          {/* Separator */}
          <div className={`w-px h-8 my-auto ${isDark ? 'bg-zinc-700/50' : 'bg-stone-300/50'}`} />

          {/* Avatar / Sign In */}
          {!loading && user ? (
            <div className="relative" ref={!menuOpen ? undefined : menuRef}>
              <button
                ref={menuTriggerRef}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="User menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                type="button"
              >
                <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 overflow-hidden ${
                  menuOpen || location.pathname === '/profile'
                    ? isDark ? 'ring-2 ring-ember-500/60 bg-zinc-700/80' : 'ring-2 ring-amber-400/60 bg-amber-100/90'
                    : isDark ? 'bg-zinc-800/50' : 'bg-stone-200/60'
                }`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`} />
                  )}
                </div>
                {isPro && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-ember-500 rounded-full shadow-sm z-10">
                    <Zap className="w-2.5 h-2.5 text-zinc-950" />
                  </span>
                )}
              </button>

              {/* Mobile popover — opens upward */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    role="menu"
                    onKeyDown={(e) => {
                      const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);
                      if (!items.length) return;
                      const current = document.activeElement;
                      const idx = items.indexOf(current);
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        items[(idx + 1) % items.length]?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        items[(idx - 1 + items.length) % items.length]?.focus();
                      } else if (e.key === 'Home') {
                        e.preventDefault();
                        items[0]?.focus();
                      } else if (e.key === 'End') {
                        e.preventDefault();
                        items[items.length - 1]?.focus();
                      }
                    }}
                    className={`absolute bottom-full right-0 mb-3 w-56 rounded-xl border shadow-2xl overflow-hidden backdrop-blur-xl ${
                      isDark
                        ? 'bg-zinc-900/95 border-zinc-700/80 shadow-black/50'
                        : 'bg-white/95 border-stone-200 shadow-stone-300/30'
                    }`}
                  >
                    {/* User info header */}
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-stone-100'}`}>
                      <div className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isDark ? 'text-zinc-50' : 'text-stone-900'}`}>
                        {profile?.display_name || profile?.username || user.email?.split('@')[0]}
                        {isPro && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isDark ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <Zap className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        )}
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                        {user.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}>
                        <User className="w-4 h-4" /> View Profile
                      </Link>
                      <Link to="/messages" role="menuitem" onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}>
                        <MessageSquare className="w-4 h-4" /> Messages
                        {unreadMessages > 0 && (
                          <span className="ml-auto min-w-[18px] h-4 text-[10px] font-bold flex items-center justify-center bg-ember-500 text-zinc-950 rounded-full px-1">{unreadMessages}</span>
                        )}
                      </Link>
                      {userItems.map(item => (
                        <Link key={item.to} to={item.to} role="menuitem" onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                          }`}>
                          <item.icon className="w-4 h-4" /> {item.label}
                        </Link>
                      ))}
                      {onToggleTheme && (
                        <button role="menuitem" onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                            isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                          }`}>
                          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      )}
                      <button role="menuitem" onClick={() => { setFeedbackOpen(true); setMenuOpen(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}>
                        <MessageCircle className="w-4 h-4" /> Feedback
                      </button>
                      <button role="menuitem" onClick={handleSignOut}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}>
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>

                    <div className={`flex items-center justify-center gap-2 px-4 py-2 border-t text-[11px] ${
                      isDark ? 'border-zinc-800 text-zinc-600' : 'border-stone-100 text-stone-400'
                    }`}>
                      <Link to="/pricing" onClick={() => setMenuOpen(false)} className="hover:underline">Pricing</Link>
                      <span>·</span>
                      <Link to="/privacy" onClick={() => setMenuOpen(false)} className="hover:underline">Privacy</Link>
                      <span>·</span>
                      <Link to="/terms" onClick={() => setMenuOpen(false)} className="hover:underline">Terms</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : !loading ? (
            <button onClick={() => setAuthModalOpen(true)} aria-label="Sign In" type="button">
              <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${
                isDark ? 'bg-zinc-800/50' : 'bg-stone-200/60'
              }`}>
                <LogIn className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`} />
              </div>
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
        </div>
      </motion.nav>

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
