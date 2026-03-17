// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';

/**
 * ElegantShape — Floating glassmorphic pill shape with subtle bob animation.
 * Used as ambient background decoration behind the hero section.
 */
function ElegantShape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = 'from-white/[0.08]' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={[
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'backdrop-blur-[2px] border-2 border-white/[0.15]',
            'shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]',
          ].join(' ')}
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * HeroBackground — Animated floating shapes + gradient fog for the hero section.
 *
 * Renders behind hero content as a full-bleed background with:
 * - Subtle gradient fog (amber-tinted for Obsidian Ember)
 * - 5 floating glassmorphic pill shapes at different positions/delays
 * - Top/bottom vignette gradient to blend into page background
 *
 * Usage:
 *   <HeroBackground theme="dark">
 *     <YourHeroContent />
 *   </HeroBackground>
 */
export function HeroBackground({ children, theme }) {
  const isDark = theme === 'dark';

  return (
    <div className="relative w-full overflow-hidden">
      {/* Ambient gradient fog */}
      <div className={`absolute inset-0 blur-3xl ${
        isDark
          ? 'bg-gradient-to-br from-amber-500/[0.05] via-transparent to-orange-500/[0.03]'
          : 'bg-gradient-to-br from-amber-400/[0.08] via-transparent to-orange-400/[0.05]'
      }`} />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large shape — upper left */}
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient={isDark ? 'from-amber-500/[0.12]' : 'from-amber-400/[0.15]'}
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        {/* Medium shape — lower right */}
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient={isDark ? 'from-orange-500/[0.10]' : 'from-orange-400/[0.12]'}
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        {/* Small shape — lower left */}
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient={isDark ? 'from-yellow-500/[0.08]' : 'from-yellow-400/[0.10]'}
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        {/* Small shape — upper right */}
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient={isDark ? 'from-amber-400/[0.10]' : 'from-amber-300/[0.12]'}
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />

        {/* Tiny shape — top center-left */}
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient={isDark ? 'from-orange-400/[0.08]' : 'from-orange-300/[0.10]'}
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Top/bottom vignette to blend into page background */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark
          ? 'bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/80'
          : 'bg-gradient-to-t from-stone-50 via-transparent to-stone-50/80'
      }`} />
    </div>
  );
}
