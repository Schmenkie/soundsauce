import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageSquare, UserPlus, RefreshCw, Award, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, usePageTitle } from '../hooks';
import { AuthModal } from '../components/auth';
import { NotificationSkeleton } from '../components/ui/Skeleton';

const TYPE_CONFIG = {
  recipe_liked: { icon: Heart, verb: 'liked your Sound Sauce', color: 'text-red-400', tab: 'likes' },
  recipe_commented: { icon: MessageSquare, verb: 'commented on', color: 'text-blue-400', tab: 'comments' },
  comment_replied: { icon: MessageSquare, verb: 'replied to your comment on', color: 'text-blue-400', tab: 'comments' },
  user_followed: { icon: UserPlus, verb: 'started following you', color: 'text-green-400', tab: 'followers' },
  recreation_submitted: { icon: RefreshCw, verb: 'recreated', color: 'text-purple-400', tab: 'comments' },
  badge_earned: { icon: Award, verb: 'Badge earned:', color: 'text-yellow-400', tab: 'likes' },
  challenge_submission: { icon: RefreshCw, verb: 'submitted to your challenge', color: 'text-orange-400', tab: 'comments' },
};

// Filter out message notifications — they have their own dedicated inbox
const EXCLUDED_TYPES = new Set(['new_message']);

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'likes', label: 'Likes', icon: Heart },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'followers', label: 'Followers', icon: UserPlus },
];

function getRelativeTime(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function groupNotifications(notifications) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const groups = { today: [], thisWeek: [], earlier: [] };

  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (date >= startOfToday) {
      groups.today.push(n);
    } else if (date >= startOfWeek) {
      groups.thisWeek.push(n);
    } else {
      groups.earlier.push(n);
    }
  }

  return groups;
}

/**
 * Notifications page - View and manage notifications
 * Shows sign-in prompt for guests, grouped notification list for authenticated users
 */
export function Notifications({ theme, t }) {
  const { user, loading: authLoading } = useAuth();
  usePageTitle('Notifications');
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filter out message notifications (they have their own inbox) and apply tab filter
  const filteredNotifications = notifications.filter(n => {
    if (EXCLUDED_TYPES.has(n.type)) return false;
    if (activeTab === 'all') return true;
    const config = TYPE_CONFIG[n.type];
    return config?.tab === activeTab;
  });

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to relevant page
    switch (notification.type) {
      case 'recipe_liked':
      case 'recipe_commented':
      case 'comment_replied':
      case 'recreation_submitted':
        if (notification.reference_id) {
          navigate(`/recipe/${notification.reference_id}`);
        }
        break;
      case 'user_followed':
        if (notification.actor?.username) {
          navigate(`/user/${notification.actor.username}`);
        }
        break;
      case 'badge_earned':
        navigate('/profile');
        break;
      case 'challenge_submission':
        if (notification.reference_id) {
          navigate(`/challenge/${notification.reference_id}`);
        }
        break;
      default:
        break;
    }
  };

  // Guest view
  if (!authLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Notifications</h1>
          <p className={t.textMuted}>Stay up to date with your activity</p>
        </div>

        <div className={`p-8 border rounded-lg ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-stone-200'
        }`}>
          <div className="text-center">
            <Bell className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
            <h2 className={`text-xl font-bold mb-2 ${t.text}`}>Sign in to view notifications</h2>
            <p className={`mb-6 ${t.textMuted}`}>
              Get notified when someone likes, comments on, or recreates your Sound Sauces.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`px-6 py-3 font-medium rounded-md ${
                theme === 'dark'
                  ? 'bg-white text-black hover:bg-stone-200'
                  : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
              }`}
            >
              Sign In / Create Account
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          theme={theme}
        />
      </div>
    );
  }

  // Loading state — skeleton notification rows
  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Notifications</h1>
        </div>
        <div className={`border rounded-lg overflow-hidden divide-y ${
          theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800 divide-zinc-800' : 'bg-white border-stone-200 divide-stone-100'
        }`}>
          {[1, 2, 3, 4, 5].map(i => (
            <NotificationSkeleton key={i} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  const groups = groupNotifications(filteredNotifications);

  // Count unread per tab (excluding message notifications)
  const nonMessageNotifications = notifications.filter(n => !EXCLUDED_TYPES.has(n.type));
  const tabUnreadCounts = {
    all: nonMessageNotifications.filter(n => !n.is_read).length,
    likes: nonMessageNotifications.filter(n => !n.is_read && TYPE_CONFIG[n.type]?.tab === 'likes').length,
    comments: nonMessageNotifications.filter(n => !n.is_read && TYPE_CONFIG[n.type]?.tab === 'comments').length,
    followers: nonMessageNotifications.filter(n => !n.is_read && TYPE_CONFIG[n.type]?.tab === 'followers').length,
  };

  const accentBorder = theme === 'dark' ? 'border-l-ember-500' : 'border-l-ember-600';

  const renderNotification = (notification) => {
    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.recipe_liked;
    const TypeIcon = config.icon;
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Someone';
    const actorAvatar = notification.actor?.avatar_url;

    // Build the message text
    let messageText;
    if (notification.type === 'user_followed') {
      messageText = config.verb;
    } else if (notification.type === 'badge_earned') {
      messageText = `${config.verb} ${notification.reference_title || ''}`;
    } else {
      messageText = notification.reference_title
        ? `${config.verb} "${notification.reference_title}"`
        : config.verb;
    }

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors rounded-lg border-l-2 ${
          notification.is_read
            ? `border-l-transparent ${
                theme === 'dark'
                  ? 'hover:bg-zinc-900'
                  : 'hover:bg-amber-50/50'
              }`
            : `${accentBorder} ${
                theme === 'dark'
                  ? 'bg-zinc-900 hover:bg-zinc-800'
                  : 'bg-amber-50/50 hover:bg-amber-50'
              }`
        }`}
      >
        {/* Type icon */}
        <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Actor avatar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (notification.actor?.username) {
                  navigate(`/user/${notification.actor.username}`);
                }
              }}
              className="flex-shrink-0"
            >
              {actorAvatar ? (
                <img
                  src={actorAvatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                }`}>
                  {actorName[0].toUpperCase()}
                </div>
              )}
            </button>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.text}`}>
                <span className="font-medium">{actorName}</span>{' '}
                <span className={notification.is_read ? t.textMuted : ''}>{messageText}</span>
              </p>
              <p className={`text-xs mt-0.5 ${t.textDimmed}`}>
                {getRelativeTime(notification.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notification.id);
              }}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  : 'text-stone-400 hover:text-ember-600 hover:bg-amber-50'
              }`}
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification(notification.id);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'dark'
                ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'
                : 'text-stone-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title="Delete notification"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 px-1 ${t.textDimmed}`}>
          {label}
        </h3>
        <div className={`border rounded-lg overflow-hidden divide-y ${
          theme === 'dark'
            ? 'bg-zinc-900/50 border-zinc-800 divide-zinc-800'
            : 'bg-white border-stone-200 divide-stone-100'
        }`}>
          {items.map(renderNotification)}
        </div>
      </div>
    );
  };

  // Authenticated view
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className={`text-3xl font-bold ${t.text}`}>Notifications</h1>
          {tabUnreadCounts.all > 0 && (
            <p className={`text-sm mt-1 ${t.textMuted}`}>
              {tabUnreadCounts.all} unread notification{tabUnreadCounts.all !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tabUnreadCounts.all > 0 && (
            <button
              onClick={markAllAsRead}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  : 'text-stone-500 hover:text-ember-600 hover:bg-amber-50/50'
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className={`flex border-b mb-4 ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? theme === 'dark'
                  ? 'border-white text-white'
                  : 'border-ember-600 text-ember-600'
                : `border-transparent ${
                    theme === 'dark'
                      ? 'text-zinc-500 hover:text-white'
                      : 'text-stone-400 hover:text-stone-900'
                  }`
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tabUnreadCounts[tab.key] > 0 && (
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full px-1 ${
                theme === 'dark' ? 'bg-ember-500 text-white' : 'bg-ember-600 text-white'
              }`}>
                {tabUnreadCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredNotifications.length === 0 ? (
        <div className={`p-12 border rounded-lg text-center ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-stone-200'
        }`}>
          <Bell className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
          <h2 className={`text-lg font-bold mb-2 ${t.text}`}>
            {activeTab === 'all' ? 'No notifications yet' : `No ${activeTab} yet`}
          </h2>
          <p className={t.textMuted}>
            {activeTab === 'all'
              ? 'When someone likes, comments on, or recreates your Sound Sauces, you\'ll see it here.'
              : activeTab === 'likes'
                ? 'When someone likes your Sound Sauces or you earn a badge, it\'ll show up here.'
                : activeTab === 'comments'
                  ? 'When someone comments on or recreates your Sound Sauces, it\'ll show up here.'
                  : 'When someone follows you, it\'ll show up here.'
            }
          </p>
        </div>
      ) : (
        <>
          {renderGroup('Today', groups.today)}
          {renderGroup('This Week', groups.thisWeek)}
          {renderGroup('Earlier', groups.earlier)}
        </>
      )}
    </div>
  );
}
