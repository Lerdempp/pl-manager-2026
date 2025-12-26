import React from 'react';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, onClick }) => {
  return (
    <div 
      key={`toast-${notification.message}-${notification.type}`}
      role="button"
      onClick={onClick}
      className={`fixed top-4 right-4 z-[200] px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md cursor-pointer ${
        notification.type === 'success' 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
          : notification.type === 'error'
          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
          : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
      } animate-in slide-in-from-right duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
        </div>
        <div className="font-bold text-sm">{notification.message}</div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-4 text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

