import React from 'react';
import { MailItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MailViewProps {
  mail: MailItem[];
  onBack: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
  onToggleRead: (id: string) => void;
}

const typeColors: Record<MailItem['type'], string> = {
  success: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40',
  error: 'text-rose-300 bg-rose-500/10 border-rose-500/40',
  info: 'text-blue-300 bg-blue-500/10 border-blue-500/40'
};

export const MailView: React.FC<MailViewProps> = ({
  mail,
  onBack,
  onMarkAllRead,
  onClearAll,
  onDelete,
  onToggleRead
}) => {
  const { t } = useLanguage();
  const hasMail = mail.length > 0;

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto p-3 md:p-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white">{t('mailboxTitle') || 'Inbox'}</h1>
          <p className="text-zinc-400 text-sm md:text-base">
            {hasMail ? `${mail.filter(m => !m.read).length} ${t('unread') || 'unread'}` : t('noMessages') || 'No messages yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onMarkAllRead}
            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-100 text-xs md:text-sm font-bold rounded-lg border border-emerald-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasMail}
          >
            {t('markAllRead') || 'Mark all read'}
          </button>
          <button
            onClick={onClearAll}
            className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-100 text-xs md:text-sm font-bold rounded-lg border border-rose-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasMail}
          >
            {t('clearAll') || 'Clear all'}
          </button>
          <button
            onClick={onBack}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs md:text-sm font-bold rounded-lg border border-white/10 transition-all"
          >
            {t('back') || 'Back'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        {hasMail ? (
          <div className="h-full overflow-y-auto divide-y divide-white/5">
            {mail.map(item => (
              <div
                key={item.id}
                className={`p-4 md:p-6 flex flex-col gap-3 transition-all ${item.read ? 'bg-transparent' : 'bg-white/5'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${typeColors[item.type]}`}>
                      {item.type.toUpperCase()}
                    </span>
                    {item.source && (
                      <span className="text-xs text-zinc-400 uppercase tracking-widest">
                        {item.source}
                      </span>
                    )}
                    {item.week && (
                      <span className="text-xs text-yellow-300 uppercase tracking-widest">
                        {t('week') || 'Week'} {item.week}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRead(item.id)}
                      className="text-xs text-blue-300 hover:text-blue-200"
                    >
                      {item.read ? (t('markUnread') || 'Mark unread') : (t('markRead') || 'Mark read')}
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      {t('delete') || 'Delete'}
                    </button>
                  </div>
                </div>
                <div className="text-white text-base font-semibold">
                  {item.message}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
            <div className="text-5xl">📬</div>
            <div className="text-white text-lg font-bold">{t('mailboxEmptyTitle') || 'Quiet mailbox'}</div>
            <div className="text-zinc-400 text-sm max-w-md">
              {t('mailboxEmptyDescription') || 'All important updates, transfer results, and negotiations will appear here.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

