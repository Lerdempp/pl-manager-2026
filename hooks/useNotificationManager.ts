import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MailItem, NotificationPayload, ViewState } from '../types';

const NOTIFICATION_DEDUPE_WINDOW_MS = 4000;
const MAILBOX_DEDUPE_WINDOW_MS = 6000;

const normalizeMessage = (message: string) =>
  message
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const notificationsMatch = (a: NotificationPayload, b: NotificationPayload) =>
  a.type === b.type &&
  normalizeMessage(a.message) === normalizeMessage(b.message);

const buildNotificationKey = (payload: NotificationPayload) =>
  `${payload.type}-${normalizeMessage(payload.message)}`;

type UseNotificationManagerArgs = {
  currentWeek: number;
  viewState: ViewState;
  onNavigateToMailbox: () => void;
};

export const useNotificationManager = ({
  currentWeek,
  viewState,
  onNavigateToMailbox
}: UseNotificationManagerArgs) => {
  const [notification, setNotificationState] = useState<NotificationPayload | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<NotificationPayload[]>([]);
  const recentNotificationTimesRef = useRef<Record<string, number>>({});
  const mailboxDedupMapRef = useRef<Record<string, number>>({});
  const [mailbox, setMailbox] = useState<MailItem[]>([]);

  const setNotification = useCallback(
    (payload: NotificationPayload | null) => {
      if (payload === null) {
        setNotificationState(null);
        return;
      }

      if (notification && notificationsMatch(notification, payload)) {
        return;
      }

      if (notificationQueue.some(note => notificationsMatch(note, payload))) {
        return;
      }

      const now = Date.now();
      const key = buildNotificationKey(payload);
      const lastTime = recentNotificationTimesRef.current[key];
      if (lastTime && now - lastTime < NOTIFICATION_DEDUPE_WINDOW_MS) {
        return;
      }
      recentNotificationTimesRef.current[key] = now;

      setNotificationState(prev => {
        if (prev) {
          setNotificationQueue(queue => [...queue, payload]);
          return prev;
        }
        return payload;
      });
    },
    [notification, notificationQueue]
  );

  useEffect(() => {
    if (!notification && notificationQueue.length > 0) {
      const [next, ...rest] = notificationQueue;
      setNotificationState(next);
      setNotificationQueue(rest);
    }
  }, [notification, notificationQueue]);

  useEffect(() => {
    if (!notification) return;

    const now = Date.now();
    const key = buildNotificationKey(notification);
    const lastTime = mailboxDedupMapRef.current[key];
    if (lastTime && now - lastTime < MAILBOX_DEDUPE_WINDOW_MS) {
      return;
    }
    mailboxDedupMapRef.current[key] = now;

    const entry: MailItem = {
      id: `mail-${now}-${Math.random()}`,
      message: notification.message,
      type: notification.type,
      timestamp: now,
      week: currentWeek,
      source: notification.source,
      relatedPlayerId: notification.relatedPlayerId,
      read: viewState === ViewState.MAILBOX
    };
    setMailbox(prev => [entry, ...prev].slice(0, 200));
  }, [notification, currentWeek, viewState]);

  const unreadMailCount = useMemo(() => mailbox.filter(mail => !mail.read).length, [mailbox]);

  const handleMarkAllMailRead = useCallback(() => {
    setMailbox(prev => prev.map(mail => (mail.read ? mail : { ...mail, read: true })));
  }, []);

  const handleClearMailbox = useCallback(() => {
    setMailbox([]);
  }, []);

  const handleDeleteMail = useCallback((id: string) => {
    setMailbox(prev => prev.filter(mail => mail.id !== id));
  }, []);

  const handleToggleMailRead = useCallback((id: string) => {
    setMailbox(prev => prev.map(mail => (mail.id === id ? { ...mail, read: !mail.read } : mail)));
  }, []);

  const handleNotificationToastClick = useCallback(() => {
    setNotification(null);
    onNavigateToMailbox();
  }, [onNavigateToMailbox, setNotification]);

  const hydrateMailbox = useCallback((items: MailItem[]) => {
    setMailbox(items);
  }, []);

  useEffect(() => {
    if (viewState !== ViewState.MAILBOX) return;
    setMailbox(prev => prev.map(mail => (mail.read ? mail : { ...mail, read: true })));
  }, [viewState]);

  return {
    notification,
    mailbox,
    unreadMailCount,
    handleMarkAllMailRead,
    handleClearMailbox,
    handleDeleteMail,
    handleToggleMailRead,
    handleNotificationToastClick,
    hydrateMailbox,
    setNotification
  };
};

