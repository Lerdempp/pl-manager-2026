import { StadiumSponsorOffer } from '../types';

export const generateSponsorOffer = (
  stadiumCapacity: number,
  currentWeek: number,
  teamId: string
): StadiumSponsorOffer | null => {
  // Determine sponsor tier based on stadium capacity
  let tier = 1;
  if (stadiumCapacity >= 100000) tier = 6;
  else if (stadiumCapacity >= 90000) tier = 5;
  else if (stadiumCapacity >= 70000) tier = 4;
  else if (stadiumCapacity >= 50000) tier = 3;
  else if (stadiumCapacity >= 30000) tier = 2;

  // Sponsor names by tier
  const sponsorNames: { [key: number]: string[] } = {
    1: ['RapidSport', 'NobleHealth', 'FutureFinance'],
    2: ['QuantumTech', 'ClearData', 'PulseMed'],
    3: ['BrightAI', 'NeuroSport', 'Skyline'],
    4: ['GlobalFit', 'ElitePartners', 'PremierBrands'],
    5: ['Adidas', 'Red Bull', 'Spotify'],
    6: ['Emirates', 'Coca-Cola', 'Amazon', 'Etihad', 'Heineken']
  };

  const names = sponsorNames[tier] || sponsorNames[1];
  const sponsorName = names[Math.floor(Math.random() * names.length)];

  // Calculate annual payment based on tier and capacity
  const basePayment = tier * 2000000; // Base payment per tier
  const capacityMultiplier = stadiumCapacity / 10000; // Multiplier based on capacity
  const annualPayment = Math.floor(basePayment * capacityMultiplier * 0.1); // Reduced to 10% of original

  // Contract duration: 2-5 years
  const contractDuration = 2 + Math.floor(Math.random() * 4);

  // Offer expires in 4-6 weeks
  const expiryWeek = currentWeek + 4 + Math.floor(Math.random() * 3);

  return {
    id: `stadium-sponsor-${teamId}-${currentWeek}-${Date.now()}`,
    sponsorName,
    sponsorCompany: `${sponsorName} Group`,
    annualPayment,
    contractDuration,
    offerWeek: currentWeek,
    expiryWeek,
    tier
  };
};

export const isSponsorOfferExpired = (offer: StadiumSponsorOffer, currentWeek: number): boolean => {
  return currentWeek > offer.expiryWeek;
};

