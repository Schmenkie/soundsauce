import { useState } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Save, Lock, Unlock, HardDrive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks';
import { LabSignIn } from '../components/auth';

const DAW_OPTIONS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Bitwig', 'Reaper', 'Pro Tools', 'Other'];

/**
 * Settings — theme, DAW, default artist name for stem filenames, and the lab lock.
 * Everything here lives in localStorage (see AuthContext prefs); there is no account.
 */
export function Settings({ theme, t, onThemeToggle }) {
  usePageTitle('Settings');
  const { isSignedIn, signOut, prefs, updatePrefs } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  const isDark = theme === 'dark';
  const inputClass = `w-full px-4 py-3 rounded-md border outline-none focus:ring-2 text-sm ${
    isDark
      ? 'bg-zinc-950 border-zinc-700 text-zinc-50 focus:ring-ember-500/40'
      : 'bg-white border-stone-200 text-stone-900 focus:ring-ember-600/30'
  }`;
  const card = `p-6 border space-y-6 rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${t.text}`}>
          <SettingsIcon className="w-6 h-6" />
          Settings
        </h2>
      </div>

      {/* Preferences */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <Save className="w-5 h-5" />
          Preferences
        </h3>

        <div className={card}>
          {/* Theme */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textMuted}`}>Theme</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { if (theme !== 'dark') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  isDark ? 'bg-white text-black' : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => { if (theme !== 'light') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  theme === 'light' ? 'bg-ember-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
            </div>
          </div>

          {/* DAW */}
          <div>
            <label htmlFor="daw-preference" className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>DAW</label>
            <p className={`text-xs mb-2 ${t.textDimmed}`}>
              Recipes recommend plugins native to your DAW
            </p>
            <select
              id="daw-preference"
              value={prefs.dawPreference}
              onChange={(e) => updatePrefs({ dawPreference: e.target.value })}
              className={inputClass}
            >
              {DAW_OPTIONS.map((daw) => (
                <option key={daw} value={daw}>{daw}</option>
              ))}
            </select>
          </div>

          {/* Default artist name — used in stamped stem filenames when a track has no artist */}
          <div>
            <label htmlFor="artist-name" className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Your artist name</label>
            <p className={`text-xs mb-2 ${t.textDimmed}`}>
              Written into Vital preset metadata and Remix Pack notes
            </p>
            <input
              id="artist-name"
              type="text"
              value={prefs.artistName}
              onChange={(e) => updatePrefs({ artistName: e.target.value })}
              placeholder="e.g. Schmenk"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Lab access */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          {isSignedIn ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          Lab access
        </h3>
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-medium ${t.text}`}>
                {isSignedIn ? 'Unlocked' : 'Locked'}
              </p>
              <p className={`text-xs ${t.textDimmed}`}>
                Stem separation and uploads run on paid services and need the lab password.
              </p>
            </div>
            {isSignedIn ? (
              <button
                type="button"
                onClick={signOut}
                className={`px-4 py-2 text-sm font-medium rounded-md ${t.button}`}
              >
                Lock
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  isDark ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600' : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                Unlock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Storage note */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <HardDrive className="w-5 h-5" />
          Storage
        </h3>
        <div className={card}>
          <p className={`text-sm ${t.textMuted}`}>
            Kept stems live on Vercel Blob (1 GB on the Hobby plan). A two-stem FLAC grab is roughly 40–60 MB,
            so keep only the stems you'll come back to.
          </p>
        </div>
      </div>

      <LabSignIn isOpen={signInOpen} onClose={() => setSignInOpen(false)} theme={theme} />
    </div>
  );
}
