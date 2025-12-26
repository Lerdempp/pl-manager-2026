export const formatCurrency = (value: number, language: 'en' | 'tr' = 'en') =>
  new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export const translateNotificationMessage = (en: string, tr: string, language: 'en' | 'tr') => 
  (language === 'tr' ? tr : en);

export const formatOfferRoundLabel = (round: number, t: (key: string) => string) => {
  if (round === 0) return t('initialOffer');
  return t('roundLabel', { round: round.toString() });
};

export const formatHistoryNote = (note: string | undefined, t: (key: string) => string) => {
  if (!note) return '';
  const noteKeyMap: Record<string, string> = {
    'Initial offer': 'historyNoteInitial',
    'Counter offer': 'historyNoteCounter',
    'Accepted counter offer': 'historyNoteAccepted',
    'Offer rejected': 'historyNoteRejected'
  };
  const key = noteKeyMap[note];
  return key ? t(key) : note;
};

