import { Player, PlayerAttributes, Position } from '../types';

export const calculateAttributeGrowth = (player: Player, ratingDiff: number): { newAttrs: PlayerAttributes, changes: Partial<PlayerAttributes> } => {
    const current = player.attributes || { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 };
    const newAttrs = { ...current };
    const changes: Partial<PlayerAttributes> = {};

    const clamp = (val: number) => Math.max(10, Math.min(99, val));
    const applyChange = (attr: keyof PlayerAttributes, amount: number) => {
        const oldVal = newAttrs[attr];
        newAttrs[attr] = clamp(oldVal + amount);
        const actualDiff = newAttrs[attr] - oldVal;
        if (actualDiff !== 0) changes[attr] = actualDiff;
    };

    const isForward = [Position.ST, Position.CF, Position.RW, Position.LW].includes(player.position);
    const isMidfielder = [Position.CAM, Position.CM, Position.CDM, Position.RM, Position.LM].includes(player.position);
    const isDefender = [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(player.position);

    if (ratingDiff > 0) {
        // Increased multiplier: ratingDiff * 4 + 2 instead of * 2 + 1
        // This ensures that when overall increases by 7-8, attributes get more points (30-34 instead of 15-17)
        let pointsToDistribute = ratingDiff * 4 + 2; 
        while (pointsToDistribute > 0) {
            const roll = Math.random();
            let target: keyof PlayerAttributes = 'physical';
            if (isForward) {
                 if (roll < 0.4) target = 'shooting'; else if (roll < 0.7) target = 'pace'; else if (roll < 0.9) target = 'dribbling'; else target = 'passing';
            } else if (isMidfielder) {
                if (roll < 0.4) target = 'passing'; else if (roll < 0.7) target = 'dribbling'; else if (roll < 0.85) target = 'shooting'; else target = 'defending';
            } else if (isDefender) {
                if (roll < 0.45) target = 'defending'; else if (roll < 0.8) target = 'physical'; else if (roll < 0.9) target = 'passing'; else target = 'pace';
            } else { 
                if (roll < 0.5) target = 'defending'; else target = 'physical';
            }
            applyChange(target, 1);
            pointsToDistribute--;
        }
    } else if (ratingDiff < 0) {
        let pointsToRemove = Math.abs(ratingDiff) * 2;
        while (pointsToRemove > 0) {
             const roll = Math.random();
             let target: keyof PlayerAttributes = 'physical';
             if (roll < 0.4) target = 'pace'; else if (roll < 0.7) target = 'physical'; else if (roll < 0.8) target = 'dribbling'; else if (roll < 0.9) target = 'defending'; else target = 'passing';
             applyChange(target, -1);
             pointsToRemove--;
        }
    }
    return { newAttrs, changes };
};

