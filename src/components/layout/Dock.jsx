import { useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- motion is used as motion.div, motion.span etc.
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { FlaskConical, Settings as SettingsIcon, Lock, Unlock, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LabSignIn } from '../auth';

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
      ? `radial-gradient(80px circle at ${glowPos.x}px ${glowPos.y}px, rgba(250,204,21,0.22), transparent 70%)`
      : `radial-gradient(80px circle at ${glowPos.x}px ${glowPos.y}px, rgba(202,138,4,0.16), transparent 70%)`,
  } : {};

  const iconContent = (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center justify-center rounded-md border transition-colors duration-200 overflow-hidden ${
        isActive
          ? isDark ? 'bg-[#14171C] border-ember-500 ring-signal' : 'bg-white border-ember-600 ring-signal'
          : isDark ? 'bg-[#14171C] border-[#1C2027] hover:border-[#2A3039]' : 'bg-white border-[#D9DDE3] hover:border-[#B8BEC7]'
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
              ? 'radial-gradient(circle at 50% 50%, rgba(250,204,21,0.14), transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(202,138,4,0.10), transparent 70%)',
          }}
        />
      )}

      <Icon className={`relative z-10 w-[18px] h-[18px] transition-colors ${
        isActive
          ? isDark ? 'text-ember-500' : 'text-ember-600'
          : isHovered
            ? isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'
            : isDark ? 'text-[#7C8794]' : 'text-[#6B7280]'
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
      <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg z-[60] hidden md:block ${
        isDark ? 'bg-[#14171C] text-[#E8ECF1] border border-[#2A3039]' : 'bg-[#0F1216] text-white'
      }`}>
        {label}
      </div>
    </div>
  );
}

/**
 * Dock — Vertical left-side navigation bar (horizontal bottom bar on mobile).
 *
 * Remix Lab nav: Lab, Settings, theme toggle, and the lab lock. Items for the
 * Vault / Calculator / Notes pages get added here as those pages land.
 */
export function Dock({ theme, onToggleTheme, hidden }) {
  const mouseY = useMotionValue(Infinity);
  const [signInOpen, setSignInOpen] = useState(false);
  const location = useLocation();
  const isDark = theme === 'dark';
  const { isSignedIn, loading, signOut } = useAuth();

  const navItems = [
    { to: '/', icon: FlaskConical, label: 'Lab' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const lockItem = isSignedIn
    ? { icon: Unlock, label: 'Lock the lab', onClick: signOut }
    : { icon: Lock, label: 'Unlock the lab', onClick: () => setSignInOpen(true) };

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

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
          className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border backdrop-blur-xl shadow-2xl ${
            isDark
              ? 'bg-[#0D0F12]/85 border-[#1C2027] shadow-black/50'
              : 'bg-white/85 border-[#D9DDE3] shadow-[#B8BEC7]/30'
          }`}
        >
          {navItems.map((item) => (
            <DockIcon key={item.to} {...item} theme={theme} mouseY={mouseY} />
          ))}

          <div className="h-px w-full my-0.5 rule-spectrum opacity-70" />

          {onToggleTheme && (
            <DockIcon
              icon={isDark ? Sun : Moon}
              label={isDark ? 'Light mode' : 'Dark mode'}
              theme={theme}
              mouseY={mouseY}
              onClick={onToggleTheme}
            />
          )}

          {loading ? (
            <div className="w-10 h-10" />
          ) : (
            <DockIcon {...lockItem} theme={theme} mouseY={mouseY} />
          )}
        </motion.div>
      </motion.nav>

      {/* Mobile: compact horizontal bottom bar */}
      <motion.nav
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 md:hidden"
        aria-label="Main navigation"
        initial={false}
        animate={{ y: hidden ? 100 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div
          className={`flex items-center gap-1.5 p-1.5 rounded-lg border backdrop-blur-xl shadow-2xl ${
            isDark
              ? 'bg-[#0D0F12]/85 border-[#1C2027] shadow-black/50'
              : 'bg-white/85 border-[#D9DDE3] shadow-[#B8BEC7]/30'
          }`}
        >
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} aria-label={item.label}>
              <div className={`w-11 h-11 flex items-center justify-center rounded-md border transition-colors ${
                isActive(item.to)
                  ? isDark ? 'bg-[#14171C] border-ember-500 ring-signal' : 'bg-white border-ember-600 ring-signal'
                  : isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'
              }`}>
                <item.icon className={`w-5 h-5 ${
                  isActive(item.to)
                    ? isDark ? 'text-ember-500' : 'text-ember-600'
                    : isDark ? 'text-[#7C8794]' : 'text-[#6B7280]'
                }`} />
              </div>
            </Link>
          ))}

          <div className="w-px h-8 my-auto bg-spectrum-v opacity-70" />

          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} aria-label={isDark ? 'Light mode' : 'Dark mode'}>
              <div className={`w-11 h-11 flex items-center justify-center rounded-md border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
                {isDark ? <Sun className="w-5 h-5 text-[#7C8794]" /> : <Moon className="w-5 h-5 text-[#6B7280]" />}
              </div>
            </button>
          )}

          {!loading && (
            <button type="button" onClick={lockItem.onClick} aria-label={lockItem.label}>
              <div className={`w-11 h-11 flex items-center justify-center rounded-md border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
                <lockItem.icon className={`w-5 h-5 ${isSignedIn ? (isDark ? 'text-ember-500' : 'text-ember-600') : (isDark ? 'text-[#7C8794]' : 'text-[#6B7280]')}`} />
              </div>
            </button>
          )}
        </div>
      </motion.nav>

      <LabSignIn isOpen={signInOpen} onClose={() => setSignInOpen(false)} theme={theme} />
    </>
  );
}
