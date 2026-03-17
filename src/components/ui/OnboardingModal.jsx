import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Upload, Compass, Sparkles, Music } from 'lucide-react';
import { trackOnboardingStarted, trackOnboardingCompleted, trackOnboardingSkipped } from '../../lib/posthog';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const SKILL_LEVELS = [
  { value: '', label: 'Select your level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'professional', label: 'Professional' },
];

const DAW_OPTIONS = [
  { value: 'Ableton Live', label: 'Ableton Live' },
  { value: 'FL Studio', label: 'FL Studio' },
  { value: 'Logic Pro', label: 'Logic Pro' },
  { value: 'Bitwig', label: 'Bitwig' },
  { value: 'Reaper', label: 'Reaper' },
  { value: 'Pro Tools', label: 'Pro Tools' },
  { value: 'Other', label: 'Other' },
];

// Pre-computed analysis results from the Cm7 demo chord
const DEMO_ANALYSIS = [
  { label: 'Key', value: 'C Minor' },
  { label: 'Waveform', value: 'Sawtooth' },
  { label: 'Filter', value: 'LP sweep 200 \u2192 3,500 Hz' },
  { label: 'Attack', value: '150ms' },
  { label: 'Sustain', value: '65%' },
  { label: 'Release', value: '200ms' },
];

/**
 * Post-signup onboarding modal.
 * Value-first 3-step flow: Quick Demo \u2192 Personalize \u2192 Get Started
 */
export function OnboardingModal({ isOpen, onComplete, theme }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [skillLevel, setSkillLevel] = useState('');
  const [dawPreference, setDawPreference] = useState('Ableton Live');
  const [showDemoResults, setShowDemoResults] = useState(false);
  const [visibleResults, setVisibleResults] = useState(0);
  const hasTrackedOpenRef = useRef(false);
  const focusTrapRef = useFocusTrap(isOpen);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onComplete({});
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onComplete]);

  // Track onboarding started when modal first opens
  useEffect(() => {
    if (isOpen && !hasTrackedOpenRef.current) {
      hasTrackedOpenRef.current = true;
      trackOnboardingStarted();
    }
  }, [isOpen]);

  // Staggered reveal animation for demo results
  useEffect(() => {
    if (!showDemoResults) return;
    if (visibleResults >= DEMO_ANALYSIS.length) return;
    const timer = setTimeout(() => {
      setVisibleResults(prev => prev + 1);
    }, 120);
    return () => clearTimeout(timer);
  }, [showDemoResults, visibleResults]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleComplete = (destination) => {
    const preferences = {};
    if (skillLevel) preferences.skill_level = skillLevel;
    if (dawPreference) preferences.daw_preference = dawPreference;
    trackOnboardingCompleted(preferences);
    onComplete(preferences);
    if (destination) navigate(destination);
  };

  const handleSkip = () => {
    trackOnboardingSkipped(step);
    onComplete({});
  };

  const handleShowDemo = () => {
    setShowDemoResults(true);
    setVisibleResults(0);
  };

  const bgClass = isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200';
  const textClass = isDark ? 'text-white' : 'text-stone-900';
  const mutedClass = isDark ? 'text-zinc-400' : 'text-stone-500';
  const dimmedClass = isDark ? 'text-zinc-500' : 'text-stone-400';
  const primaryBtnClass = isDark
    ? 'bg-white text-black hover:bg-zinc-200 rounded-md'
    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20 rounded-md';
  const secondaryBtnClass = isDark
    ? 'bg-zinc-700 text-white hover:bg-zinc-600 rounded-md'
    : 'bg-stone-900 text-white hover:bg-stone-800 rounded-md';
  const selectClass = isDark
    ? 'bg-zinc-950 border-zinc-700 text-white rounded-md'
    : 'bg-stone-50 border-stone-200 text-stone-900 rounded-md';
  const badgeBg = isDark ? 'bg-zinc-800' : 'bg-amber-50';
  const badgeText = isDark ? 'text-zinc-400' : 'text-ember-600';

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleSkip}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className={`w-full max-w-lg border rounded-lg ${bgClass} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? `w-8 ${isDark ? 'bg-white' : 'bg-ember-600'}`
                  : `w-4 ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Step 0: Quick Demo */}
          {step === 0 && (
            <div className="text-center space-y-5">
              <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                <defs>
                  <linearGradient id="onboard-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="6" fill="url(#onboard-grad)"/>
                <g stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none">
                  <line x1="7" y1="12" x2="7" y2="20"/>
                  <line x1="11" y1="8" x2="11" y2="24"/>
                  <line x1="15" y1="5" x2="15" y2="27"/>
                  <line x1="19" y1="9" x2="19" y2="23"/>
                  <line x1="23" y1="11" x2="23" y2="21"/>
                  <line x1="27" y1="13" x2="27" y2="19"/>
                </g>
              </svg>
              <div>
                <h2 id="onboarding-modal-title" className={`text-2xl font-bold mb-2 ${textClass}`}>Welcome to SoundSauce</h2>
                <p className={mutedClass}>
                  Let's show you what it can do.
                </p>
              </div>

              {!showDemoResults ? (
                <button
                  onClick={handleShowDemo}
                  className={`w-full py-3 font-medium flex items-center justify-center gap-2 ${primaryBtnClass}`}
                >
                  <Sparkles className="w-4 h-4" />
                  Show Me
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Demo results header */}
                  <p className={`text-sm font-medium ${mutedClass}`}>
                    We analyzed a synth chord and found:
                  </p>

                  {/* Staggered result badges */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {DEMO_ANALYSIS.map((item, i) => (
                      <div
                        key={item.label}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${badgeBg} ${
                          i < visibleResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                        }`}
                      >
                        <span className={dimmedClass}>{item.label}: </span>
                        <span className={textClass}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* "Imagine" prompt — appears after all badges visible */}
                  {visibleResults >= DEMO_ANALYSIS.length && (
                    <p className={`text-sm italic ${
                      isDark ? 'text-ember-500' : 'text-ember-600'
                    } animate-fade-in`}>
                      This took 2 seconds. Imagine what it does with your sounds.
                    </p>
                  )}

                  <button
                    onClick={() => setStep(1)}
                    className={`w-full py-3 font-medium flex items-center justify-center gap-2 ${primaryBtnClass}`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button onClick={handleSkip} className={`text-sm ${dimmedClass} ${isDark ? 'hover:text-zinc-400' : 'hover:text-stone-500'}`}>
                Skip for now
              </button>
            </div>
          )}

          {/* Step 1: Personalize */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className={`text-xl font-bold mb-1 ${textClass}`}>Personalize Your Experience</h2>
                <p className={`text-sm ${mutedClass}`}>We'll tailor recommendations to your setup</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="onboarding-daw" className={`block text-sm font-medium mb-2 ${textClass}`}>
                    What DAW do you use?
                  </label>
                  <select
                    id="onboarding-daw"
                    value={dawPreference}
                    onChange={e => setDawPreference(e.target.value)}
                    className={`w-full px-4 py-3 border text-sm ${selectClass}`}
                  >
                    {DAW_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="onboarding-skill" className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Skill Level
                  </label>
                  <select
                    id="onboarding-skill"
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value)}
                    className={`w-full px-4 py-3 border text-sm ${selectClass}`}
                  >
                    {SKILL_LEVELS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className={`text-xs text-center ${dimmedClass}`}>Optional — you can change these in Settings anytime</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className={`px-4 py-3 font-medium flex items-center gap-1 ${secondaryBtnClass}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 ${primaryBtnClass}`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <button onClick={handleSkip} className={`text-sm ${dimmedClass} ${isDark ? 'hover:text-zinc-400' : 'hover:text-stone-500'}`}>
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Get Started */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className={`text-xl font-bold mb-1 ${textClass}`}>Ready to analyze your first sound?</h2>
                <p className={`text-sm ${mutedClass}`}>Choose how you'd like to start</p>
              </div>

              {/* Two option cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleComplete('/analyze')}
                  className={`p-5 border rounded-lg text-left transition-all group ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 hover:border-white'
                      : 'bg-stone-50 border-stone-200 hover:border-ember-600 hover:shadow-lg hover:shadow-ember-500/10'
                  }`}
                >
                  <div className={`p-2 w-fit rounded-md mb-3 ${
                    isDark ? 'bg-zinc-900' : 'bg-ember-600'
                  }`}>
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <h3 className={`font-bold text-sm mb-1 ${textClass}`}>Upload a Sound</h3>
                  <p className={`text-xs ${mutedClass}`}>Analyze any audio file and get synth settings</p>
                </button>

                <button
                  onClick={() => handleComplete('/discover')}
                  className={`p-5 border rounded-lg text-left transition-all group ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 hover:border-white'
                      : 'bg-stone-50 border-stone-200 hover:border-ember-600 hover:shadow-lg hover:shadow-ember-500/10'
                  }`}
                >
                  <div className={`p-2 w-fit rounded-md mb-3 ${
                    isDark ? 'bg-zinc-900' : 'bg-ember-600'
                  }`}>
                    <Compass className="w-5 h-5 text-white" />
                  </div>
                  <h3 className={`font-bold text-sm mb-1 ${textClass}`}>Browse Sound Sauces</h3>
                  <p className={`text-xs ${mutedClass}`}>Explore community recipes and presets</p>
                </button>
              </div>

              <p className={`text-xs text-center ${badgeText}`}>
                <Music className="w-3 h-3 inline mr-1" />
                You have 10 free analyses this month
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className={`px-4 py-3 font-medium flex items-center gap-1 ${secondaryBtnClass}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => handleComplete(null)}
                  className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 ${primaryBtnClass}`}
                >
                  Let's Go
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
