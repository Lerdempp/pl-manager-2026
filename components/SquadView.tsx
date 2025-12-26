
import React, { useRef, useState, useEffect } from 'react';
import { Team, Player, GameState, Position } from '../types';
import { TacticsBoard } from './TacticsBoard';
import { useLanguage } from '../contexts/LanguageContext';
import { getTraitRarity, getTraitName, getTraitDescription, TraitRarity } from '../services/playerTraits';
import { calculateAttendance, calculateUpgradeCost, calculateUpgradeWeeks, updateMoraleFromPrices, calculatePriceMoraleChange } from '../services/fanSystem';
import { getCaptain, selectCaptain } from '../services/captainService';

interface PortfolioViewProps {
  team: Team;
  gameState: GameState;
  currentWeek?: number;
  onSell: (player: Player) => void;
  onGoToMarket: () => void;
  onBackToLeague?: () => void;
  onInspect?: (player: Player) => void;
  onOpenYouth?: () => void;
  onRenew?: (player: Player) => void;
  viewMode?: 'ROSTER' | 'FORMATION' | 'FINANCIAL';
  onUpdateTeam?: (team: Team) => void;
  fixtures?: any[]; // Fixtures array to calculate player stats
  teams?: Team[]; // Teams array to find player's team
  onOpenSponsorOffer?: (team: Team, offer: any) => void; // Callback to open sponsor offer modal
}

const PortfolioViewComponent: React.FC<PortfolioViewProps> = ({ team, gameState, currentWeek = 1, onSell, onGoToMarket, onBackToLeague, onInspect, onOpenYouth, onRenew, viewMode = 'ROSTER', onUpdateTeam, fixtures = [], teams = [], onOpenSponsorOffer }) => {
  const { t, translatePosition } = useLanguage();
  const financialReportRef = useRef<HTMLDivElement>(null);
  
  // Ensure captain is selected if missing
  useEffect(() => {
    if (team && team.players && team.players.length > 0 && onUpdateTeam) {
      // Check if captain exists and is valid
      const hasValidCaptain = team.captainId && team.players.find(p => p.id === team.captainId);
      if (!hasValidCaptain) {
        const captain = selectCaptain(team);
        if (captain) {
          const updatedTeam = { ...team, captainId: captain.id };
          onUpdateTeam(updatedTeam);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, team.players.length]);
  const [customStartingXI, setCustomStartingXI] = useState<string[]>([]);
  const [selectedFormation] = useState<string>(team.tactics?.formation || "4-3-3");
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ position: Position; slotIndex: number } | null>(null);
  const [showTraitTooltip, setShowTraitTooltip] = useState<string | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);

  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };
  
  const scrollToFinancialReport = () => {
    financialReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const squadValue = team.players.reduce((sum, p) => sum + p.trueValue, 0);
  
  const income = team.financials.income;
  const expenses = team.financials.expenses;
  
  // Calculate season total wages directly from players (weekly wage * 38 weeks)
  const weeklyWageTotal = team.players.reduce((acc, p) => acc + (p.contract?.wage || 0), 0);
  const seasonTotalWages = weeklyWageTotal * 38;
  
  // Calculate season total ticket revenue directly
  // Premier League: 19 home matches per season
  const homeMatchesPerSeason = 19;
  let seasonTotalTicketRevenue = 0;
  
  if (team.stadiumCapacity && team.fanCount && team.fanMorale !== undefined && 
      team.ticketPrice !== undefined && team.baseTicketPrice !== undefined) {
    // Calculate attendance for each home match based on current morale
    const attendancePerMatch = calculateAttendance(
      team.fanCount,
      team.fanMorale,
      team.ticketPrice,
      team.baseTicketPrice,
      team.stadiumCapacity
    );
    
    // Total revenue = attendance per match * ticket price * number of home matches
    seasonTotalTicketRevenue = attendancePerMatch * team.ticketPrice * homeMatchesPerSeason;
  }
  
  // Calculate current league position and projected prize money
  let projectedPrizeMoney = income.prizeMoney; // Default to current prize money
  if (teams && teams.length > 0) {
    const leagueTeams = teams.filter(t => t.league === team.league);
    const sortedTeams = [...leagueTeams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
      return b.gf - a.gf;
    });
    
    const currentRank = sortedTeams.findIndex(t => t.id === team.id) + 1;
    if (currentRank > 0) {
      const totalTeams = sortedTeams.length;
      // Calculate prize money based on current position (same formula as end of season)
      projectedPrizeMoney = 5000000 + ((totalTeams - currentRank) * 5000000);
    }
  }
  
  const totalIncome = seasonTotalTicketRevenue + income.sponsors + projectedPrizeMoney;
  const totalExpenses = seasonTotalWages + expenses.facilities;
  const netProfit = totalIncome - totalExpenses;

  const getPosColor = (pos: Position) => {
      if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(pos)) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      if ([Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(pos)) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  // Parse formation string
  const parseFormation = (form: string): { def: number; mid: number; fwd: number } => {
      const parts = form.split('-').map(Number);
      if (parts.length === 3) {
          return { def: parts[0], mid: parts[1], fwd: parts[2] };
      } else if (parts.length === 4) {
          return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
      }
      return { def: 4, mid: 3, fwd: 3 };
  };

  // Calculate Best XI for display based on team's formation
  const getStartingXI = () => {
      const formation = selectedFormation;
      const { def: defCount, mid: midCount, fwd: fwdCount } = parseFormation(formation);
      
      // Filter out unavailable players (suspended, injured, or ill)
      const availablePlayers = team.players.filter(p => 
          (!p.suspensionGames || p.suspensionGames === 0) &&
          !p.injury &&
          !p.illness
      );
      
      const sorted = [...availablePlayers].sort((a, b) => b.rating - a.rating);
      
      // Helper functions
      const isGK = (p: Player) => p.position === Position.GK;
      const isDef = (p: Player) => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(p.position);
      const isMid = (p: Player) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position);
      const isFwd = (p: Player) => [Position.ST, Position.CF, Position.RW, Position.LW].includes(p.position);
      
      // Get best players for each position
      const gk = sorted.filter(isGK).slice(0, 1);
      const def = sorted.filter(isDef).slice(0, defCount);
      const mid = sorted.filter(isMid).slice(0, midCount);
      
      // Forward selection: prioritize specific positions (LW, ST, RW)
      const lwPlayers = sorted.filter(p => p.position === Position.LW);
      const stPlayers = sorted.filter(p => [Position.ST, Position.CF].includes(p.position)).sort((a, b) => b.rating - a.rating);
      const rwPlayers = sorted.filter(p => p.position === Position.RW);
      
      const fwdUsedIds = new Set<string>();
      const fwd: Player[] = [];
      
      // Select forwards based on formation requirements
      if (fwdCount >= 3) {
          // 3 forwards: LW, ST, RW
          if (lwPlayers.length > 0 && !fwdUsedIds.has(lwPlayers[0].id)) {
              fwd.push(lwPlayers[0]);
              fwdUsedIds.add(lwPlayers[0].id);
          }
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
          if (rwPlayers.length > 0 && !fwdUsedIds.has(rwPlayers[0].id)) {
              fwd.push(rwPlayers[0]);
              fwdUsedIds.add(rwPlayers[0].id);
          }
      } else if (fwdCount === 2) {
          // 2 forwards: ST, then best wing
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
          const wings = [...lwPlayers, ...rwPlayers].filter(p => !fwdUsedIds.has(p.id));
          if (wings.length > 0) {
              fwd.push(wings[0]);
              fwdUsedIds.add(wings[0].id);
          }
      } else if (fwdCount === 1) {
          // 1 forward: ST
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
      }
      
      // Fill remaining forward slots
      while (fwd.length < fwdCount) {
          const remaining = sorted.filter(p => isFwd(p) && !fwdUsedIds.has(p.id));
          if (remaining.length > 0) {
              fwd.push(remaining[0]);
              fwdUsedIds.add(remaining[0].id);
          } else break;
      }

      // Combine all positions and remove duplicates
      const allSelected = [...gk, ...def, ...mid, ...fwd];
      const usedIds = new Set<string>();
      const xi: Player[] = [];
      
      allSelected.forEach(p => {
          if (!usedIds.has(p.id)) {
              usedIds.add(p.id);
              xi.push(p);
          }
      });
      
      // Fill if missing
      if (xi.length < 11) {
          const remaining = sorted.filter(p => !usedIds.has(p.id));
          xi.push(...remaining.slice(0, 11 - xi.length));
      }
      
      return xi;
  };

  const defaultStartingXI = getStartingXI();
  
  // Initialize custom starting XI if not set or when formation changes
  useEffect(() => {
    const defaultIds = defaultStartingXI.map(p => p.id);
    if (defaultIds.length > 0) {
      setCustomStartingXI(defaultIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, selectedFormation]); // Reset when team or formation changes

  // Get current starting XI players
  // Use customStartingXI if it has players, otherwise use defaultStartingXI
  const sourceStartingXIIds = customStartingXI.length > 0 && customStartingXI.some(id => id && id !== '') 
    ? customStartingXI 
    : defaultStartingXI.map(p => p.id);
  
  // Debug: log defaultStartingXI to verify LW player is included
  if (sourceStartingXIIds === defaultStartingXI.map(p => p.id)) {
    const lwPlayer = defaultStartingXI.find(p => p.position === Position.LW);
    if (lwPlayer) {
      const lwIndex = defaultStartingXI.findIndex(p => p.id === lwPlayer.id);
      console.log(`[SquadView] LW player ${lwPlayer.name} found in defaultStartingXI at index ${lwIndex}, will be mapped to forward slot 0`);
    } else {
      console.warn('[SquadView] No LW player found in defaultStartingXI!', defaultStartingXI.map(p => ({ name: p.name, position: p.position })));
    }
  }
  
  // Map sourceStartingXIIds to players, preserving order and including all players (even if in wrong positions)
  // IMPORTANT: Include ALL players from sourceStartingXIIds, even if they appear multiple times or in wrong positions
  // Filter out unavailable players (suspended, injured, or ill)
  const startingXI = sourceStartingXIIds
    .map(id => id && id !== '' ? team.players.find(p => p.id === id) : undefined)
    .filter((p): p is Player => p !== undefined)
    .filter(p => 
        (!p.suspensionGames || p.suspensionGames === 0) &&
        !p.injury &&
        !p.illness
    );

  // finalStartingXI should include ALL players from sourceStartingXIIds, even if they're in wrong positions
  // This ensures that players in playerSlotMap are also in finalStartingXI
  // CRITICAL: If startingXI is empty, use defaultStartingXI directly
  const finalStartingXI = startingXI.length > 0 ? startingXI : defaultStartingXI;
  
  // Create playerSlotMap to preserve player positions
  // Use array index directly, but map to correct slot indices based on formation structure
  const playerSlotMap: { [playerId: string]: { position: Position; slotIndex: number } } = {};
  const formationStructure = parseFormation(selectedFormation);
  
  // Ensure sourceStartingXIIds is exactly 11 elements for playerSlotMap
  const normalizedStartingXI = [...sourceStartingXIIds];
  while (normalizedStartingXI.length < 11) {
    normalizedStartingXI.push('');
  }
  const finalStartingXIIds = normalizedStartingXI.slice(0, 11);
  
  finalStartingXIIds.forEach((playerId, arrayIndex) => {
    if (!playerId || playerId === '') return;
    const player = team.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Map array index to position and slotIndex based on formation structure
    // GK is always at index 0
    if (arrayIndex === 0) {
      playerSlotMap[playerId] = { position: Position.GK, slotIndex: 0 };
    } 
    // Defenders: indices 1 to formationStructure.def
    else if (arrayIndex >= 1 && arrayIndex <= formationStructure.def) {
      const defIndex = arrayIndex - 1;
      const positions = formationStructure.def === 3 ? [Position.CB, Position.CB, Position.CB] :
                       formationStructure.def === 4 ? [Position.LB, Position.CB, Position.CB, Position.RB] :
                       [Position.LB, Position.CB, Position.CB, Position.CB, Position.RB];
      const pos = positions[Math.min(defIndex, positions.length - 1)] || Position.CB;
      playerSlotMap[playerId] = { position: pos, slotIndex: defIndex };
    } 
    // Midfielders: indices (1 + def) to (1 + def + mid)
    else if (arrayIndex > formationStructure.def && arrayIndex <= 1 + formationStructure.def + formationStructure.mid) {
      const midIndex = arrayIndex - 1 - formationStructure.def;
      if (selectedFormation === "4-3-3" && formationStructure.mid === 3) {
        // Special handling for 4-3-3
        if (midIndex === 1) {
          playerSlotMap[playerId] = { position: Position.CDM, slotIndex: 1 };
        } else if (midIndex === 0) {
          playerSlotMap[playerId] = { position: Position.CM, slotIndex: 0 };
        } else if (midIndex === 2) {
          playerSlotMap[playerId] = { position: Position.CM, slotIndex: 2 };
        } else {
          playerSlotMap[playerId] = { position: Position.CM, slotIndex: midIndex };
        }
      } else {
        playerSlotMap[playerId] = { position: Position.CM, slotIndex: midIndex };
      }
    } 
    // Forwards: remaining indices
    else {
      const fwdIndex = arrayIndex - 1 - formationStructure.def - formationStructure.mid;
      const positions = formationStructure.fwd === 1 ? [Position.ST] :
                       formationStructure.fwd === 2 ? [Position.ST, Position.ST] :
                       [Position.LW, Position.ST, Position.RW];
      const pos = positions[Math.min(fwdIndex, positions.length - 1)] || Position.ST;
      playerSlotMap[playerId] = { position: pos, slotIndex: fwdIndex };
      // Debug log for LW players
      if (pos === Position.LW || player.position === Position.LW) {
        console.log(`[SquadView] Mapped player ${player.name} (${playerId}) at arrayIndex ${arrayIndex} to position ${pos} with slotIndex ${fwdIndex}. Player's actual position: ${player.position}`);
      }
    }
  });
  
  // Debug: log all LW entries in playerSlotMap
  const lwEntries = Object.keys(playerSlotMap).filter(id => playerSlotMap[id].position === Position.LW);
  if (lwEntries.length > 0) {
    console.log('[SquadView] LW entries in playerSlotMap:', lwEntries.map(id => ({ id, ...playerSlotMap[id] })));
  } else {
    console.log('[SquadView] No LW entries found in playerSlotMap. Total entries:', Object.keys(playerSlotMap).length);
    console.log('[SquadView] sourceStartingXIIds:', sourceStartingXIIds);
    console.log('[SquadView] finalStartingXIIds:', finalStartingXIIds);
    console.log('[SquadView] defaultStartingXI:', defaultStartingXI.map(p => ({ name: p.name, position: p.position })));
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, player: Player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop on starting XI
  const handleDropOnStartingXI = (e: React.DragEvent, targetPlayerId?: string) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    // Ensure array is exactly 11 elements
    let newStartingXI = [...customStartingXI];
    while (newStartingXI.length < 11) {
      newStartingXI.push('');
    }
    newStartingXI = newStartingXI.slice(0, 11);
    
    // Remove dragged player from starting XI if already exists (replace with empty string to preserve index)
    const draggedIndex = newStartingXI.indexOf(draggedPlayer.id);
    if (draggedIndex !== -1) {
      newStartingXI[draggedIndex] = '';
    }
    
    if (targetPlayerId) {
      // Replace specific player at target position
      const targetIndex = newStartingXI.indexOf(targetPlayerId);
      if (targetIndex !== -1) {
        newStartingXI[targetIndex] = draggedPlayer.id;
      } else {
        // Target not found, find first empty slot
        const emptyIndex = newStartingXI.findIndex(id => !id || id === '');
        if (emptyIndex !== -1) {
          newStartingXI[emptyIndex] = draggedPlayer.id;
        } else {
          // No empty slot, replace the last one
          newStartingXI[10] = draggedPlayer.id;
        }
      }
    } else {
      // No specific target, find first empty slot
      const emptyIndex = newStartingXI.findIndex(id => !id || id === '');
      if (emptyIndex !== -1) {
        newStartingXI[emptyIndex] = draggedPlayer.id;
      } else {
        // No empty slot, replace the last one
        newStartingXI[10] = draggedPlayer.id;
      }
    }
    
    setCustomStartingXI(newStartingXI);
    setDraggedPlayer(null);
  };

  // Remove player from starting XI (replace with empty string to preserve index)
  const handleRemoveFromStartingXI = (playerId: string) => {
    const newStartingXI = [...customStartingXI];
    const index = newStartingXI.indexOf(playerId);
    if (index !== -1) {
      newStartingXI[index] = '';
    }
    // Ensure array is exactly 11 elements
    while (newStartingXI.length < 11) {
      newStartingXI.push('');
    }
    setCustomStartingXI(newStartingXI.slice(0, 11));
  };

  // Get formation structure for empty slots (already defined above)
  const totalSlots = 1 + formationStructure.def + formationStructure.mid + formationStructure.fwd; // GK + def + mid + fwd

  // Get players not in starting XI (check for non-empty strings)
  const benchPlayers = team.players.filter(p => {
    const index = customStartingXI.indexOf(p.id);
    return index === -1 || customStartingXI[index] === '';
  });

  // Get players matching a specific position
  const getPlayersForPosition = (position: Position): Player[] => {
    // Helper to check if position matches
    const positionMatches = (playerPos: Position, targetPos: Position): boolean => {
      if (targetPos === Position.GK) return playerPos === Position.GK;
      if (targetPos === Position.LB || targetPos === Position.LWB) return [Position.LB, Position.LWB].includes(playerPos);
      if (targetPos === Position.RB || targetPos === Position.RWB) return [Position.RB, Position.RWB].includes(playerPos);
      if (targetPos === Position.CB) return playerPos === Position.CB;
      if (targetPos === Position.CDM) return playerPos === Position.CDM;
      if (targetPos === Position.CM) return [Position.CDM, Position.CM, Position.CAM].includes(playerPos);
      if (targetPos === Position.CAM) return [Position.CM, Position.CAM].includes(playerPos);
      if (targetPos === Position.LM) return [Position.LM, Position.LW].includes(playerPos);
      if (targetPos === Position.RM) return [Position.RM, Position.RW].includes(playerPos);
      if (targetPos === Position.LW) return [Position.LW, Position.LM].includes(playerPos);
      if (targetPos === Position.RW) return [Position.RW, Position.RM].includes(playerPos);
      if (targetPos === Position.ST || targetPos === Position.CF) return [Position.ST, Position.CF].includes(playerPos);
      return playerPos === targetPos;
    };

    return benchPlayers
      .filter(p => positionMatches(p.position, position))
      .sort((a, b) => b.rating - a.rating);
  };

  // Handle empty slot click
  const handleEmptySlotClick = (position: Position, slotIndex: number) => {
    setSelectedSlot({ position, slotIndex });
  };

  // Handle player selection from modal
  const handleSelectPlayerForSlot = (player: Player) => {
    if (!selectedSlot) return;

    // Ensure array is exactly 11 elements
    let newStartingXI = [...customStartingXI];
    while (newStartingXI.length < 11) {
      newStartingXI.push('');
    }
    newStartingXI = newStartingXI.slice(0, 11);
    
    // Remove player if already in starting XI (replace with empty string to preserve index)
    const existingIndex = newStartingXI.indexOf(player.id);
    if (existingIndex !== -1) {
      newStartingXI[existingIndex] = '';
    }

    // Find the slot in finalStartingXI that matches the selected position and slotIndex
    // We need to reconstruct the formation structure to find the exact slot
    const formationStructure = parseFormation(selectedFormation);
    
    // Build the formation structure as TacticsBoard does
    // GK is always first
    // Then defenders (formationStructure.def)
    // Then midfielders (formationStructure.mid) - but for 4-3-3, CDM is in the middle
    // Then forwards (formationStructure.fwd)
    
    // Create a map of position -> slot index in the formation
    const positionToSlotMap: { [key: string]: number } = {};
    let currentSlot = 0;
    
    // GK slot
    positionToSlotMap[`GK-0`] = currentSlot++;
    
    // Defender slots
    for (let i = 0; i < formationStructure.def; i++) {
      const positions = formationStructure.def === 3 ? [Position.CB, Position.CB, Position.CB] :
                       formationStructure.def === 4 ? [Position.LB, Position.CB, Position.CB, Position.RB] :
                       [Position.LB, Position.CB, Position.CB, Position.CB, Position.RB];
      const pos = positions[Math.min(i, positions.length - 1)] || Position.CB;
      positionToSlotMap[`${pos}-${i}`] = currentSlot++;
    }
    
    // Midfielder slots - special handling for 4-3-3
    if (selectedFormation === "4-3-3" && formationStructure.mid === 3) {
      // For 4-3-3: displaySquad.mid array is [CM, CDM, CM] (indices 0, 1, 2)
      // But TacticsBoard displays: top row [CM, null, CM] (indices 0, 2) and bottom row [null, CDM, null] (index 1)
      // When user clicks on a slot, slotIndex refers to the visual position in that row:
      // - Top row: slotIndex 0 = left CM (array index 0), slotIndex 2 = right CM (array index 2)
      // - Bottom row: slotIndex 1 = center CDM (array index 1)
      // But the actual array indices are: 0 (left CM), 1 (CDM), 2 (right CM)
      
      // Map visual positions to array indices
      // Top row CM positions (slotIndex 0 and 2 map to array indices 0 and 2)
      const leftCMSlot = 1 + formationStructure.def + 0; // Left CM (array index 0 in mid array)
      const cdmSlot = 1 + formationStructure.def + 1; // Center CDM (array index 1 in mid array)
      const rightCMSlot = 1 + formationStructure.def + 2; // Right CM (array index 2 in mid array)
      
      positionToSlotMap[`CM-0`] = leftCMSlot;
      positionToSlotMap[`CM-2`] = rightCMSlot;
      positionToSlotMap[`CAM-0`] = leftCMSlot;
      positionToSlotMap[`CAM-2`] = rightCMSlot;
      positionToSlotMap[`LM-0`] = leftCMSlot;
      positionToSlotMap[`RM-2`] = rightCMSlot;
      // Bottom row CDM position (slotIndex 1 maps to array index 1)
      positionToSlotMap[`CDM-1`] = cdmSlot;
      
      currentSlot = 1 + formationStructure.def + 3; // Update currentSlot to after midfield
    } else {
      // Normal midfield structure
      for (let i = 0; i < formationStructure.mid; i++) {
        const slotIndex = currentSlot++;
        positionToSlotMap[`CM-${i}`] = slotIndex;
        positionToSlotMap[`CAM-${i}`] = slotIndex;
        positionToSlotMap[`CDM-${i}`] = slotIndex;
        positionToSlotMap[`LM-${i}`] = slotIndex;
        positionToSlotMap[`RM-${i}`] = slotIndex;
      }
    }
    
    // Forward slots
    for (let i = 0; i < formationStructure.fwd; i++) {
      const positions = formationStructure.fwd === 1 ? [Position.ST] :
                       formationStructure.fwd === 2 ? [Position.ST, Position.ST] :
                       [Position.LW, Position.ST, Position.RW];
      const pos = positions[Math.min(i, positions.length - 1)] || Position.ST;
      const slotIndex = currentSlot++;
      positionToSlotMap[`${pos}-${i}`] = slotIndex;
      // Also map alternative positions (LM -> LW, RM -> RW, CF -> ST)
      if (pos === Position.LW) {
        positionToSlotMap[`${Position.LM}-${i}`] = slotIndex;
      } else if (pos === Position.RW) {
        positionToSlotMap[`${Position.RM}-${i}`] = slotIndex;
      } else if (pos === Position.ST) {
        positionToSlotMap[`${Position.CF}-${i}`] = slotIndex;
      }
    }
    
    // Find the target slot index
    const slotKey = `${selectedSlot.position}-${selectedSlot.slotIndex}`;
    let targetSlotIndex = positionToSlotMap[slotKey];
    
    // If not found, try alternative positions
    if (targetSlotIndex === undefined) {
      if (selectedSlot.position === Position.LM) {
        targetSlotIndex = positionToSlotMap[`${Position.LW}-${selectedSlot.slotIndex}`];
      } else if (selectedSlot.position === Position.RM) {
        targetSlotIndex = positionToSlotMap[`${Position.RW}-${selectedSlot.slotIndex}`];
      } else if (selectedSlot.position === Position.CF) {
        targetSlotIndex = positionToSlotMap[`${Position.ST}-${selectedSlot.slotIndex}`];
      }
    }
    
    if (targetSlotIndex !== undefined) {
      // Ensure array is exactly 11 elements (fill with empty strings if needed)
      while (newStartingXI.length < 11) {
        newStartingXI.push('');
      }
      
      // Insert player at target slot (keep array at 11 elements)
      newStartingXI[targetSlotIndex] = player.id;
      
      // Keep array at exactly 11 elements, don't filter out empty strings
      // Empty strings represent empty slots and should be preserved
      newStartingXI = newStartingXI.slice(0, 11);
    } else {
      // Fallback: find first empty slot or add to end
      let added = false;
      for (let i = 0; i < 11; i++) {
        if (!newStartingXI[i] || newStartingXI[i] === '') {
          newStartingXI[i] = player.id;
          added = true;
          break;
        }
      }
      if (!added) {
        // If all slots are full, replace the last one
        newStartingXI[10] = player.id;
      }
      // Ensure array is exactly 11 elements
      while (newStartingXI.length < 11) {
        newStartingXI.push('');
      }
      newStartingXI = newStartingXI.slice(0, 11);
    }
    
    setCustomStartingXI(newStartingXI);
    setSelectedSlot(null);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-1 landscape:px-2 md:px-8 pt-1 landscape:pt-2 md:pt-8 pb-[30px] gap-1 landscape:gap-2 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      
      {/* Header / Stats Cards - Only show in ROSTER mode */}
      {(viewMode === 'ROSTER') && (
      <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-1 landscape:gap-1.5 md:gap-6 flex-shrink-0 pt-12 landscape:pt-16 md:pt-24">
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-md p-1.5 landscape:p-2 md:p-6 rounded landscape:rounded-lg md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 landscape:w-20 landscape:h-20 md:w-32 md:h-32 bg-blue-500/10 rounded-full blur-xl landscape:blur-2xl -mr-5 -mt-5 landscape:-mr-8 landscape:-mt-8 md:-mr-10 md:-mt-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
            <h3 className="text-zinc-500 text-xs landscape:text-sm md:text-xs uppercase tracking-wider font-bold mb-0.5 landscape:mb-1 md:mb-2 leading-tight">{t('club')}</h3>
            <div className="text-sm landscape:text-base md:text-3xl font-bold text-white truncate leading-tight">{team.name}</div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-md p-1.5 landscape:p-2 md:p-6 rounded landscape:rounded-lg md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 landscape:w-20 landscape:h-20 md:w-32 md:h-32 bg-emerald-500/10 rounded-full blur-xl landscape:blur-2xl -mr-5 -mt-5 landscape:-mr-8 landscape:-mt-8 md:-mr-10 md:-mt-10 group-hover:bg-emerald-500/20 transition-all duration-700"></div>
            <h3 className="text-zinc-500 text-xs landscape:text-sm md:text-xs uppercase tracking-wider font-bold mb-0.5 landscape:mb-1 md:mb-2 leading-tight">{t('availableFunds')}</h3>
            <div className="text-sm landscape:text-base md:text-3xl font-mono font-bold text-emerald-400 leading-tight truncate">{formatMoney(team.budget)}</div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-md p-1.5 landscape:p-2 md:p-6 rounded landscape:rounded-lg md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-16 h-16 landscape:w-20 landscape:h-20 md:w-32 md:h-32 bg-purple-500/10 rounded-full blur-xl landscape:blur-2xl -mr-5 -mt-5 landscape:-mr-8 landscape:-mt-8 md:-mr-10 md:-mt-10 group-hover:bg-purple-500/20 transition-all duration-700"></div>
            <h3 className="text-zinc-500 text-xs landscape:text-sm md:text-xs uppercase tracking-wider font-bold mb-0.5 landscape:mb-1 md:mb-2 leading-tight">{t('squadValue')}</h3>
            <div className="text-sm landscape:text-base md:text-3xl font-mono font-bold text-purple-300 leading-tight truncate">{formatMoney(squadValue)}</div>
        </div>

        <div 
            onClick={scrollToFinancialReport}
            className={`bg-gradient-to-br backdrop-blur-md p-1.5 landscape:p-2 md:p-6 rounded landscape:rounded-lg md:rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group cursor-pointer transition-all duration-300 hover:border-white/20 ${netProfit >= 0 ? 'from-emerald-900/30 to-zinc-900/40' : 'from-rose-900/30 to-zinc-900/40'}`}
        >
             <div className={`absolute top-0 right-0 w-16 h-16 landscape:w-20 landscape:h-20 md:w-32 md:h-32 rounded-full blur-xl landscape:blur-2xl -mr-5 -mt-5 landscape:-mr-8 landscape:-mt-8 md:-mr-10 md:-mt-10 transition-all duration-700 ${netProfit >= 0 ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}`}></div>
            <h3 className="text-zinc-500 text-xs landscape:text-sm md:text-xs uppercase tracking-wider font-bold mb-0.5 landscape:mb-1 md:mb-2 leading-tight">{t('netProfitLoss')}</h3>
            <div className={`text-sm landscape:text-base md:text-3xl font-mono font-bold leading-tight truncate ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfit >= 0 ? '+' : ''}{formatMoney(netProfit)}
            </div>
        </div>
      </div>
      )}

      <div className="flex flex-col gap-1 landscape:gap-2 md:gap-8 flex-1 overflow-y-auto custom-scrollbar" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
          
          {/* Roster Table - Only show in ROSTER mode */}
          {(viewMode === 'ROSTER') && (
          <div className="flex-1 flex flex-col min-h-[200px] landscape:min-h-[250px] md:min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-end gap-1 landscape:gap-2 md:gap-4 border-b border-white/5 pb-1 landscape:pb-2 md:pb-4 flex-shrink-0">
                <h2 className="text-sm landscape:text-base md:text-4xl font-black text-white tracking-tight leading-tight">{t('roster')}</h2>
                <div className="flex gap-1 landscape:gap-1.5 md:gap-3 flex-wrap">
                    <button 
                        onClick={() => setShowStats(!showStats)}
                        className="px-1.5 landscape:px-2 md:px-6 py-0.5 landscape:py-1 md:py-3 rounded landscape:rounded-lg md:rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-[8px] landscape:text-[9px] md:text-base font-bold border border-blue-500/30 transition-all whitespace-nowrap leading-tight"
                    >
                        {showStats ? t('showBasicInfo') || 'Show Basic Info' : t('showStats') || 'Show Stats'}
                    </button>
                    {gameState === GameState.SEASON_ONGOING && onBackToLeague && (
                        <button 
                            onClick={onBackToLeague}
                            className="px-1.5 landscape:px-2 md:px-6 py-0.5 landscape:py-1 md:py-3 rounded landscape:rounded-lg md:rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[8px] landscape:text-[9px] md:text-base font-bold border border-white/5 transition-all whitespace-nowrap leading-tight"
                        >
                            {t('backToLeague')}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col relative mt-2 landscape:mt-3 md:mt-4" style={{ willChange: 'auto' }}>
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar p-1 landscape:p-2" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
                    <div className="min-w-full inline-block">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-zinc-950/50 sticky top-0 z-10 text-[11px] landscape:text-xs md:text-[10px] uppercase text-zinc-500 tracking-wider font-bold" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
                        <tr>
                        <th className="p-1.5 landscape:p-2 md:p-5 rounded-tl-lg landscape:rounded-tl-xl md:rounded-tl-2xl rounded-bl-lg landscape:rounded-bl-xl md:rounded-bl-2xl whitespace-nowrap">{t('player')}</th>
                        {!showStats ? (
                            <>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('pos')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('age')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('rating')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('value')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('wage')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('traits')}</th>
                            </>
                        ) : (
                            <>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('matches')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('goals')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('assists')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('shots')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('passAccuracy')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('saves')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('tackles')}</th>
                                <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('interceptions')}</th>
                            </>
                        )}
                        <th className="p-1.5 landscape:p-2 md:p-5 text-right rounded-tr-lg landscape:rounded-tr-xl md:rounded-tr-2xl rounded-br-lg landscape:rounded-br-xl md:rounded-br-2xl whitespace-nowrap">{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody className="space-y-2">
                        {team.players.map((player) => {
                            const pendingOffers = (player.offers || []).filter(o => o.status === 'PENDING' && !o.waitingForResponse).length;
                            const isCaptain = team.captainId === player.id;
                            return (
                            <tr 
                                key={player.id} 
                                onClick={() => onInspect && onInspect(player)}
                                className={`group hover:bg-white/5 transition-all duration-200 rounded-xl cursor-pointer relative ${
                                    pendingOffers > 0 ? 'animate-pulse' : ''
                                }`}
                                style={pendingOffers > 0 ? {
                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                                } : {}}
                            >
                            <td className="p-0.5 landscape:p-1 md:p-5 font-bold text-zinc-200 text-sm landscape:text-base md:text-base group-hover:text-white transition-colors leading-tight">
                                <div className="flex items-center gap-0.5 landscape:gap-1 flex-wrap">
                                    {isCaptain && (
                                        <span className="text-amber-400 font-bold text-xs landscape:text-sm md:text-lg leading-none" title={t('captain') || 'Captain'}>👑</span>
                                    )}
                                    <span className="truncate max-w-[70px] landscape:max-w-[100px] md:max-w-none leading-tight">{player.name || ''}</span>
                                    {player.injury ? (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInspect && onInspect(player);
                                            }}
                                            className="px-0.5 landscape:px-1 md:px-2 py-0 bg-red-500/20 text-red-400 text-[8px] landscape:text-[9px] md:text-[9px] font-bold uppercase rounded border border-red-500/30 whitespace-nowrap leading-tight cursor-pointer hover:bg-red-500/30 transition-colors"
                                        >
                                            🏥 {player.injury.weeksOut}w
                                        </span>
                                    ) : null}
                                    {player.illness ? (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInspect && onInspect(player);
                                            }}
                                            className="px-0.5 landscape:px-1 md:px-2 py-0 bg-orange-500/20 text-orange-400 text-[8px] landscape:text-[9px] md:text-[9px] font-bold uppercase rounded border border-orange-500/30 whitespace-nowrap leading-tight cursor-pointer hover:bg-orange-500/30 transition-colors"
                                        >
                                            🤒 {player.illness.weeksOut}w
                                        </span>
                                    ) : null}
                                    {player.suspensionGames && player.suspensionGames > 0 ? (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInspect && onInspect(player);
                                            }}
                                            className="px-0.5 landscape:px-1 md:px-2 py-0 bg-yellow-500/20 text-yellow-400 text-[8px] landscape:text-[9px] md:text-[9px] font-bold uppercase rounded border border-yellow-500/30 whitespace-nowrap leading-tight cursor-pointer hover:bg-yellow-500/30 transition-colors"
                                        >
                                            ⚠️ {player.suspensionGames}
                                        </span>
                                    ) : null}
                                </div>
                            </td>
                            {!showStats ? (
                                <>
                                    <td className="p-0.5 landscape:p-1 md:p-5">
                                        <span className={`px-1 landscape:px-1.5 md:px-2.5 py-0.5 landscape:py-1 md:py-1 rounded text-[11px] landscape:text-xs md:text-[10px] font-black tracking-tight leading-tight ${getPosColor(player.position)}`}>
                                            {translatePosition(player.position)}
                                        </span>
                                    </td>
                                    <td className="p-0.5 landscape:p-1 md:p-5 text-zinc-400 text-sm landscape:text-base md:text-base font-mono leading-tight">{player.age}</td>
                                    <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold bg-gradient-to-r from-zinc-800 to-transparent bg-clip-text leading-tight">{player.rating}</td>
                                    <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-emerald-400 text-sm landscape:text-base md:text-base leading-tight truncate">{formatMoney(player.trueValue)}</td>
                                    <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-zinc-400 text-sm landscape:text-base md:text-xs hidden sm:table-cell leading-tight truncate">
                                        {(() => {
                                            const weeklyWage = player.contract?.wage || 0;
                                            // Calculate season total: typically 38 weeks in Premier League
                                            const seasonWeeks = 38;
                                            const seasonTotalWage = weeklyWage * seasonWeeks;
                                            return formatMoney(seasonTotalWage);
                                        })()}
                                    </td>
                                    <td className="p-0.5 landscape:p-1 md:p-5 hidden sm:table-cell">
                                        {player.traits && player.traits.length > 0 && (
                                            <div className="flex flex-wrap gap-0.5">
                                                {player.traits.map((traitId) => {
                                                    const rarity = getTraitRarity(traitId);
                                                    const rarityColors = {
                                                        common: 'bg-zinc-700/50 border-zinc-500/50 text-zinc-200',
                                                        rare: 'bg-blue-700/50 border-blue-500/50 text-blue-200',
                                                        epic: 'bg-purple-700/50 border-purple-500/50 text-purple-200',
                                                    };
                                                    const tooltipKey = `${player.id}-${traitId}`;
                                                    
                                                    return (
                                                        <div key={traitId} className="relative">
                                                            <div
                                                                className={`relative px-1 landscape:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] landscape:text-[10px] md:text-[9px] font-bold uppercase border leading-tight ${rarityColors[rarity]} cursor-pointer`}
                                                                onMouseEnter={() => setShowTraitTooltip(tooltipKey)}
                                                                onMouseLeave={() => setShowTraitTooltip(null)}
                                                                onClick={() => setShowTraitTooltip(showTraitTooltip === tooltipKey ? null : tooltipKey)}
                                                            >
                                                                {getTraitName(traitId)}
                                                            </div>
                                                            {showTraitTooltip === tooltipKey && (
                                                                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 landscape:mb-2 p-1.5 landscape:p-2 md:p-3 bg-zinc-800 border border-zinc-700 rounded landscape:rounded-lg shadow-lg w-32 landscape:w-48 md:w-60 text-white text-xs landscape:text-sm md:text-xs">
                                                                    <div className="font-bold mb-0.5 landscape:mb-1 leading-tight">{getTraitName(traitId)}</div>
                                                                    <p className="leading-tight">{getTraitDescription(traitId)}</p>
                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {(!player.traits || player.traits.length === 0) && (
                                            <span className="text-zinc-500 text-sm landscape:text-base md:text-xs leading-tight">-</span>
                                        )}
                                    </td>
                                </>
                            ) : (() => {
                                // Get performances from player.matchPerformances or from fixtures
                                let performances = player.matchPerformances || [];
                                
                                // If player has no matchPerformances, try to get them from fixtures
                                if (performances.length === 0 && fixtures && fixtures.length > 0) {
                                    performances = [];
                                    fixtures.forEach(fixture => {
                                        if (fixture.matchPerformances && fixture.matchPerformances.length > 0) {
                                            const playerPerf = fixture.matchPerformances.find(p => p.playerId === player.id);
                                            if (playerPerf) {
                                                performances.push(playerPerf);
                                            }
                                        }
                                    });
                                }
                                
                                const matches = performances.length;
                                const goals = performances.reduce((sum, p) => sum + (p.goals || 0), 0);
                                const assists = performances.reduce((sum, p) => sum + (p.assists || 0), 0);
                                const shots = performances.reduce((sum, p) => sum + (p.shots || 0), 0);
                                const totalPasses = performances.reduce((sum, p) => sum + (p.passes || 0), 0);
                                const totalPassAccuracy = performances.reduce((sum, p) => sum + (p.passAccuracy || 0), 0);
                                const avgPassAccuracy = matches > 0 ? Math.round(totalPassAccuracy / matches) : 0;
                                const saves = performances.reduce((sum, p) => sum + (p.saves || 0), 0);
                                const tackles = performances.reduce((sum, p) => sum + (p.tackles || 0), 0);
                                const interceptions = performances.reduce((sum, p) => sum + (p.interceptions || 0), 0);
                                
                                return (
                                    <>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight">
                                            {matches}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight">
                                            {goals}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight">
                                            {assists}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight">
                                            {shots}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight">
                                            {avgPassAccuracy}%
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight hidden sm:table-cell">
                                            {saves}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight hidden sm:table-cell">
                                            {tackles}
                                        </td>
                                        <td className="p-0.5 landscape:p-1 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold leading-tight hidden sm:table-cell">
                                            {interceptions}
                                        </td>
                                    </>
                                );
                            })()}
                            <td className="p-0.5 landscape:p-1 md:p-5 text-right flex gap-0.5 landscape:gap-1 md:gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                {onRenew && (
                                    <button
                                        onClick={() => onRenew(player)}
                                        className="px-1 landscape:px-2 md:px-4 py-0.5 landscape:py-1 md:py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs landscape:text-sm md:text-xs font-bold uppercase tracking-tight rounded landscape:rounded-md md:rounded-lg border border-blue-500/30 transition-all whitespace-nowrap leading-tight"
                                    >
                                        {t('renew')}
                                    </button>
                                )}
                                {(gameState === GameState.TRANSFER_WINDOW || gameState === GameState.SEASON_ONGOING) && (
                                    <button 
                                        onClick={() => onSell(player)}
                                        className="px-1 landscape:px-2 md:px-4 py-0.5 landscape:py-1 md:py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-xs landscape:text-sm md:text-xs font-bold uppercase tracking-tight rounded landscape:rounded-md md:rounded-lg border border-rose-500/20 hover:border-rose-500 transition-all whitespace-nowrap leading-tight"
                                    >
                                        {t('sell')}
                                    </button>
                                )}
                            </td>
                        </tr>
                        );
                        })}
                    </tbody>
                    </table>
                    </div>
                </div>
            </div>
          </div>
          )}

          {/* Starting XI Formation - Show only in FORMATION mode */}
          {viewMode === 'FORMATION' && (
          <div className="w-full flex flex-col gap-4">
              {viewMode === 'FORMATION' && (
                <div className="mb-4">
                  <h2 className="text-4xl font-black text-white tracking-tight mb-2">{t('formationView')}</h2>
                  <p className="text-zinc-400 text-sm">{t('startingXIAndTactics')}</p>
                </div>
              )}
              <div className="bg-zinc-950/30 rounded-3xl p-8 shadow-xl">
                  <div className="flex flex-col lg:flex-row gap-8 h-full">
                      {/* Left: Starting XI Formation */}
                      <div className="flex-1 flex flex-col items-center">
                          <div className="flex justify-between items-center mb-4 w-full max-w-md">
                              <div className="text-xs uppercase font-bold text-zinc-500">{t('formation')}</div>
                              <div className="text-white font-bold font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5">{selectedFormation}</div>
                          </div>
                          <TacticsBoard 
                              players={finalStartingXI} 
                              formation={selectedFormation}
                              showEmptySlots={true}
                              playerSlotMap={playerSlotMap}
                              allPlayers={team.players}
                              readOnly={true}
                          />
                          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-lg">
                              <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                  <div className="text-[10px] uppercase font-bold text-zinc-500">{t('attackRating')}</div>
                                  <div className="text-2xl font-black text-white">
                                      {(() => {
                                          const attackers = finalStartingXI.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
                                          return attackers.length > 0 
                                              ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
                                              : 0;
                                      })()}
                                  </div>
                              </div>
                              <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                  <div className="text-[10px] uppercase font-bold text-zinc-500">{t('defenseRating')}</div>
                                  <div className="text-2xl font-black text-white">
                                      {(() => {
                                          const defenders = finalStartingXI.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
                                          return defenders.length > 0
                                              ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
                                              : 0;
                                      })()}
                                  </div>
                              </div>
                              <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                  <div className="text-[10px] uppercase font-bold text-zinc-500">{t('midfieldRating')}</div>
                                  <div className="text-2xl font-black text-white">
                                      {(() => {
                                          const midfielders = finalStartingXI.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
                                          return midfielders.length > 0
                                              ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
                                              : 0;
                                      })()}
                                  </div>
                              </div>
                          </div>
                          <div className="mt-4 flex justify-center">
                              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-center">
                                  <div className="text-[10px] uppercase font-bold text-emerald-400">{t('overallRating')}</div>
                                  <div className="text-3xl font-black text-emerald-400">
                                      {(() => {
                                          const attackers = finalStartingXI.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
                                          const defenders = finalStartingXI.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
                                          const midfielders = finalStartingXI.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
                                          
                                          const attackRating = attackers.length > 0 
                                              ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
                                              : 0;
                                          const defenseRating = defenders.length > 0
                                              ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
                                              : 0;
                                          const midfieldRating = midfielders.length > 0
                                              ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
                                              : 0;
                                          
                                          const ratings = [attackRating, defenseRating, midfieldRating].filter(r => r > 0);
                                          return ratings.length > 0 
                                              ? Math.round(ratings.reduce((acc, r) => acc + r, 0) / ratings.length)
                                              : 0;
                                      })()}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          )}

              {/* Price Management Panel - Show only in FINANCIAL mode */}
              {viewMode === 'FINANCIAL' && (
              <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl" style={{ willChange: 'auto', transform: 'translateZ(0)' }}>
                  <h3 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-4 pb-2 border-b border-white/5">{t('priceManagement')}</h3>
                  
                  <div className="space-y-6">
                      {/* Ticket Price */}
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-white font-bold text-sm">{t('ticketPrice')}</span>
                              <span className="text-emerald-400 font-mono font-bold">${team.ticketPrice || team.baseTicketPrice || 0}</span>
                          </div>
                          <div className="flex gap-2 mb-2">
                              <button
                                  onClick={() => {
                                      const currentPrice = team.ticketPrice || team.baseTicketPrice || 50;
                                      if (currentPrice > 10) {
                                          const newPrice = currentPrice - 5;
                                          const baseShirtPrice = team.baseShirtPrice || team.shirtPrice || 60;
                                          // Calculate morale change based on price difference
                                          // Price decreased = morale should increase
                                          const oldMoraleChange = calculatePriceMoraleChange(
                                              currentPrice,
                                              team.baseTicketPrice || 50,
                                              team.shirtPrice || baseShirtPrice,
                                              baseShirtPrice
                                          );
                                          const newMoraleChange = calculatePriceMoraleChange(
                                              newPrice,
                                              team.baseTicketPrice || 50,
                                              team.shirtPrice || baseShirtPrice,
                                              baseShirtPrice
                                          );
                                          const moraleDiff = newMoraleChange - oldMoraleChange;
                                          const updatedMorale = Math.max(0, Math.min(100, (team.fanMorale || 50) + moraleDiff));
                                          onUpdateTeam?.({ ...team, ticketPrice: newPrice, fanMorale: updatedMorale, baseShirtPrice: team.baseShirtPrice || baseShirtPrice });
                                      }
                                  }}
                                  disabled={(!team.ticketPrice && !team.baseTicketPrice) || (team.ticketPrice || team.baseTicketPrice || 0) <= 10}
                                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm"
                              >
                                  -$5
                              </button>
                              <button
                                  onClick={() => {
                                      const currentPrice = team.ticketPrice || team.baseTicketPrice || 50;
                                      if (currentPrice < 200) {
                                          const newPrice = currentPrice + 5;
                                          const baseShirtPrice = team.baseShirtPrice || team.shirtPrice || 60;
                                          // Calculate morale change based on price difference
                                          // Price increased = morale should decrease
                                          const oldMoraleChange = calculatePriceMoraleChange(
                                              currentPrice,
                                              team.baseTicketPrice || 50,
                                              team.shirtPrice || baseShirtPrice,
                                              baseShirtPrice
                                          );
                                          const newMoraleChange = calculatePriceMoraleChange(
                                              newPrice,
                                              team.baseTicketPrice || 50,
                                              team.shirtPrice || baseShirtPrice,
                                              baseShirtPrice
                                          );
                                          const moraleDiff = newMoraleChange - oldMoraleChange;
                                          const updatedMorale = Math.max(0, Math.min(100, (team.fanMorale || 50) + moraleDiff));
                                          onUpdateTeam?.({ ...team, ticketPrice: newPrice, fanMorale: updatedMorale, baseShirtPrice: team.baseShirtPrice || baseShirtPrice });
                                      }
                                  }}
                                  disabled={(!team.ticketPrice && !team.baseTicketPrice) || (team.ticketPrice || team.baseTicketPrice || 0) >= 200}
                                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm"
                              >
                                  +$5
                              </button>
                          </div>
                          <p className="text-xs text-zinc-500">
                              {t('base')}: ${team.baseTicketPrice || team.ticketPrice || 0} | 
                              {t('capacity')}: {team.stadiumCapacity?.toLocaleString() || 'N/A'} | 
                              {t('fans')}: {team.fanCount?.toLocaleString() || 'N/A'}
                          </p>
                      </div>

                      {/* Shirt Price */}
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-white font-bold text-sm">{t('shirtPrice')}</span>
                              <span className="text-emerald-400 font-mono font-bold">${team.shirtPrice || 0}</span>
                          </div>
                          <div className="flex gap-2">
                              <button
                                  onClick={() => {
                                      const currentPrice = team.shirtPrice || 60;
                                      if (currentPrice > 20) {
                                          const newPrice = currentPrice - 5;
                                          const baseShirtPrice = team.baseShirtPrice || currentPrice;
                                          // Calculate morale change based on price difference
                                          // Price decreased = morale should increase
                                          const oldMoraleChange = calculatePriceMoraleChange(
                                              team.ticketPrice || team.baseTicketPrice || 50,
                                              team.baseTicketPrice || 50,
                                              currentPrice,
                                              baseShirtPrice
                                          );
                                          const newMoraleChange = calculatePriceMoraleChange(
                                              team.ticketPrice || team.baseTicketPrice || 50,
                                              team.baseTicketPrice || 50,
                                              newPrice,
                                              baseShirtPrice
                                          );
                                          const moraleDiff = newMoraleChange - oldMoraleChange;
                                          const updatedMorale = Math.max(0, Math.min(100, (team.fanMorale || 50) + moraleDiff));
                                          onUpdateTeam?.({ ...team, shirtPrice: newPrice, fanMorale: updatedMorale, baseShirtPrice: team.baseShirtPrice || baseShirtPrice });
                                      }
                                  }}
                                  disabled={!team.shirtPrice || team.shirtPrice <= 20}
                                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm"
                              >
                                  -$5
                              </button>
                              <button
                                  onClick={() => {
                                      const currentPrice = team.shirtPrice || 60;
                                      if (currentPrice < 150) {
                                          const newPrice = currentPrice + 5;
                                          const baseShirtPrice = team.baseShirtPrice || currentPrice;
                                          // Calculate morale change based on price difference
                                          // Price increased = morale should decrease
                                          const oldMoraleChange = calculatePriceMoraleChange(
                                              team.ticketPrice || team.baseTicketPrice || 50,
                                              team.baseTicketPrice || 50,
                                              currentPrice,
                                              baseShirtPrice
                                          );
                                          const newMoraleChange = calculatePriceMoraleChange(
                                              team.ticketPrice || team.baseTicketPrice || 50,
                                              team.baseTicketPrice || 50,
                                              newPrice,
                                              baseShirtPrice
                                          );
                                          const moraleDiff = newMoraleChange - oldMoraleChange;
                                          const updatedMorale = Math.max(0, Math.min(100, (team.fanMorale || 50) + moraleDiff));
                                          onUpdateTeam?.({ ...team, shirtPrice: newPrice, fanMorale: updatedMorale, baseShirtPrice: team.baseShirtPrice || baseShirtPrice });
                                      }
                                  }}
                                  disabled={!team.shirtPrice || team.shirtPrice >= 150}
                                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm"
                              >
                                  +$5
                              </button>
                          </div>
                      </div>

                      {/* Fan Morale Display */}
                      {team.fanMorale !== undefined && (
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-white font-bold text-sm">{t('fanMorale')}</span>
                                  <span className={`font-mono font-bold ${
                                      team.fanMorale >= 70 ? 'text-emerald-400' :
                                      team.fanMorale >= 40 ? 'text-yellow-400' :
                                      'text-rose-400'
                                  }`}>
                                      {team.fanMorale.toFixed(0)}/100
                                  </span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-2">
                                  <div 
                                      className={`h-2 rounded-full transition-all ${
                                          team.fanMorale >= 70 ? 'bg-emerald-500' :
                                          team.fanMorale >= 40 ? 'bg-yellow-500' :
                                          'bg-rose-500'
                                      }`}
                                      style={{ width: `${team.fanMorale}%` }}
                                  ></div>
                              </div>
                          </div>
                      )}

                      {/* Stadium Expansion */}
                      {team.stadiumCapacity !== undefined && (
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-white font-bold text-sm">{t('stadiumCapacity')}</span>
                                  <span className="text-emerald-400 font-mono font-bold">{team.stadiumCapacity.toLocaleString()}</span>
                              </div>
                              {(() => {
                                  const upgradeCost = team.stadiumCapacity ? calculateUpgradeCost(team.stadiumCapacity) : null;
                                  const upgradeWeeks = team.stadiumCapacity ? calculateUpgradeWeeks(team.stadiumCapacity) : null;
                                  const canUpgrade = team.stadiumCapacity !== undefined && team.stadiumCapacity < 100000 && upgradeCost !== null;

                                  return team.pendingStadiumExpansion ? (
                                  <div className="w-full px-4 py-3 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm">
                                      <div className="text-blue-300 font-bold mb-1">{t('expansionInProgress')}</div>
                                      <div className="text-zinc-400 text-xs">
                                          {t('newCapacity')}: {team.pendingStadiumExpansion.newCapacity.toLocaleString()}
                                      </div>
                                      <div className="text-zinc-500 text-xs mt-1">
                                          {(() => {
                                              if (team.pendingStadiumExpansion.startWeek === 0) {
                                                  return `${t('completion')}: ${t('week')} ${team.pendingStadiumExpansion.completionWeek}`;
                                              }
                                              const weeksElapsed = currentWeek - team.pendingStadiumExpansion.startWeek;
                                              const totalWeeks = team.pendingStadiumExpansion.completionWeek - team.pendingStadiumExpansion.startWeek;
                                              const weeksRemaining = totalWeeks - weeksElapsed;
                                              return `${t('weeksRemaining')}: ${weeksRemaining}/${totalWeeks}`;
                                          })()}
                                      </div>
                                  </div>
                                  ) : !canUpgrade ? (
                                      <div className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-sm">
                                          <div className="text-zinc-400 font-bold mb-1">{t('expandStadium')}</div>
                                          <div className="text-zinc-500 text-xs">
                                              {team.stadiumCapacity && team.stadiumCapacity >= 100000 
                                                  ? t('stadiumCapacityLimitReached')
                                                  : t('unableToExpandStadium')}
                                          </div>
                                      </div>
                              ) : (
                                  <button
                                      onClick={() => {
                                              if (team.stadiumCapacity && upgradeCost !== null && upgradeWeeks !== null) {
                                                  if (team.budget >= upgradeCost) {
                                                  const newCapacity = Math.floor(team.stadiumCapacity * 1.15);
                                                  onUpdateTeam?.({
                                                      ...team,
                                                          budget: team.budget - upgradeCost,
                                                      financials: {
                                                          ...team.financials,
                                                          expenses: {
                                                              ...team.financials.expenses,
                                                                  facilities: team.financials.expenses.facilities + upgradeCost
                                                          }
                                                      },
                                                      pendingStadiumExpansion: {
                                                          startWeek: 0, // Will be set by App.tsx
                                                          completionWeek: 0, // Will be set by App.tsx
                                                          newCapacity: newCapacity,
                                                              cost: upgradeCost
                                                      }
                                                  });
                                              }
                                          }
                                      }}
                                          disabled={!team.stadiumCapacity || !team.budget || team.pendingStadiumExpansion !== undefined || !canUpgrade || (upgradeCost !== null && team.budget < upgradeCost)}
                                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm"
                                  >
                                      {(() => {
                                              if (!team.stadiumCapacity || upgradeCost === null || upgradeWeeks === null) {
                                                  return `${t('expandStadium')} (+15%) - N/A`;
                                              }
                                              return `${t('startExpansion')} (+15%, ${upgradeWeeks} ${t('weeks')}) - ${formatMoney(upgradeCost)}`;
                                      })()}
                                  </button>
                                  );
                              })()}
                          </div>
                      )}
                  </div>
              </div>
              )}

              {/* Fan & Stadium Info Panel - Show only in FINANCIAL mode */}
              {viewMode === 'FINANCIAL' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                      <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">{t('fanStadiumInfo')}</h3>
                      <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400">{t('fanCount')}</span>
                              <span className="text-white font-bold">{team.fanCount?.toLocaleString() || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400">{t('stadiumCapacity')}</span>
                              <span className="text-white font-bold">{team.stadiumCapacity?.toLocaleString() || 'N/A'}</span>
                          </div>
                          {team.fanMorale !== undefined && (
                              <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">{t('fanMorale')}</span>
                                  <span className={`font-bold ${
                                      team.fanMorale >= 70 ? 'text-emerald-400' :
                                      team.fanMorale >= 40 ? 'text-yellow-400' :
                                      'text-rose-400'
                                  }`}>
                                      {team.fanMorale.toFixed(0)}/100
                                  </span>
                              </div>
                          )}
                          {team.clubReputation !== undefined && (
                              <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">{t('clubReputation')}</span>
                                  <span className="text-white font-bold">{team.clubReputation.toFixed(0)}/100</span>
                              </div>
                          )}
                          {team.stadiumNameSponsor && (() => {
                            const sponsor = team.stadiumNameSponsor;
                            const isExpired = sponsor.endWeek && currentWeek >= sponsor.endWeek;
                            const weeksRemaining = sponsor.endWeek ? Math.max(0, sponsor.endWeek - currentWeek) : 0;
                            
                            return (
                              <div className={`flex justify-between items-center mt-3 pt-3 border-t ${isExpired ? 'border-red-500/20' : 'border-white/5'}`}>
                                  <div>
                                      <div className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-1">
                                          {t('currentSponsor') || 'Stadium Sponsor'}
                                          {isExpired && <span className="text-red-400 ml-2">({t('expired') || 'Expired'})</span>}
                                      </div>
                                      <div className="text-emerald-400 font-bold text-sm">
                                          {sponsor.sponsorName} {t('stadium')}
                                      </div>
                                      <div className="text-zinc-500 text-xs mt-1">
                                          {formatMoney(sponsor.annualPayment)}/{t('year') || 'year'}
                                          {sponsor.endWeek && !isExpired && (
                                            <span className="ml-2 text-zinc-600">
                                              ({t('contractEndsIn') || 'Ends in'} {weeksRemaining} {t('weeks') || 'weeks'})
                                            </span>
                                          )}
                                      </div>
                                      {sponsor.endSeason && (
                                        <div className="text-zinc-600 text-xs mt-1">
                                          {t('contractEndsIn') || 'Contract ends'} {sponsor.endSeason}
                                        </div>
                                      )}
                                  </div>
                              </div>
                            );
                          })()}
                          {team.pendingStadiumSponsorOffer && (
                              <div className="mt-3 pt-3 border-t border-white/5">
                                  <button
                                      onClick={() => {
                                          if (onOpenSponsorOffer) {
                                              onOpenSponsorOffer(team, team.pendingStadiumSponsorOffer);
                                          }
                                      }}
                                      className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg p-3 text-left transition-all cursor-pointer group"
                                  >
                                      <div className="flex items-center justify-between mb-1">
                                          <div className="text-blue-300 text-xs font-bold group-hover:text-blue-200">
                                              {t('stadiumSponsorOffer') || 'Pending Sponsor Offer'}
                                          </div>
                                          <div className="text-blue-400 text-xs">
                                              {t('clickToView') || 'Click to view'} →
                                          </div>
                                      </div>
                                      <div className="text-zinc-400 text-xs group-hover:text-zinc-300">
                                          {team.pendingStadiumSponsorOffer.sponsorCompany} - {formatMoney(team.pendingStadiumSponsorOffer.annualPayment)}/{t('year') || 'year'}
                                      </div>
                                      {team.pendingStadiumSponsorOffer.expiryWeek && (
                                          <div className="text-zinc-600 text-xs mt-1">
                                              {t('offerExpiresIn') || 'Expires in'} {Math.max(0, team.pendingStadiumSponsorOffer.expiryWeek - currentWeek)} {t('weeks') || 'weeks'}
                                          </div>
                                      )}
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                      <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">{t('currentPrices')}</h3>
                      <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400">{t('ticketPrice')}</span>
                              <span className="text-emerald-400 font-bold">${team.ticketPrice || team.baseTicketPrice || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400">{t('baseTicketPrice')}</span>
                              <span className="text-zinc-500 font-bold">${team.baseTicketPrice || team.ticketPrice || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400">{t('shirtPrice')}</span>
                              <span className="text-emerald-400 font-bold">${team.shirtPrice || 'N/A'}</span>
                          </div>
                      </div>
                  </div>
              </div>
              )}

              {/* Financial Details Panel - Show only in FINANCIAL mode */}
              {viewMode === 'FINANCIAL' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div ref={financialReportRef} className="bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl" style={{ willChange: 'auto', transform: 'translateZ(0)' }}>
                  <h3 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-4 pb-2 border-b border-white/5">{t('financialReport')}</h3>
                  
                  <div className="space-y-6">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-emerald-400 font-bold text-sm">{t('income')}</span>
                             <span className="text-white font-mono font-bold">{formatMoney(totalIncome)}</span>
                          </div>
                          <div className="space-y-2 text-xs text-zinc-400">
                             <div className="flex justify-between">
                                 <span>{t('matchTickets')}</span>
                                 <span>{formatMoney(seasonTotalTicketRevenue)}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>{t('sponsors')}</span>
                                 <span>{formatMoney(income.sponsors)}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>{t('prizeMoney')}</span>
                                 <span>{formatMoney(projectedPrizeMoney)}</span>
                             </div>
                          </div>
                      </div>

                      <div className="w-full h-px bg-white/5"></div>

                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-rose-400 font-bold text-sm">{t('expenses')}</span>
                             <span className="text-white font-mono font-bold">{formatMoney(totalExpenses)}</span>
                          </div>
                          <div className="space-y-2 text-xs text-zinc-400">
                             <div className="flex justify-between">
                                 <span>{t('playerWages')}</span>
                                 <span>{formatMoney(seasonTotalWages)}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>{t('operations')}</span>
                                 <span>{formatMoney(expenses.facilities)}</span>
                             </div>
                          </div>
                      </div>
                  </div>
              </div>

              </div>
              )}

      </div>

    </div>
  );
};

export const PortfolioView = React.memo(PortfolioViewComponent);
