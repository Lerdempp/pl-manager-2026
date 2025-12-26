
import React, { useState } from 'react';
import { Player, Team, Position } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { TransferRecord } from '../services/cpuTransferService';

interface MarketViewProps {
  marketPlayers: Player[];
  team: Team;
  onBuy: (player: Player) => void;
  onBuyDirect: (player: Player) => void;
  onNegotiate: (player: Player) => void;
  onBack: () => void;
  onFinishWindow: () => void;
  onInspect?: (player: Player) => void;
  onToggleFavorite?: (player: Player) => void;
  favoritePlayerIds?: Set<string>;
  transferHistory?: TransferRecord[];
}

type SortColumn = 'name' | 'team' | 'age' | 'position' | 'rating' | 'potential' | 'fee' | 'wage' | null;
type SortDirection = 'asc' | 'desc' | null;

const MarketViewComponent: React.FC<MarketViewProps> = ({ marketPlayers, team, onBuy, onBuyDirect, onNegotiate, onBack, onFinishWindow, onInspect, onToggleFavorite, favoritePlayerIds = new Set(), transferHistory = [] }) => {
  const { translatePosition, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'market' | 'history'>('market');
  const [filterPos, setFilterPos] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getPosColor = (pos: Position) => {
    if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(pos)) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if ([Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(pos)) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  // Position filter helpers
  const isDefender = (p: Position) => [Position.LB, Position.RB, Position.CB, Position.LWB, Position.RWB].includes(p);
  const isMidfielder = (p: Position) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p);
  const isAttacker = (p: Position) => [Position.LW, Position.RW, Position.ST, Position.CF].includes(p);

  // Filter players by position
  const filteredPlayers = marketPlayers.filter(p => {
    if (filterPos === 'ALL') return true;
    if (filterPos === 'GK') return p.position === Position.GK;
    if (filterPos === 'DEF') return isDefender(p.position);
    if (filterPos === 'MID') return isMidfielder(p.position);
    if (filterPos === 'FWD') return isAttacker(p.position);
    return true;
  });

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'team':
        const marketA = a as any;
        const marketB = b as any;
        aValue = (marketA.teamName || "Free Agent").toLowerCase();
        bValue = (marketB.teamName || "Free Agent").toLowerCase();
        break;
      case 'age':
        aValue = a.age || 0;
        bValue = b.age || 0;
        break;
      case 'position':
        aValue = a.position;
        bValue = b.position;
        break;
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'potential':
        aValue = a.potential || 0;
        bValue = b.potential || 0;
        break;
      case 'fee':
        aValue = a.marketValue || 0;
        bValue = b.marketValue || 0;
        break;
      case 'wage':
        aValue = a.contract?.wage || 0;
        bValue = b.contract?.wage || 0;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? aValue - bValue
      : bValue - aValue;
  });

  // Handle column header click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Same column clicked - cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      // New column clicked - start with asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Get header class for active column
  const getHeaderClass = (column: SortColumn) => {
    const baseClass = "p-1.5 landscape:p-2 md:p-5 cursor-pointer hover:text-white transition-colors whitespace-nowrap";
    if (sortColumn === column) {
      return `${baseClass} text-blue-400 font-black`;
    }
    return `${baseClass} text-zinc-500`;
  };

  // Render sortable header with icon inline
  const renderSortableHeader = (column: SortColumn, label: string) => {
    const icon = getSortIcon(column);
    return (
      <th 
        onClick={() => handleSort(column)}
        className={getHeaderClass(column)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {icon && <span className="text-blue-400 flex-shrink-0">{icon}</span>}
        </span>
      </th>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pl-1 pt-1 pr-0.5 pb-0.5 landscape:pl-2 landscape:pt-2 landscape:pr-1 landscape:pb-1 md:pl-8 md:pt-8 md:pr-4 md:pb-4 gap-1 landscape:gap-2 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-end items-end bg-zinc-900/60 backdrop-blur-md p-1.5 landscape:p-2 md:p-8 rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-xl">
        <div className="mt-1 landscape:mt-1.5 md:mt-0 text-right p-1 landscape:p-1.5 md:p-4 bg-black/40 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5">
           <div className="text-[7px] landscape:text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">{t('budgetAvailable')}</div>
           <div className="text-sm landscape:text-base md:text-3xl font-mono font-bold text-emerald-400">{formatMoney(team.budget)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 landscape:gap-1 bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 p-0.5 w-full">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 px-2 landscape:px-2.5 md:px-6 py-1 landscape:py-1.5 md:py-3 rounded-md landscape:rounded-lg md:rounded-lg text-[8px] landscape:text-[9px] md:text-base font-bold transition-all whitespace-nowrap ${
            activeTab === 'market'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-transparent text-zinc-400 hover:text-white'
          }`}
        >
          {t('allPlayers')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-2 landscape:px-2.5 md:px-6 py-1 landscape:py-1.5 md:py-3 rounded-md landscape:rounded-lg md:rounded-lg text-[8px] landscape:text-[9px] md:text-base font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-transparent text-zinc-400 hover:text-white'
          }`}
        >
          {t('transferHistory')}
        </button>
      </div>

      {/* Market List */}
      {activeTab === 'market' && (
      <>
        {/* Position Filter */}
        <div className="flex gap-0.5 landscape:gap-1 bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 p-0.5 landscape:p-1 w-full">
          {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(pos => (
            <button
              key={pos}
              onClick={() => {
                setFilterPos(pos);
                // Reset sort when filter changes
                setSortColumn(null);
                setSortDirection(null);
              }}
              className={`flex-1 px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1.5 rounded-md landscape:rounded-lg md:rounded-lg text-[8px] landscape:text-[9px] md:text-xs font-bold tracking-wider border transition-all whitespace-nowrap ${
                filterPos === pos
                  ? 'bg-white text-black border-white shadow-lg'
                  : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              {pos === 'ALL' ? t('allPlayers') : pos}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-2xl flex flex-col relative min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar p-1 landscape:p-2 min-h-0">
              <div className="min-w-full inline-block">
              <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-zinc-950/50 sticky top-0 z-10 text-[11px] landscape:text-xs md:text-[10px] uppercase tracking-wider font-bold backdrop-blur-md">
                  <tr>
                  {renderSortableHeader('name', t('target'))}
                  {renderSortableHeader('team', t('team'))}
                  {renderSortableHeader('age', t('age'))}
                  {renderSortableHeader('position', t('pos'))}
                  {renderSortableHeader('rating', t('rating'))}
                  {renderSortableHeader('potential', t('potential'))}
                  {renderSortableHeader('fee', t('fee'))}
                  {renderSortableHeader('wage', t('wage'))}
                  <th className="p-1.5 landscape:p-2 md:p-5 text-right whitespace-nowrap">{t('action')}</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {sortedPlayers.map((player) => {
                    const marketPlayer = player as any;
                    const teamName = marketPlayer.teamName || t('freeAgent');
                    return (
                <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                    <td className="pl-1 landscape:pl-1.5 md:pl-5 pr-0 landscape:pr-0 md:pr-1 py-1.5 landscape:py-2 md:py-5">
                        <div className="font-bold text-zinc-100 text-sm landscape:text-base md:text-lg group-hover:text-white truncate max-w-[60px] landscape:max-w-[80px] md:max-w-[100px]">{player.name}</div>
                        {player.scoutReport && (
                            <div className="text-xs landscape:text-sm text-yellow-500/90 italic mt-0.5 landscape:mt-1 font-medium hidden sm:block truncate max-w-[60px] landscape:max-w-[80px] md:max-w-none">
                                <span className="inline-block mr-1">★</span>{player.scoutReport}
                            </div>
                        )}
                    </td>
                    <td className="pl-0 landscape:pl-0 md:pl-1 pr-1.5 landscape:pr-2 md:pr-5 py-1.5 landscape:py-2 md:py-5 text-zinc-400 text-sm landscape:text-base md:text-base font-bold truncate max-w-[50px] landscape:max-w-[60px] md:max-w-[80px]">{teamName}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5 text-zinc-400 text-sm landscape:text-base md:text-base font-mono">{player.age}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5">
                        <span className={`px-1.5 landscape:px-2 md:px-2.5 py-0.5 landscape:py-1 md:py-1 rounded text-[11px] landscape:text-xs md:text-[10px] font-black tracking-wider ${getPosColor(player.position)}`}>
                            {translatePosition(player.position)}
                        </span>
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-white text-sm landscape:text-base md:text-base font-bold">{player.rating}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5 pr-1 landscape:pr-2 md:pr-2 font-mono">
                        <span className={`text-sm landscape:text-base md:text-base ${player.potential > 85 ? 'text-purple-400 font-bold shadow-purple-500/50 drop-shadow-sm' : 'text-zinc-400'}`}>
                            {player.potential}
                        </span>
                    </td>
                    <td className="pl-1 landscape:pl-2 md:pl-2 py-1.5 landscape:py-2 md:py-5 pr-2 landscape:pr-3 md:pr-5 font-mono text-emerald-400 text-sm landscape:text-base md:text-base">{formatMoney(player.marketValue)}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-zinc-400 text-sm landscape:text-base md:text-xs truncate max-w-[50px] landscape:max-w-[60px] md:max-w-[80px]">{formatMoney((player.contract?.wage || 0) * 38)}</td>
                    <td className="p-1 landscape:p-1.5 md:p-5">
                        <div className="flex items-center justify-end gap-0.5 landscape:gap-1 md:gap-2 whitespace-nowrap">
                            {onToggleFavorite && (
                                <button 
                                    onClick={() => onToggleFavorite(player)}
                                    className={`px-1.5 landscape:px-2 md:px-3 py-1 landscape:py-1.5 md:py-2 rounded landscape:rounded-md md:rounded-lg text-xs landscape:text-sm md:text-base font-bold transition-all border whitespace-nowrap ${
                                        favoritePlayerIds.has(player.id)
                                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30'
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/5'
                                    }`}
                                >
                                    {favoritePlayerIds.has(player.id) ? '★' : '☆'}
                                </button>
                            )}
                            <button 
                                onClick={() => onInspect && onInspect(player)}
                                className="px-1.5 landscape:px-2 md:px-4 py-1 landscape:py-1.5 md:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs landscape:text-sm md:text-base font-bold rounded landscape:rounded-md md:rounded-lg transition-all border border-white/5 whitespace-nowrap"
                                title={t('inspect')}
                            >
                                🔍
                            </button>
                            <button 
                                onClick={() => onBuyDirect(player)}
                                className="px-1.5 landscape:px-2 md:px-4 py-1 landscape:py-1.5 md:py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs landscape:text-sm md:text-base font-bold rounded landscape:rounded-md md:rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 whitespace-nowrap"
                                title={t('buyDirect')}
                            >
                                $
                            </button>
                            <button 
                                onClick={() => onNegotiate(player)}
                                className="px-1.5 landscape:px-2 md:px-4 py-1 landscape:py-1.5 md:py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs landscape:text-sm md:text-base font-bold rounded landscape:rounded-md md:rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 whitespace-nowrap"
                                title={t('negotiate')}
                            >
                                🤝
                            </button>
                        </div>
                    </td>
                </tr>
                    );
                })}
              </tbody>
              </table>
              </div>
              {sortedPlayers.length === 0 && (
                  <div className="p-20 text-center text-zinc-600 italic font-light">
                    {filterPos !== 'ALL' 
                      ? t('noPlayersFound').replace('{pos}', filterPos)
                      : t('marketClosed')}
                  </div>
              )}
          </div>
        </div>
      </>
      )}

      {/* Transfer History */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-hidden bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-2xl flex flex-col relative min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar p-1 landscape:p-2 min-h-0">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-zinc-950/50 sticky top-0 z-10 text-[11px] landscape:text-xs md:text-[10px] uppercase text-zinc-500 tracking-widest font-bold backdrop-blur-md">
                <tr>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('player')}</th>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('from')}</th>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('to')}</th>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('fee')}</th>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('type')}</th>
                  <th className="p-1.5 landscape:p-2 md:p-5">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transferHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 landscape:p-15 md:p-20 text-center text-zinc-600 italic font-light text-xs landscape:text-sm md:text-base">
                      {t('noTransfersYet')}
                    </td>
                  </tr>
                ) : (
                  transferHistory
                    .sort((a, b) => {
                      // Sort by date (newest first)
                      const dateA = a.date.split('/').map(Number);
                      const dateB = b.date.split('/').map(Number);
                      if (dateA[0] !== dateB[0]) return dateB[0] - dateA[0];
                      return (dateB[1] || 0) - (dateA[1] || 0);
                    })
                    .map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-1.5 landscape:p-2 md:p-5">
                          <div className="font-bold text-zinc-100 text-sm landscape:text-base md:text-lg">{transfer.playerName}</div>
                        </td>
                        <td className="p-1.5 landscape:p-2 md:p-5 text-zinc-400 text-sm landscape:text-base md:text-base">{transfer.fromTeam}</td>
                        <td className="p-1.5 landscape:p-2 md:p-5 text-emerald-400 font-bold text-sm landscape:text-base md:text-base">{transfer.toTeam}</td>
                        <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-emerald-400 text-sm landscape:text-base md:text-base">
                          {transfer.fee > 0 ? formatMoney(transfer.fee) : t('free')}
                        </td>
                        <td className="p-1.5 landscape:p-2 md:p-5">
                          <span className={`px-1.5 landscape:px-2 md:px-2 py-0.5 landscape:py-1 md:py-1 rounded text-[8px] landscape:text-[9px] md:text-[10px] font-bold ${
                            transfer.type === 'YOUTH'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : transfer.type === 'TRANSFER'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}>
                            {transfer.type === 'YOUTH' ? t('youth') : transfer.type === 'TRANSFER' ? t('transfer') : t('free')}
                          </span>
                        </td>
                        <td className="p-1.5 landscape:p-2 md:p-5 text-zinc-500 text-xs landscape:text-sm md:text-sm">{transfer.date}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export const MarketView = React.memo(MarketViewComponent);
