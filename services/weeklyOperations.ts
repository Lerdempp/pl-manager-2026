import { Team } from '../types';
import { calculateMoraleChange, calculateAttendance, updateFanCount, isDerbyMatch } from './fanSystem';

export const payWeeklyWages = (teams: Team[]) => {
    teams.forEach(t => {
        const weeklyWageBill = t.players.reduce((acc, p) => acc + (p.contract?.wage || 0), 0);
        t.budget -= weeklyWageBill;
        t.financials.expenses.wages += weeklyWageBill;
    });
};

export const updateTeamStats = (t: Team, goalsFor: number, goalsAgainst: number, isHome: boolean, opponent?: Team, lastMinuteGoal: boolean = false) => {
    t.played += 1;
    t.gf += goalsFor;
    t.ga += goalsAgainst;
    
    const result: 'WIN' | 'DRAW' | 'LOSS' = goalsFor > goalsAgainst ? 'WIN' : goalsFor === goalsAgainst ? 'DRAW' : 'LOSS';
    
    if (result === 'WIN') {
        t.won += 1;
        t.points += 3;
    } else if (result === 'DRAW') {
        t.drawn += 1;
        t.points += 1;
    } else {
        t.lost += 1;
    }

    // Update fan morale
    if (t.fanMorale !== undefined && opponent) {
        const isDerby = isDerbyMatch(t, opponent);
        const moraleChange = calculateMoraleChange(
            result,
            goalsFor,
            goalsAgainst,
            isHome,
            isDerby,
            opponent.baseRating,
            t.baseRating,
            lastMinuteGoal
        );
        t.fanMorale = Math.max(0, Math.min(100, (t.fanMorale || 50) + moraleChange));
        
        // Update fan count based on morale
        t.fanCount = updateFanCount(t.fanCount || 200000, t.fanMorale);
    }

    let ticketRev = 0;
    if (isHome && t.fanCount && t.fanMorale !== undefined && t.ticketPrice !== undefined && t.baseTicketPrice !== undefined && t.stadiumCapacity !== undefined) {
        const attendance = calculateAttendance(
            t.fanCount,
            t.fanMorale,
            t.ticketPrice,
            t.baseTicketPrice,
            t.stadiumCapacity
        );
        ticketRev = attendance * t.ticketPrice;
        t.budget += ticketRev;
        t.financials.income.tickets += ticketRev;
    }
    // Note: Wages are paid separately via payWeeklyWages() function every week
};

