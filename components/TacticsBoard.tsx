
import React from 'react';
import { Player, Position } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface TacticsBoardProps {
  players: Player[]; 
  formation: string;
  onDrop?: (draggedId: string, targetId: string) => void;
  onPlayerDrop?: (e: React.DragEvent, targetPlayerId?: string) => void;
  onPlayerRemove?: (playerId: string) => void;
  showEmptySlots?: boolean;
  maxSlots?: number;
  compact?: boolean;
  onEmptySlotClick?: (position: Position, slotIndex: number) => void;
  playerSlotMap?: { [playerId: string]: { position: Position; slotIndex: number } }; // Map player ID to their assigned position and slot
  allPlayers?: Player[]; // All available players (for finding players in playerSlotMap)
  readOnly?: boolean; // If true, disable all interactive features
}

export const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, formation = "4-3-3", onPlayerDrop, onPlayerRemove, showEmptySlots = false, maxSlots, compact = false, onEmptySlotClick, playerSlotMap, allPlayers, readOnly = false }) => {
  const { translatePosition } = useLanguage();
  
  // Remove duplicates from players array (by ID)
  const uniquePlayers = players.filter((player, index, self) => 
    index === self.findIndex(p => p.id === player.id)
  );
  
  // Use allPlayers if provided, otherwise fall back to players
  const playerSource = allPlayers || players;
  
  // Parse formation string (e.g., "4-3-3" -> {def: 4, mid: 3, fwd: 3})
  const parseFormation = (form: string): { def: number; mid: number; fwd: number } => {
    const parts = form.split('-').map(Number);
    if (parts.length === 3) {
      return { def: parts[0], mid: parts[1], fwd: parts[2] };
    } else if (parts.length === 4) {
      // Handle formations like "4-2-3-1" (def-mid1-mid2-fwd)
      return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
    }
    // Default to 4-3-3 if parsing fails
    return { def: 4, mid: 3, fwd: 3 };
  };

  const { def: defCount, mid: midCount, fwd: fwdCount } = parseFormation(formation);
  
  // Helper functions
  const isGK = (p: Player) => p.position === Position.GK;
  const isDef = (p: Player) => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(p.position);
  const isMid = (p: Player) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position);
  const isFwd = (p: Player) => [Position.ST, Position.CF, Position.RW, Position.LW].includes(p.position);

  // Get players by position, sorted by rating
  const gk = players.filter(isGK).sort((a, b) => b.rating - a.rating).slice(0, 1);
  
  // Defenders: prioritize specific positions (LB, CB, CB, RB)
  const allDefs = players.filter(isDef).sort((a, b) => b.rating - a.rating);
  
  // Use defLine to maintain correct slot positions when playerSlotMap is provided
  let defLine: (Player | null)[] | null = null;
  
  if (playerSlotMap && showEmptySlots) {
    // Use playerSlotMap to place defenders in correct positions
    defLine = Array(defCount).fill(null) as (Player | null)[];
    
    // Place defenders according to playerSlotMap
    Object.keys(playerSlotMap).forEach(playerId => {
      const slotInfo = playerSlotMap[playerId];
      if (slotInfo && (slotInfo.position === Position.LB || slotInfo.position === Position.LWB || 
                       slotInfo.position === Position.CB || 
                       slotInfo.position === Position.RB || slotInfo.position === Position.RWB)) {
        const player = playerSource.find(p => p.id === playerId);
        if (player && slotInfo.slotIndex < defCount && slotInfo.slotIndex >= 0) {
          // Directly place player at slotIndex, regardless of position matching
          defLine[slotInfo.slotIndex] = player;
        }
      }
    });
  }
  
  // Fallback: original logic when playerSlotMap is not provided
  const lb = allDefs.filter(p => [Position.LB, Position.LWB].includes(p.position)).slice(0, 1);
  const cbs = allDefs.filter(p => p.position === Position.CB).slice(0, defCount >= 3 ? (defCount === 5 ? 3 : 2) : defCount - 2);
  const rb = allDefs.filter(p => [Position.RB, Position.RWB].includes(p.position)).slice(0, 1);
  
  // Special handling for 5-4-1 and 5-3-2: 3 stoper (CB) + 2 kanat bek (LB/LWB, RB/RWB)
  let def: Player[] = [];
  if ((formation === "5-4-1" || formation === "5-3-2") && defCount === 5) {
    const wingBacks = [...lb, ...rb];
    def = [
      ...cbs.slice(0, 3), // 3 stoper
      ...wingBacks.slice(0, 2), // 2 kanat bek
      ...allDefs.filter(p => !cbs.slice(0, 3).includes(p) && !wingBacks.slice(0, 2).includes(p)).slice(0, Math.max(0, 5 - 3 - Math.min(wingBacks.length, 2)))
    ].slice(0, 5);
  } else {
    def = [
      ...lb,
      ...cbs,
      ...rb,
      ...allDefs.filter(p => !lb.includes(p) && !cbs.includes(p) && !rb.includes(p)).slice(0, Math.max(0, defCount - lb.length - cbs.length - rb.length))
    ].slice(0, defCount);
  }
  
  // Midfielders: prioritize specific positions (DM, CM, CAM, LM, RM)
  // Special handling for 4-3-3: CDM in center, CM/CAM on sides
  const allMids = players.filter(isMid).sort((a, b) => b.rating - a.rating);
  
  // Use midLine to maintain correct slot positions when playerSlotMap is provided
  let midLine: (Player | null)[] | null = null;
  
  if (playerSlotMap && showEmptySlots) {
    // Use playerSlotMap to place midfielders in correct positions
    midLine = Array(midCount).fill(null) as (Player | null)[];
    
    // Place midfielders according to playerSlotMap
    Object.keys(playerSlotMap).forEach(playerId => {
      const slotInfo = playerSlotMap[playerId];
      if (slotInfo && (slotInfo.position === Position.CDM || slotInfo.position === Position.CM || 
                       slotInfo.position === Position.CAM || slotInfo.position === Position.LM || 
                       slotInfo.position === Position.RM)) {
        const player = playerSource.find(p => p.id === playerId);
        if (player && slotInfo.slotIndex < midCount && slotInfo.slotIndex >= 0) {
          // Directly place player at slotIndex, regardless of position matching
          midLine[slotInfo.slotIndex] = player;
        }
      }
    });
  }
  
  // Fallback: original logic when playerSlotMap is not provided
  const dm = allMids.filter(p => p.position === Position.CDM).slice(0, 1);
  const cms = allMids.filter(p => p.position === Position.CM).slice(0, Math.min(midCount - dm.length, 2));
  const cam = allMids.filter(p => p.position === Position.CAM).slice(0, 1);
  const lm = allMids.filter(p => p.position === Position.LM).slice(0, 1);
  const rm = allMids.filter(p => p.position === Position.RM).slice(0, 1);
  
  let mid: Player[] = [];
  if (formation === "4-3-3" && midCount === 3) {
    // For 4-3-3: [CM/CAM, CDM, CM/CAM] - CDM in center (index 1)
    const sideMids = [...cms, ...cam, ...lm, ...rm].slice(0, 2);
    const remainingMids = allMids.filter(p => 
      !dm.includes(p) && 
      !sideMids.includes(p) && 
      (p.position === Position.CM || p.position === Position.CAM || p.position === Position.LM || p.position === Position.RM)
    ).slice(0, 2 - sideMids.length);
    const allSideMids = [...sideMids, ...remainingMids].slice(0, 2);
    
    // Build: [left CM/CAM, CDM, right CM/CAM]
    mid = [
      allSideMids[0] || dm[0] || allMids[0],
      dm[0] || allMids[0],
      allSideMids[1] || dm[0] || allMids[1] || allMids[0]
    ].filter((p, i, arr) => p && arr.indexOf(p) === i).slice(0, 3);
  } else if (formation === "3-5-2" && midCount === 5) {
    // For 3-5-2: [LM/LW, CM/CDM, CAM/CM, CM/CDM, RM/RW]
    // Positions 1,3,5 (indices 0,2,4): closer to forwards (LM/LW, CAM/CM, RM/RW)
    // Positions 2,4 (indices 1,3): closer to defense (CM/CDM)
    
    // Get players by priority
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    const camCm = [...cam, ...cms].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    const cdmCm = [...dm, ...cms].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Build: [LM/LW (0), CM/CDM (1), CAM/CM (2), CM/CDM (3), RM/RW (4)]
    // Ensure positions 1 and 5 are wings (LM/LW/RM/RW), not defensive mids
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 1: Left wing (LM/LW only, NOT CDM)
    if (lwLm[0]) {
      result[0] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id) && p.position !== Position.CDM);
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Defensive mid (first) - CDM/CM (defensive or center midfield)
    if (cdmCm[0] && !usedIds.has(cdmCm[0].id)) {
      result[1] = cdmCm[0];
      usedIds.add(cdmCm[0].id);
    } else {
      // Prioritize CDM, then CM
      const fallback = allMids.find(p => p.position === Position.CDM && !usedIds.has(p.id)) ||
                       allMids.find(p => p.position === Position.CM && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Central mid - CAM/CM (offensive or center midfield)
    if (camCm[0] && !usedIds.has(camCm[0].id)) {
      result[2] = camCm[0];
      usedIds.add(camCm[0].id);
    } else {
      // Prioritize CAM, then CM
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => p.position === Position.CM && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 4: Defensive mid (second) - CDM/CM (defensive or center midfield)
    if (cdmCm[1] && !usedIds.has(cdmCm[1].id)) {
      result[3] = cdmCm[1];
      usedIds.add(cdmCm[1].id);
    } else if (cdmCm[0] && !usedIds.has(cdmCm[0].id)) {
      result[3] = cdmCm[0];
      usedIds.add(cdmCm[0].id);
    } else {
      // Prioritize CDM, then CM
      const fallback = allMids.find(p => p.position === Position.CDM && !usedIds.has(p.id)) ||
                       allMids.find(p => p.position === Position.CM && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 5: Right wing (RM/RW only, NOT CDM)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[4] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id) && p.position !== Position.CDM);
      if (fallback) {
        result[4] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 5);
    
    // Fill remaining slots if needed
    if (mid.length < 5) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 5 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "4-4-2" && midCount === 4) {
    // For 4-4-2: [LM/LW, CM/CDM/CAM, CM/CDM/CAM, RM/RW]
    // Positions 1,4 (indices 0,3): wing players (LM/LW, RM/RW)
    // Positions 2,3 (indices 1,2): center midfielders (CM/CDM/CAM)
    
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Get players by priority
    // Position 1 (index 0): Left wing - LM/LW
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Positions 2 and 3 (indices 1,2): Center midfielders - CM/CDM/CAM
    const centerMids = [...cam, ...cms, ...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 4 (index 3): Right wing - RM/RW
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [LM/LW (0), CM/CDM/CAM (1), CM/CDM/CAM (2), RM/RW (3)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 1: Left wing (LM/LW only)
    if (lwLm[0]) {
      result[0] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Center mid (first) - CM/CDM/CAM
    if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[1] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CAM || p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Center mid (second) - CM/CDM/CAM
    if (centerMids[1] && !usedIds.has(centerMids[1].id)) {
      result[2] = centerMids[1];
      usedIds.add(centerMids[1].id);
    } else if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[2] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CAM || p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 4: Right wing (RM/RW only)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[3] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 4);
    
    // Fill remaining slots if needed
    if (mid.length < 4) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 4 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "4-2-3-1" && midCount === 5) {
    // For 4-2-3-1: [CDM/CM, CDM/CM, LM/LW, CAM, RM/RW]
    // Positions 0,1: Defensive midfielders (CDM/CM) - geride
    // Positions 2,3,4: Attacking midfielders (LM/LW, CAM, RM/RW) - ileride
    
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Get players by priority
    // Positions 0,1: Defensive mids - CDM/CM
    const defMids = [...dm, ...cms].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 2: Left wing - LM/LW
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 3: Central attacking mid - CAM
    const camPlayer = [...cam].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 4: Right wing - RM/RW
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [CDM/CM (0), CDM/CM (1), LM/LW (2), CAM (3), RM/RW (4)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: Defensive mid (first) - CDM/CM
    if (defMids[0] && !usedIds.has(defMids[0].id)) {
      result[0] = defMids[0];
      usedIds.add(defMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CDM || p.position === Position.CM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: Defensive mid (second) - CDM/CM
    if (defMids[1] && !usedIds.has(defMids[1].id)) {
      result[1] = defMids[1];
      usedIds.add(defMids[1].id);
    } else if (defMids[0] && !usedIds.has(defMids[0].id)) {
      result[1] = defMids[0];
      usedIds.add(defMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CDM || p.position === Position.CM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Left wing (LM/LW only)
    if (lwLm[0] && !usedIds.has(lwLm[0].id)) {
      result[2] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Central attacking mid - CAM
    if (camPlayer[0] && !usedIds.has(camPlayer[0].id)) {
      result[3] = camPlayer[0];
      usedIds.add(camPlayer[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 4: Right wing (RM/RW only)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[4] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[4] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 5);
    
    // Fill remaining slots if needed
    if (mid.length < 5) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 5 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "5-4-1" && midCount === 4) {
    // For 5-4-1: [CM/CDM, CM/CDM, LM/LW, RM/RW]
    // Positions 0,1: Center midfielders (CM/CDM) - merkez
    // Positions 2,3: Wing players (LM/LW, RM/RW) - kanat ileride
    
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Positions 0,1: Center mids - CM/CDM
    const centerMids = [...cms, ...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 2: Left wing - LM/LW
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 3: Right wing - RM/RW
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [CM/CDM (0), CM/CDM (1), LM/LW (2), RM/RW (3)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: Center mid (first) - CM/CDM
    if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[0] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: Center mid (second) - CM/CDM
    if (centerMids[1] && !usedIds.has(centerMids[1].id)) {
      result[1] = centerMids[1];
      usedIds.add(centerMids[1].id);
    } else if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[1] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Left wing (LM/LW only)
    if (lwLm[0] && !usedIds.has(lwLm[0].id)) {
      result[2] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Right wing (RM/RW only)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[3] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 4);
    
    // Fill remaining slots if needed
    if (mid.length < 4) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 4 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "3-4-3" && midCount === 4) {
    // For 3-4-3: [CM/CDM, CM/CDM, LM/LW, RM/RW]
    // Positions 0,1: Center midfielders (CM/CDM) - merkez
    // Positions 2,3: Wing players (LM/LW, RM/RW) - kanat
    
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Positions 0,1: Center mids - CM/CDM
    const centerMids = [...cms, ...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 2: Left wing - LM/LW
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 3: Right wing - RM/RW
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [CM/CDM (0), CM/CDM (1), LM/LW (2), RM/RW (3)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: Center mid (first) - CM/CDM
    if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[0] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: Center mid (second) - CM/CDM
    if (centerMids[1] && !usedIds.has(centerMids[1].id)) {
      result[1] = centerMids[1];
      usedIds.add(centerMids[1].id);
    } else if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[1] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Left wing (LM/LW only)
    if (lwLm[0] && !usedIds.has(lwLm[0].id)) {
      result[2] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Right wing (RM/RW only)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[3] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 4);
    
    // Fill remaining slots if needed
    if (mid.length < 4) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 4 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "3-4-2-1" && midCount === 6) {
    // For 3-4-2-1: 4 Mid (2 kanat + 2 merkez) + 2 CAM ileride
    // Positions 0,1: Center mids (CM/CDM) - merkez
    // Positions 2,3: Wing players (LM/LW/RM/RW) - kanat (kanat bek veya orta saha kanat)
    // Positions 4,5: CAM - ileride
    
    // Get wing players from forwards and wingbacks
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Get wingbacks as they can play as wing mids
    const wingBacks = uniquePlayers.filter(p => [Position.LWB, Position.RWB, Position.LB, Position.RB].includes(p.position));
    const lwbPlayers = wingBacks.filter(p => [Position.LWB, Position.LB].includes(p.position));
    const rwbPlayers = wingBacks.filter(p => [Position.RWB, Position.RB].includes(p.position));
    
    // Positions 0,1: Center mids - CM/CDM
    const centerMids = [...cms, ...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 2: Left wing - LM/LW/LWB/LB
    const lwLmLwb = [...lm, ...lwPlayers, ...lwbPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 3: Right wing - RM/RW/RWB/RB
    const rwRmRwb = [...rm, ...rwPlayers, ...rwbPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Positions 4,5: CAM
    const camPlayers = [...cam].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Build: [CM/CDM (0), CM/CDM (1), LM/LW/LWB (2), RM/RW/RWB (3), CAM (4), CAM (5)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: Center mid (first) - CM/CDM
    if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[0] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: Center mid (second) - CM/CDM
    if (centerMids[1] && !usedIds.has(centerMids[1].id)) {
      result[1] = centerMids[1];
      usedIds.add(centerMids[1].id);
    } else if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[1] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: Left wing (LM/LW/LWB/LB)
    if (lwLmLwb[0] && !usedIds.has(lwLmLwb[0].id)) {
      result[2] = lwLmLwb[0];
      usedIds.add(lwLmLwb[0].id);
    } else {
      const allLeftWing = [...allMids.filter(p => (p.position === Position.LM || p.position === Position.LW)), ...lwPlayers, ...lwbPlayers];
      const fallback = allLeftWing.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Right wing (RM/RW/RWB/RB)
    if (rwRmRwb[0] && !usedIds.has(rwRmRwb[0].id)) {
      result[3] = rwRmRwb[0];
      usedIds.add(rwRmRwb[0].id);
    } else {
      const allRightWing = [...allMids.filter(p => (p.position === Position.RM || p.position === Position.RW)), ...rwPlayers, ...rwbPlayers];
      const fallback = allRightWing.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 4: CAM (first)
    if (camPlayers[0] && !usedIds.has(camPlayers[0].id)) {
      result[4] = camPlayers[0];
      usedIds.add(camPlayers[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[4] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 5: CAM (second)
    if (camPlayers[1] && !usedIds.has(camPlayers[1].id)) {
      result[5] = camPlayers[1];
      usedIds.add(camPlayers[1].id);
    } else if (camPlayers[0] && !usedIds.has(camPlayers[0].id)) {
      result[5] = camPlayers[0];
      usedIds.add(camPlayers[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[5] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 6);
    
    // Fill remaining slots if needed
    if (mid.length < 6) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 6 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "5-3-2" && midCount === 3) {
    // For 5-3-2: [CM/CDM, CM/CDM, CAM]
    // Positions 0,1: Center midfielders (CM/CDM) - merkez
    // Position 2: CAM - ileride
    
    // Positions 0,1: Center mids - CM/CDM
    const centerMids = [...cms, ...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 2: CAM
    const camPlayer = [...cam].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [CM/CDM (0), CM/CDM (1), CAM (2)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: Center mid (first) - CM/CDM
    if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[0] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: Center mid (second) - CM/CDM
    if (centerMids[1] && !usedIds.has(centerMids[1].id)) {
      result[1] = centerMids[1];
      usedIds.add(centerMids[1].id);
    } else if (centerMids[0] && !usedIds.has(centerMids[0].id)) {
      result[1] = centerMids[0];
      usedIds.add(centerMids[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) || 
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: CAM
    if (camPlayer[0] && !usedIds.has(camPlayer[0].id)) {
      result[2] = camPlayer[0];
      usedIds.add(camPlayer[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 3);
    
    // Fill remaining slots if needed
    if (mid.length < 3) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 3 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else if (formation === "4-1-4-1" && midCount === 5) {
    // For 4-1-4-1: [CDM, CAM, CAM, LM/LW, RM/RW]
    // Position 0: CDM - geride
    // Positions 1,2: CAM - ileride
    // Positions 3,4: Wing players (LM/LW, RM/RW) - kanat ileride
    
    // Get wing players from forwards (LW/RW are in forwards, not midfield)
    const allFwds = uniquePlayers.filter(isFwd);
    const lwPlayers = allFwds.filter(p => p.position === Position.LW);
    const rwPlayers = allFwds.filter(p => p.position === Position.RW);
    
    // Position 0: CDM
    const cdmPlayer = [...dm].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Positions 1,2: CAM
    const camPlayers = [...cam].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 2);
    
    // Position 3: Left wing - LM/LW
    const lwLm = [...lm, ...lwPlayers, ...allMids.filter(p => p.position === Position.LM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Position 4: Right wing - RM/RW
    const rwRm = [...rm, ...rwPlayers, ...allMids.filter(p => p.position === Position.RM)].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 1);
    
    // Build: [CDM (0), CAM (1), CAM (2), LM/LW (3), RM/RW (4)]
    const usedIds = new Set<string>();
    const result: Player[] = [];
    
    // Position 0: CDM
    if (cdmPlayer[0] && !usedIds.has(cdmPlayer[0].id)) {
      result[0] = cdmPlayer[0];
      usedIds.add(cdmPlayer[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CDM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CDM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[0] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 1: CAM (first)
    if (camPlayers[0] && !usedIds.has(camPlayers[0].id)) {
      result[1] = camPlayers[0];
      usedIds.add(camPlayers[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[1] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 2: CAM (second)
    if (camPlayers[1] && !usedIds.has(camPlayers[1].id)) {
      result[2] = camPlayers[1];
      usedIds.add(camPlayers[1].id);
    } else if (camPlayers[0] && !usedIds.has(camPlayers[0].id)) {
      result[2] = camPlayers[0];
      usedIds.add(camPlayers[0].id);
    } else {
      const fallback = allMids.find(p => p.position === Position.CAM && !usedIds.has(p.id)) ||
                       allMids.find(p => (p.position === Position.CM || p.position === Position.CAM) && !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[2] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 3: Left wing (LM/LW only)
    if (lwLm[0] && !usedIds.has(lwLm[0].id)) {
      result[3] = lwLm[0];
      usedIds.add(lwLm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.LM || p.position === Position.LW) && !usedIds.has(p.id)) || 
                       lwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[3] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    // Position 4: Right wing (RM/RW only)
    if (rwRm[0] && !usedIds.has(rwRm[0].id)) {
      result[4] = rwRm[0];
      usedIds.add(rwRm[0].id);
    } else {
      const fallback = allMids.find(p => (p.position === Position.RM || p.position === Position.RW) && !usedIds.has(p.id)) || 
                       rwPlayers.find(p => !usedIds.has(p.id)) ||
                       allMids.find(p => !usedIds.has(p.id));
      if (fallback) {
        result[4] = fallback;
        usedIds.add(fallback.id);
      }
    }
    
    mid = result.filter(p => p !== undefined).slice(0, 5);
    
    // Fill remaining slots if needed
    if (mid.length < 5) {
      const usedIds = new Set(mid.map(p => p.id));
      const remaining = allMids.filter(p => !usedIds.has(p.id));
      while (mid.length < 5 && remaining.length > 0) {
        mid.push(remaining.shift()!);
      }
    }
  } else {
    // Default: normal order
    mid = [
      ...dm,
      ...cms,
      ...cam,
      ...lm,
      ...rm,
      ...allMids.filter(p => !dm.includes(p) && !cms.includes(p) && !cam.includes(p) && !lm.includes(p) && !rm.includes(p)).slice(0, Math.max(0, midCount - dm.length - cms.length - cam.length - lm.length - rm.length))
    ].slice(0, midCount);
  }
  
  // Forwards: prioritize specific positions (LW, ST, RW) - LEFT TO RIGHT ORDER
  // If playerSlotMap is provided, use it to place players in correct positions
  const allFwds = uniquePlayers.filter(isFwd).sort((a, b) => b.rating - a.rating);
  const lwPlayers = allFwds.filter(p => p.position === Position.LW);
  const stPlayers = allFwds.filter(p => [Position.ST, Position.CF].includes(p.position)).sort((a, b) => b.rating - a.rating);
  const rwPlayers = allFwds.filter(p => p.position === Position.RW);
  
  // Build forward line: LW, ST, RW (left to right) - STRICTLY respect actual positions
  const finalFwd: Player[] = [];
  const usedFwdIds = new Set<string>(); // Track used forward IDs to prevent duplicates
  
  // Use forwardLine to maintain correct slot positions when playerSlotMap is provided
  let forwardLine: (Player | null)[] | null = null;
  
  if (playerSlotMap && showEmptySlots) {
    // Use playerSlotMap to place players in correct positions
    forwardLine = Array(fwdCount).fill(null) as (Player | null)[];
    
    // First, place players according to playerSlotMap
    // Iterate through playerSlotMap to find all forwards, regardless of their actual position
    Object.keys(playerSlotMap).forEach(playerId => {
      const slotInfo = playerSlotMap[playerId];
      if (slotInfo && (slotInfo.position === Position.LW || slotInfo.position === Position.ST || slotInfo.position === Position.RW || slotInfo.position === Position.CF || 
                       slotInfo.position === Position.LM || slotInfo.position === Position.RM)) {
        // Find the player in playerSource (allPlayers if provided, otherwise players)
        const player = playerSource.find(p => p.id === playerId);
        if (player) {
          // Ensure slotIndex is valid
          if (slotInfo.slotIndex >= 0 && slotInfo.slotIndex < fwdCount) {
            // Directly place player at slotIndex, regardless of position matching
            forwardLine[slotInfo.slotIndex] = player;
            usedFwdIds.add(player.id);
          }
        } else {
          // Try to find in players array as fallback
          const fallbackPlayer = players.find(p => p.id === playerId);
          if (fallbackPlayer && slotInfo.slotIndex >= 0 && slotInfo.slotIndex < fwdCount) {
            forwardLine[slotInfo.slotIndex] = fallbackPlayer;
            usedFwdIds.add(fallbackPlayer.id);
          }
        }
      }
    });
    
    // CRITICAL FIX: Fill empty forward slots based on formation
    if (fwdCount >= 3) {
      // 3 forwards: LW (index 0), ST (index 1), RW (index 2)
      if (forwardLine[0] === null) {
        const lwPlayer = playerSource.find(p => p.position === Position.LW && !usedFwdIds.has(p.id));
        if (lwPlayer) {
          forwardLine[0] = lwPlayer;
          usedFwdIds.add(lwPlayer.id);
        } else {
          // If no LW player found, try to find any forward that can play LW
          const anyFwd = playerSource.find(p => (p.position === Position.LW || p.position === Position.LM || p.position === Position.ST) && !usedFwdIds.has(p.id));
          if (anyFwd) {
            forwardLine[0] = anyFwd;
            usedFwdIds.add(anyFwd.id);
          }
        }
      }
    } else if (fwdCount === 2) {
      // 2 forwards: ST (index 0), ST or wing (index 1)
      // Fill index 0 (left) if empty
      if (forwardLine[0] === null) {
        const stPlayer = playerSource.find(p => [Position.ST, Position.CF].includes(p.position) && !usedFwdIds.has(p.id));
        if (stPlayer) {
          forwardLine[0] = stPlayer;
          usedFwdIds.add(stPlayer.id);
        } else {
          // If no ST found, use any forward
          const anyFwd = playerSource.find(p => isFwd(p) && !usedFwdIds.has(p.id));
          if (anyFwd) {
            forwardLine[0] = anyFwd;
            usedFwdIds.add(anyFwd.id);
          }
        }
      }
      // Fill index 1 (right) if empty
      if (forwardLine[1] === null) {
        const wings = [...lwPlayers, ...rwPlayers].filter(p => !usedFwdIds.has(p.id));
        if (wings.length > 0) {
          forwardLine[1] = wings[0];
          usedFwdIds.add(wings[0].id);
        } else {
          // If no wings, use second ST or any forward
          const stPlayer = playerSource.find(p => [Position.ST, Position.CF].includes(p.position) && !usedFwdIds.has(p.id));
          if (stPlayer) {
            forwardLine[1] = stPlayer;
            usedFwdIds.add(stPlayer.id);
          } else {
            const anyFwd = playerSource.find(p => isFwd(p) && !usedFwdIds.has(p.id));
            if (anyFwd) {
              forwardLine[1] = anyFwd;
              usedFwdIds.add(anyFwd.id);
            }
          }
        }
      }
    }
    
    // Convert forwardLine to finalFwd, preserving null slots for empty positions
    // This ensures the order matches the visual slots (LW at index 0, ST at index 1, RW at index 2)
    if (forwardLine) {
      finalFwd.push(...forwardLine.filter(p => p !== null) as Player[]);
    }
    
    // DO NOT fill remaining slots automatically - keep them empty if playerSlotMap is provided
    // This ensures players stay in their assigned positions
  } else {
    // Original logic when playerSlotMap is not provided
    if (fwdCount >= 3) {
      // 3 forwards: MUST be LW (left), ST (center), RW (right)
      // CRITICAL: ST players ALWAYS go in the center (index 1), never on wings
      // Special handling for 3-4-3: 1 santrafor + 2 kanat (LW, ST, RW)
      
      const forwardLine: (Player | null)[] = [null, null, null];
      
      if (formation === "3-4-3") {
        // For 3-4-3: 1 santrafor + 2 kanat (LW, ST, RW)
        // Step 1: Place ST in center FIRST (index 1) - ST NEVER goes to wings
        if (stPlayers.length > 0 && !usedFwdIds.has(stPlayers[0].id)) {
          forwardLine[1] = stPlayers[0]; // ST always in center position
          usedFwdIds.add(stPlayers[0].id);
        }
        
        // Step 2: Place LW on left (index 0) - kanat
        if (lwPlayers.length > 0 && !usedFwdIds.has(lwPlayers[0].id)) {
          forwardLine[0] = lwPlayers[0];
          usedFwdIds.add(lwPlayers[0].id);
        } else {
          // No LW - use best available wing that's NOT ST and NOT already used
          const remaining = allFwds.filter(p => (p.position === Position.LW || p.position === Position.RW) && !usedFwdIds.has(p.id));
          if (remaining.length > 0) {
            forwardLine[0] = remaining[0];
            usedFwdIds.add(remaining[0].id);
          } else {
            // Fallback: any forward that's NOT ST
            const fallback = allFwds.find(p => p.position !== Position.ST && p.position !== Position.CF && !usedFwdIds.has(p.id));
            if (fallback) {
              forwardLine[0] = fallback;
              usedFwdIds.add(fallback.id);
            }
          }
        }
        
        // Step 3: Place RW on right (index 2) - kanat
        if (rwPlayers.length > 0 && !usedFwdIds.has(rwPlayers[0].id)) {
          forwardLine[2] = rwPlayers[0];
          usedFwdIds.add(rwPlayers[0].id);
        } else {
          // No RW - use best available wing that's NOT ST and NOT already used
          const remaining = allFwds.filter(p => (p.position === Position.LW || p.position === Position.RW) && !usedFwdIds.has(p.id));
          if (remaining.length > 0) {
            forwardLine[2] = remaining[0];
            usedFwdIds.add(remaining[0].id);
          } else {
            // Fallback: any forward that's NOT ST
            const fallback = allFwds.find(p => p.position !== Position.ST && p.position !== Position.CF && !usedFwdIds.has(p.id));
            if (fallback) {
              forwardLine[2] = fallback;
              usedFwdIds.add(fallback.id);
            }
          }
        }
      } else {
        // For other 3-forward formations (like 4-3-3)
        // Step 1: Place ST in center FIRST (index 1) - ST NEVER goes to wings
        if (stPlayers.length > 0 && !usedFwdIds.has(stPlayers[0].id)) {
          forwardLine[1] = stPlayers[0]; // ST always in center position
          usedFwdIds.add(stPlayers[0].id);
        }
        
        // Step 2: Place LW on left (index 0)
        if (lwPlayers.length > 0 && !usedFwdIds.has(lwPlayers[0].id)) {
          forwardLine[0] = lwPlayers[0];
          usedFwdIds.add(lwPlayers[0].id);
        } else {
          // No LW - use best available that's NOT ST and NOT already used
          const remaining = allFwds.filter(p => !usedFwdIds.has(p.id) && !stPlayers.slice(0, 1).some(st => st.id === p.id));
          if (remaining.length > 0) {
            forwardLine[0] = remaining[0];
            usedFwdIds.add(remaining[0].id);
          }
        }
        
        // Step 3: Place RW on right (index 2)
        if (rwPlayers.length > 0 && !usedFwdIds.has(rwPlayers[0].id)) {
          forwardLine[2] = rwPlayers[0];
          usedFwdIds.add(rwPlayers[0].id);
        } else {
          // No RW - use best available that's NOT ST and NOT already used
          const remaining = allFwds.filter(p => !usedFwdIds.has(p.id) && !stPlayers.slice(0, 1).some(st => st.id === p.id));
          if (remaining.length > 0) {
            forwardLine[2] = remaining[0];
            usedFwdIds.add(remaining[0].id);
          }
        }
      }
      
      // Convert to final array, filtering out nulls
      finalFwd.push(...forwardLine.filter(p => p !== null) as Player[]);
    } else if (fwdCount === 2) {
      // 2 forwards: ST in center, then best wing
      // Special handling for 5-3-2: 2 santrafor
      if (formation === "5-3-2") {
        // For 5-3-2: 2 santrafor
        if (stPlayers.length > 0 && !usedFwdIds.has(stPlayers[0].id)) {
          finalFwd.push(stPlayers[0]);
          usedFwdIds.add(stPlayers[0].id);
        }
        if (stPlayers.length > 1 && !usedFwdIds.has(stPlayers[1].id)) {
          finalFwd.push(stPlayers[1]);
          usedFwdIds.add(stPlayers[1].id);
        } else if (stPlayers.length > 0) {
          // If only one ST, use any forward that's not already used
          const fallback = allFwds.find(p => [Position.ST, Position.CF].includes(p.position) && !usedFwdIds.has(p.id));
          if (fallback) {
            finalFwd.push(fallback);
            usedFwdIds.add(fallback.id);
          }
        }
      } else {
        // For other 2-forward formations (like 4-4-2, 3-5-2)
        if (stPlayers.length > 0 && !usedFwdIds.has(stPlayers[0].id)) {
          finalFwd.push(stPlayers[0]);
          usedFwdIds.add(stPlayers[0].id);
        }
        const wings = [...lwPlayers, ...rwPlayers].filter(p => !usedFwdIds.has(p.id));
        if (wings.length > 0) {
          finalFwd.push(wings[0]);
          usedFwdIds.add(wings[0].id);
        } else if (stPlayers.length > 1 && !usedFwdIds.has(stPlayers[1].id)) {
          finalFwd.push(stPlayers[1]);
          usedFwdIds.add(stPlayers[1].id);
        }
      }
    } else if (fwdCount === 1) {
      // 1 forward: ST
      if (stPlayers.length > 0 && !usedFwdIds.has(stPlayers[0].id)) {
        finalFwd.push(stPlayers[0]);
        usedFwdIds.add(stPlayers[0].id);
      }
    }
  }
  
  // Final safety check: ensure we have the right number (with duplicate prevention)
  while (finalFwd.length < fwdCount && allFwds.length > finalFwd.length) {
    const remaining = allFwds.filter(p => !usedFwdIds.has(p.id));
    if (remaining.length > 0) {
      finalFwd.push(remaining[0]);
      usedFwdIds.add(remaining[0].id);
    } else break;
  }

  // Create empty slots if showEmptySlots is true
  const createEmptySlot = (position: Position, index: number): Player => ({
    id: `empty-${position}-${index}`,
    name: '',
    position: position,
    age: 0,
    rating: 0,
    potential: 0,
    marketValue: 0,
    trueValue: 0,
    scouted: false,
    contract: { wage: 0, yearsLeft: 0, performanceBonus: 0 }
  });

  // Fallback if positions are messy - use first 11 players
  let displaySquad = {
    gk: gk.length ? gk : (showEmptySlots ? [createEmptySlot(Position.GK, 0)] : uniquePlayers.slice(0, 1)),
    def: def.length >= defCount ? def : (showEmptySlots ? Array(defCount).fill(null).map((_, i) => {
      const positions = defCount === 3 ? [Position.CB, Position.CB, Position.CB] :
                       defCount === 4 ? [Position.LB, Position.CB, Position.CB, Position.RB] :
                       [Position.LB, Position.CB, Position.CB, Position.CB, Position.RB];
      return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.CB, i);
    }) : uniquePlayers.slice(1, 1 + defCount)),
    mid: mid.length >= midCount ? mid : (showEmptySlots ? Array(midCount).fill(null).map((_, i) => createEmptySlot(Position.CM, i)) : uniquePlayers.slice(1 + defCount, 1 + defCount + midCount)),
    fwd: finalFwd.length >= fwdCount ? finalFwd : (showEmptySlots ? Array(fwdCount).fill(null).map((_, i) => {
      const positions = fwdCount === 1 ? [Position.ST] :
                       fwdCount === 2 ? [Position.ST, Position.ST] :
                       [Position.LW, Position.ST, Position.RW];
      return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.ST, i);
    }) : uniquePlayers.slice(1 + defCount + midCount, 1 + defCount + midCount + fwdCount))
  };

  // Ensure correct count for empty slots when showEmptySlots is true
  if (showEmptySlots) {
    // Always show GK slot
    displaySquad.gk = gk.length ? gk : [createEmptySlot(Position.GK, 0)];
    
    // Always show exact number of defender slots
    // If defLine exists (from playerSlotMap), use it to preserve exact positions
    if (defLine) {
      displaySquad.def = defLine.map((p, i) => {
        if (p) return p;
        const positions = defCount === 3 ? [Position.CB, Position.CB, Position.CB] :
                         defCount === 4 ? [Position.LB, Position.CB, Position.CB, Position.RB] :
                         [Position.LB, Position.CB, Position.CB, Position.CB, Position.RB];
        return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.CB, i);
      });
    } else {
      displaySquad.def = Array(defCount).fill(null).map((_, i) => {
        if (def[i]) return def[i];
        const positions = defCount === 3 ? [Position.CB, Position.CB, Position.CB] :
                         defCount === 4 ? [Position.LB, Position.CB, Position.CB, Position.RB] :
                         [Position.LB, Position.CB, Position.CB, Position.CB, Position.RB];
        return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.CB, i);
      });
    }
    
    // Always show exact number of midfielder slots
    // If midLine exists (from playerSlotMap), use it to preserve exact positions
    if (midLine) {
      displaySquad.mid = midLine.map((p, i) => {
        if (p) return p;
        // Center position (index 1) is CDM, sides (0 and 2) are CM for 4-3-3
        const position = (formation === "4-3-3" && midCount === 3 && i === 1) ? Position.CDM : Position.CM;
        return createEmptySlot(position, i);
      });
    } else {
      // Special handling for 4-3-3: CDM in center behind, CM/CAM on sides in front
      if (formation === "4-3-3" && midCount === 3) {
        displaySquad.mid = Array(midCount).fill(null).map((_, i) => {
          if (mid[i]) return mid[i];
          // Center position (index 1) is CDM, sides (0 and 2) are CM
          const position = i === 1 ? Position.CDM : Position.CM;
          return createEmptySlot(position, i);
        });
      } else {
        displaySquad.mid = Array(midCount).fill(null).map((_, i) => {
          if (mid[i]) return mid[i];
          return createEmptySlot(Position.CM, i);
        });
      }
    }
    
    // Always show exact number of forward slots
    // If forwardLine exists (from playerSlotMap), use it to preserve exact positions
    if (forwardLine) {
      displaySquad.fwd = forwardLine.map((p, i) => {
        if (p && p.id && !p.id.startsWith('empty-')) {
          // Debug log for LW players in displaySquad
          if (p.position === Position.LW) {
            console.log(`[TacticsBoard] Adding LW player ${p.name} to displaySquad.fwd at index ${i}`);
          }
          return p;
        }
        const positions = fwdCount === 1 ? [Position.ST] :
                         fwdCount === 2 ? [Position.ST, Position.ST] :
                         [Position.LW, Position.ST, Position.RW];
        return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.ST, i);
      });
      console.log('[TacticsBoard] Final displaySquad.fwd:', displaySquad.fwd.map((p, i) => ({ index: i, player: p?.name || 'empty', id: p?.id || 'empty', position: p?.position || 'empty' })));
    } else {
      displaySquad.fwd = Array(fwdCount).fill(null).map((_, i) => {
        if (finalFwd[i]) return finalFwd[i];
        const positions = fwdCount === 1 ? [Position.ST] :
                         fwdCount === 2 ? [Position.ST, Position.ST] :
                         [Position.LW, Position.ST, Position.RW];
        return createEmptySlot(positions[Math.min(i, positions.length - 1)] || Position.ST, i);
      });
    }
  }

  // Get card style based on rating (matching PlayerCard component)
  const getCardStyle = (rating: number) => {
    if (rating >= 90) return "bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border-blue-400/50 text-blue-50 shadow-blue-900/50 ring-1 ring-blue-400/30";
    if (rating >= 85) return "bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 border-emerald-500/50 text-white shadow-emerald-900/50 ring-1 ring-emerald-500/30";
    if (rating >= 75) return "bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 border-yellow-300/50 text-yellow-50 shadow-yellow-600/50 ring-1 ring-yellow-400/30";
    if (rating >= 65) return "bg-gradient-to-br from-zinc-400 via-zinc-300 to-zinc-500 border-zinc-200/50 text-zinc-900 shadow-zinc-500/50";
    return "bg-gradient-to-br from-orange-700 via-orange-600 to-orange-800 border-orange-400/50 text-orange-100 shadow-orange-700/50";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const renderRow = (rowPlayers: Player[]) => {
    const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
    const gapSize = compact ? 'gap-2' : 'gap-3 md:gap-5';
    const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
    const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
    
    return (
      <div className={`flex justify-center items-center ${gapSize} w-full`}>
        {rowPlayers.map((p, index) => {
          // Only consider empty if it's explicitly an empty slot (starts with 'empty-') or is null/undefined
          // Don't mark players with rating 0 as empty - they are real players
          const isEmpty = showEmptySlots && (!p || (p.id && p.id.startsWith('empty-')));
          return (
            <div 
              key={p?.id || `empty-${index}`} 
              className="flex flex-col items-center group cursor-pointer relative"
              onDragOver={!readOnly ? handleDragOver : undefined}
              onDrop={!readOnly && onPlayerDrop ? (e) => onPlayerDrop(e, p?.id) : undefined}
            >
              <div className="relative">
                {isEmpty ? (
                  <div 
                    onClick={!readOnly ? (e) => {
                      e.stopPropagation();
                      if (onEmptySlotClick && p) {
                        onEmptySlotClick(p.position, index);
                      }
                    } : undefined}
                    className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                  >
                    <span className="text-zinc-500 text-[10px]">+</span>
                  </div>
                ) : p ? (
                  <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
            {p.rating}
                  </div>
                ) : null}
                {/* Position Badge - Show for both empty and filled slots */}
                {p && (
                  <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                    {translatePosition(p.position)}
                  </div>
                )}
                {/* Remove Button */}
                {!readOnly && onPlayerRemove && p && !isEmpty && !compact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayerRemove(p.id);
                    }}
                    className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from starting XI"
                  >
                    ×
                  </button>
                )}
            {/* Tooltip */}
                {p && !isEmpty && !compact && (
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                  </div>
                )}
              </div>
              {p && !isEmpty && !compact && (
                <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                  {p.name.split(' ').pop()}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
  };

  const containerClass = compact 
    ? "aspect-[3/4] w-full max-w-[200px] landscape:max-w-[240px] md:max-w-[280px] mx-auto bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-emerald-950/40 rounded-lg border border-emerald-500/20 relative shadow-lg overflow-visible p-3 flex flex-col justify-between py-3 backdrop-blur-sm"
    : "aspect-[3/4] md:aspect-[2/3] w-full max-w-[380px] mx-auto bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-emerald-950/40 rounded-2xl border border-emerald-500/20 relative shadow-2xl overflow-visible p-5 flex flex-col justify-between py-6 backdrop-blur-sm";

  return (
    <div 
      className={containerClass}
      onDragOver={handleDragOver}
      onDrop={(e) => onPlayerDrop && onPlayerDrop(e)}
    >
      {/* Subtle grass texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/grass.png')] pointer-events-none"></div>
      
      {/* Pitch markings - more subtle and modern */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-400/30"></div>
         <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${compact ? 'w-16 h-16 landscape:w-20 landscape:h-20' : 'w-20 h-20 md:w-24 md:h-24'} border border-emerald-400/30 rounded-full`}></div>
         <div className={`absolute top-0 left-1/4 w-1/2 ${compact ? 'h-6 landscape:h-8' : 'h-10 md:h-12'} border-b border-l border-r border-emerald-400/30 rounded-t-lg`}></div>
         <div className={`absolute bottom-0 left-1/4 w-1/2 ${compact ? 'h-6 landscape:h-8' : 'h-10 md:h-12'} border-t border-l border-r border-emerald-400/30 rounded-b-lg`}></div>
      </div>

      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl"></div>

      {/* Players */}
      <div className="z-10 h-full flex flex-col justify-between relative">
        <div className="mt-3 md:mt-4">
        {renderRow(displaySquad.fwd)}
        </div>
        {/* Special layout for 3-5-2: 1,3,5 (forwards) in front row, 2,4 (defensive) in back row */}
        {formation === "3-5-2" && midCount === 5 ? (
          <div className="flex flex-col items-center mt-auto mb-8 md:mb-12" style={{ gap: compact ? '0.25rem' : '0.5rem' }}>
            {/* Attacking midfielders (1,3,5) - front row (closer to forwards) - wings (1,5) wider, center (3) in middle */}
            <div className="flex justify-between items-center w-full -mt-7 px-2 md:px-4">
              {/* Left wing (1) */}
              <div className="flex flex-col items-center">
                {(() => {
                  const p = displaySquad.mid[0];
                  if (!p) return <div className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                  const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                  const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
                  const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                  const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
                  return (
                    <div 
                      key={p?.id || `empty-0`} 
                      className="flex flex-col items-center group cursor-pointer relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                    >
                      <div className="relative">
                        {isEmpty ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEmptySlotClick && p) {
                                onEmptySlotClick(p.position, 0);
                              }
                            }}
                            className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                          >
                            <span className="text-zinc-500 text-[10px]">+</span>
                          </div>
                        ) : p ? (
                          <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                            {p.rating}
                          </div>
                        ) : null}
                        {p && (
                          <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                            {translatePosition(p.position)}
                          </div>
                        )}
                        {onPlayerRemove && p && !isEmpty && !compact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayerRemove(p.id);
                            }}
                            className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from starting XI"
                          >
                            ×
                          </button>
                        )}
                        {p && !isEmpty && !compact && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                            <div className="font-bold">{p.name}</div>
                            <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                          </div>
                        )}
                      </div>
                      {p && !isEmpty && !compact && (
                        <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                          {p.name.split(' ').pop()}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Center attacking mid (3) */}
              <div className="flex flex-col items-center">
                {(() => {
                  const p = displaySquad.mid[2];
                  if (!p) return <div className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                  const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                  const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
                  const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                  const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
                  return (
                    <div 
                      key={p?.id || `empty-2`} 
                      className="flex flex-col items-center group cursor-pointer relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                    >
                      <div className="relative">
                        {isEmpty ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEmptySlotClick && p) {
                                onEmptySlotClick(p.position, 2);
                              }
                            }}
                            className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                          >
                            <span className="text-zinc-500 text-[10px]">+</span>
                          </div>
                        ) : p ? (
                          <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                            {p.rating}
                          </div>
                        ) : null}
                        {p && (
                          <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                            {translatePosition(p.position)}
                          </div>
                        )}
                        {onPlayerRemove && p && !isEmpty && !compact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayerRemove(p.id);
                            }}
                            className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from starting XI"
                          >
                            ×
                          </button>
                        )}
                        {p && !isEmpty && !compact && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                            <div className="font-bold">{p.name}</div>
                            <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                          </div>
                        )}
                      </div>
                      {p && !isEmpty && !compact && (
                        <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                          {p.name.split(' ').pop()}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Right wing (5) */}
              <div className="flex flex-col items-center">
                {(() => {
                  const p = displaySquad.mid[4];
                  if (!p) return <div className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                  const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                  const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
                  const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                  const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
                  return (
                    <div 
                      key={p?.id || `empty-4`} 
                      className="flex flex-col items-center group cursor-pointer relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                    >
                      <div className="relative">
                        {isEmpty ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEmptySlotClick && p) {
                                onEmptySlotClick(p.position, 4);
                              }
                            }}
                            className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                          >
                            <span className="text-zinc-500 text-[10px]">+</span>
                          </div>
                        ) : p ? (
                          <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                            {p.rating}
                          </div>
                        ) : null}
                        {p && (
                          <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                            {translatePosition(p.position)}
                          </div>
                        )}
                        {onPlayerRemove && p && !isEmpty && !compact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayerRemove(p.id);
                            }}
                            className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from starting XI"
                          >
                            ×
                          </button>
                        )}
                        {p && !isEmpty && !compact && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                            <div className="font-bold">{p.name}</div>
                            <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                          </div>
                        )}
                      </div>
                      {p && !isEmpty && !compact && (
                        <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                          {p.name.split(' ').pop()}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Defensive midfielders (2,4) - back row (closer to defense) */}
            <div className="flex justify-center items-center gap-3 md:gap-5 w-full mt-1 md:mt-2">
              {[null, displaySquad.mid[1], null, displaySquad.mid[3], null].map((p, index) => {
                if (p === null) {
                  return <div key={`spacer-${index}`} className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                }
                const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
                const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
                return (
                  <div 
                    key={p?.id || `empty-${index}`} 
                    className="flex flex-col items-center group cursor-pointer relative"
                    onDragOver={handleDragOver}
                    onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                  >
                    <div className="relative">
                      {isEmpty ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEmptySlotClick && p) {
                              onEmptySlotClick(p.position, index);
                            }
                          }}
                          className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                        >
                          <span className="text-zinc-500 text-[10px]">+</span>
                        </div>
                      ) : p ? (
                        <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                          {p.rating}
                        </div>
                      ) : null}
                      {p && (
                        <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                          {translatePosition(p.position)}
                        </div>
                      )}
                      {onPlayerRemove && p && !isEmpty && !compact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayerRemove(p.id);
                          }}
                          className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from starting XI"
                        >
                          ×
                        </button>
                      )}
                      {p && !isEmpty && !compact && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                        </div>
                      )}
                    </div>
                    {p && !isEmpty && !compact && (
                      <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                        {p.name.split(' ').pop()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : formation === "4-3-3" && midCount === 3 ? (
          <div className="flex flex-col items-center mt-auto mb-8 md:mb-12" style={{ gap: compact ? '0.25rem' : '0.5rem' }}>
            {/* Attacking midfielders (CM/CAM) - front row */}
            <div className="flex justify-center items-center gap-3 md:gap-5 w-full -mt-5">
              {[displaySquad.mid[0], null, displaySquad.mid[2]].map((p, index) => {
                if (p === null) {
                  return <div key={`spacer-${index}`} className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                }
                const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                const cardSize = compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14';
                const gapSize = compact ? 'gap-2' : 'gap-3 md:gap-5';
                const badgeSize = compact ? 'w-4.5 h-4.5 text-[8px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                const fontSize = compact ? 'text-[11px]' : 'text-sm md:text-base';
                return (
                  <div 
                    key={p?.id || `empty-${index}`} 
                    className="flex flex-col items-center group cursor-pointer relative"
                    onDragOver={handleDragOver}
                    onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                  >
                    <div className="relative">
                      {isEmpty ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEmptySlotClick && p) {
                              onEmptySlotClick(p.position, index);
                            }
                          }}
                          className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                        >
                          <span className="text-zinc-500 text-[10px]">+</span>
                        </div>
                      ) : p ? (
                        <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                          {p.rating}
                        </div>
                      ) : null}
                      {p && (
                        <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                          {translatePosition(p.position)}
                        </div>
                      )}
                      {onPlayerRemove && p && !isEmpty && !compact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayerRemove(p.id);
                          }}
                          className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from starting XI"
                        >
                          ×
                        </button>
                      )}
                      {p && !isEmpty && !compact && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                        </div>
                      )}
                    </div>
                    {p && !isEmpty && !compact && (
                      <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                        {p.name.split(' ').pop()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Defensive midfielder (CDM) - back row, centered */}
            <div className="flex justify-center items-center gap-3 md:gap-5 w-full -mt-1 md:-mt-2">
              {[null, displaySquad.mid[1], null].map((p, index) => {
                if (p === null) {
                  return <div key={`spacer-${index}`} className={compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} />;
                }
                const isEmpty = showEmptySlots && (!p || p.rating === 0 || (p.id && p.id.startsWith('empty-')));
                const cardSize = compact ? 'w-8 h-8' : 'w-12 h-12 md:w-14 md:h-14';
                const badgeSize = compact ? 'w-3 h-3 text-[6px]' : 'w-5 h-5 text-[8px] md:text-[9px]';
                const fontSize = compact ? 'text-[8px]' : 'text-sm md:text-base';
                return (
                  <div 
                    key={p?.id || `empty-${index}`} 
                    className="flex flex-col items-center group cursor-pointer relative"
                    onDragOver={handleDragOver}
                    onDrop={(e) => onPlayerDrop && onPlayerDrop(e, p?.id)}
                  >
                    <div className="relative">
                      {isEmpty ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEmptySlotClick && p) {
                              onEmptySlotClick(p.position, index);
                            }
                          }}
                          className={`${cardSize} rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 z-10 relative backdrop-blur-sm cursor-pointer`}
                        >
                          <span className="text-zinc-500 text-[10px]">+</span>
                        </div>
                      ) : p ? (
                        <div className={`${cardSize} rounded-lg ${getCardStyle(p.rating)} shadow-lg flex items-center justify-center font-black ${fontSize} transition-all duration-300 hover:scale-110 hover:shadow-xl z-10 relative backdrop-blur-sm`}>
                          {p.rating}
                        </div>
                      ) : null}
                      {p && (
                        <div className={`absolute -top-0.5 -right-0.5 bg-zinc-950/90 backdrop-blur-sm border border-white/20 rounded-full ${badgeSize} flex items-center justify-center font-black text-emerald-400 z-20`}>
                          {translatePosition(p.position)}
                        </div>
                      )}
                      {onPlayerRemove && p && !isEmpty && !compact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayerRemove(p.id);
                          }}
                          className="absolute -top-1 -left-1 bg-rose-500/90 hover:bg-rose-500 border border-rose-400/50 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from starting XI"
                        >
                          ×
                        </button>
                      )}
                      {p && !isEmpty && !compact && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-[9999] border border-white/10 shadow-2xl pointer-events-none">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-zinc-400 text-[10px] mt-0.5">{translatePosition(p.position)}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                        </div>
                      )}
                    </div>
                    {p && !isEmpty && !compact && (
                      <span className="text-[10px] md:text-xs bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1.5 text-white truncate max-w-[70px] border border-white/10 font-medium">
                        {p.name.split(' ').pop()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          renderRow(displaySquad.mid)
        )}
        <div className={formation === "3-5-2" ? "-mt-[25px]" : "-mt-[20px]"}>
        {renderRow(displaySquad.def)}
        </div>
        <div className={formation === "3-5-2" ? "mt-6 md:mt-8" : ""}>
        {renderRow(displaySquad.gk)}
        </div>
      </div>
    </div>
  );
};
