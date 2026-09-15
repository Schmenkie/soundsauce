import { useState } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Palette, Lock, Unlock, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle, useVault } from '../hooks';
import { LabSignIn } from '../components/auth';
import { describeStorage, formatMB } from '../lib/vault';

/**
 * Settings — theme, storage, and the lab lock. There is no account.
 */
export function Settings({ theme, t, onThemeToggle }) {
  usePageTitle('Settings');
  const { isSignedIn, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const vault = useVault();
  const storage = describeStorage(vault.storage);

  const isDark = theme === 'dark';
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
          <Palette className="w-5 h-5" />
          Theme
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
          {storage ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className={`font-mono text-sm ${t.text}`}>
                  {formatMB(storage.used)} <span className={t.textMuted}>of 1 GB used</span>
                </div>
                <div className={`font-mono text-[12px] ${t.textMuted}`}>
                  ~{storage.grabsLeft} more {storage.grabsLeft === 1 ? 'track fits' : 'tracks fit'} · {vault.tracks.length} in the vault · {storage.blobCount} files
                </div>
              </div>
              <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-[#14171C]' : 'bg-[#E1E5EA]'}`}>
                <div className="h-full bg-spectrum transition-all" style={{ width: `${storage.usedPct}%` }} />
              </div>
            </div>
          ) : (
            <p className={`font-mono text-[12px] ${t.textMuted}`}>
              {isSignedIn ? 'Loading storage…' : 'Unlock the lab to see storage.'}
            </p>
          )}
          <p className={`text-sm ${t.textMuted}`}>
            Kept stems live on Vercel Blob (1 GB on the Hobby plan). A two-stem FLAC grab is roughly 55 MB, so
            keep only the stems you'll come back to — deleting a track in the{' '}
            <Link to="/vault" className="underline">Vault</Link> frees its space.
          </p>
        </div>
      </div>

      <LabSignIn isOpen={signInOpen} onClose={() => setSignInOpen(false)} theme={theme} />
    </div>
  );
}
