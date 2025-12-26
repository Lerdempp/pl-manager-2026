import { Team, SponsorshipType, SponsorshipCategory, SponsorshipOffer } from '../types';

export const generateSponsorshipOffers = (
  type: SponsorshipType,
  category: SponsorshipCategory,
  team: Team,
  currentWeek: number
): SponsorshipOffer[] => {
  const offers: SponsorshipOffer[] = [];
  const stadiumCapacity = team.stadiumCapacity || 30000;
  
  // Determine tier based on stadium capacity
  let tier = 1;
  if (stadiumCapacity >= 100000) tier = 6;
  else if (stadiumCapacity >= 90000) tier = 5;
  else if (stadiumCapacity >= 70000) tier = 4;
  else if (stadiumCapacity >= 50000) tier = 3;
  else if (stadiumCapacity >= 30000) tier = 2;

  // Sponsor company names by tier and category
  const sponsorCompaniesByCategory: { [key: string]: { [key: number]: string[] } } = {
    stadium: {
      1: ['RapidSport Group', 'NobleHealth Co', 'FutureFinance Labs', 'QuickTech Solutions'],
      2: ['QuantumTech Capital', 'ClearData Analytics', 'PulseMed Group', 'SkyNet Finance'],
      3: ['BrightAI Capital', 'NeuroSport Labs', 'Skyline Finance', 'GlobalFit Tech'],
      4: ['ElitePartners Inc', 'PremierBrands Co', 'ChampionGroup Ltd', 'ApexCorp Solutions'],
      5: ['Adidas', 'Red Bull', 'Spotify', 'Nike'],
      6: ['Emirates', 'Coca-Cola', 'Amazon', 'Etihad', 'Heineken', 'Puma'],
    },
    jersey: {
      1: ['SwiftWear Co', 'PrimeTextile Group', 'AthleticGear Ltd', 'FitWear Solutions'],
      2: ['ProSports Apparel', 'EliteFabric Inc', 'ChampionWear Co', 'SportStyle Group'],
      3: ['Nike', 'Adidas', 'Puma', 'New Balance'],
      4: ['Nike', 'Adidas', 'Puma', 'New Balance'],
      5: ['Nike', 'Adidas', 'Puma', 'New Balance'],
      6: ['Nike', 'Adidas', 'Puma', 'New Balance'],
    },
    matchday: {
      1: ['LocalBeverage Co', 'CityFood Group', 'CommunityMart Ltd', 'NeighborhoodShop'],
      2: ['RegionalBrands Inc', 'MetroServices Co', 'UrbanPartners Group', 'CityCommerce Ltd'],
      3: ['Pepsi', 'Coca-Cola', 'Heineken', 'Carlsberg'],
      4: ['Pepsi', 'Coca-Cola', 'Heineken', 'Carlsberg'],
      5: ['Pepsi', 'Coca-Cola', 'Heineken', 'Carlsberg'],
      6: ['Pepsi', 'Coca-Cola', 'Heineken', 'Carlsberg'],
    },
    digital: {
      1: ['TechStart Labs', 'DigitalSolutions Co', 'CloudServices Group', 'WebPlatform Inc'],
      2: ['DataStream Tech', 'CyberMedia Group', 'NetworkServices Ltd', 'DigitalPartners Co'],
      3: ['Google', 'Microsoft', 'Apple', 'Amazon'],
      4: ['Google', 'Microsoft', 'Apple', 'Amazon'],
      5: ['Google', 'Microsoft', 'Apple', 'Amazon'],
      6: ['Google', 'Microsoft', 'Apple', 'Amazon'],
    },
  };

  // Get companies for this category and tier
  const categoryCompanies = sponsorCompaniesByCategory[category] || sponsorCompaniesByCategory.stadium;
  const companies = categoryCompanies[tier] || categoryCompanies[1] || sponsorCompaniesByCategory.stadium[1];
  
  // Create a unique seed for this specific sponsorship type to ensure different companies
  const typeSeed = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const weekSeed = currentWeek;
  const uniqueSeed = typeSeed + weekSeed + team.id.length;
  
  // Shuffle companies based on unique seed for this type
  const shuffledCompanies = [...companies].sort((a, b) => {
    const hashA = (a + uniqueSeed + type).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashB = (b + uniqueSeed + type).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hashA % 100) - (hashB % 100);
  });
  
  // Select 4 unique companies, cycling through if needed
  const selectedCompanies: string[] = [];
  const usedCompanies = new Set<string>();
  
  for (let i = 0; i < 4; i++) {
    let sponsorCompany = '';
    
    // Try to find an unused company
    for (let j = 0; j < shuffledCompanies.length; j++) {
      const index = (i * 2 + j + uniqueSeed) % shuffledCompanies.length;
      const candidate = shuffledCompanies[index];
      if (!usedCompanies.has(candidate)) {
        sponsorCompany = candidate;
        usedCompanies.add(candidate);
        break;
      }
    }
    
    // If we couldn't find an unused one, cycle through with offset
    if (!sponsorCompany) {
      const index = (i + uniqueSeed) % shuffledCompanies.length;
      sponsorCompany = shuffledCompanies[index];
    }
    
    selectedCompanies.push(sponsorCompany);
  }
  
  // Generate 4 offers with the selected unique companies
  for (let i = 0; i < 4; i++) {
    const sponsorCompany = selectedCompanies[i];
    
    // Calculate annual payment based on tier and capacity
    const basePayment = tier * 1500000;
    const capacityMultiplier = stadiumCapacity / 10000;
    const paymentVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% variation
    const annualPayment = Math.floor(basePayment * capacityMultiplier * paymentVariation * 0.1); // Reduced to 10% of original
    
    // Contract duration: 2-5 years
    const contractDuration = 2 + Math.floor(Math.random() * 4);
    
    // Offer expires in 4-6 weeks
    const expiryWeek = currentWeek + 4 + Math.floor(Math.random() * 3);
    
    offers.push({
      id: `sponsor-${type}-${team.id}-${currentWeek}-${i}-${Date.now()}`,
      type,
      category,
      sponsorCompany,
      annualPayment,
      contractDuration,
      offerWeek: currentWeek,
      expiryWeek,
      tier
    });
  }
  
  return offers;
};

