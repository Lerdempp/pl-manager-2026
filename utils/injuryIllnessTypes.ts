export const injuryTypes = [
    { type: "Hamstring Strain", severity: 'MINOR' as const, weeksOut: 1, description: "Pulled hamstring muscle during training" },
    { type: "Ankle Sprain", severity: 'MINOR' as const, weeksOut: 2, description: "Twisted ankle in a tackle" },
    { type: "Groin Strain", severity: 'MODERATE' as const, weeksOut: 3, description: "Groin muscle injury from overexertion" },
    { type: "Knee Ligament Sprain", severity: 'MODERATE' as const, weeksOut: 4, description: "Ligament damage in the knee" },
    { type: "Calf Strain", severity: 'MINOR' as const, weeksOut: 2, description: "Calf muscle tear during sprint" },
    { type: "Shoulder Dislocation", severity: 'MAJOR' as const, weeksOut: 6, description: "Shoulder popped out during collision" },
    { type: "Fractured Rib", severity: 'MODERATE' as const, weeksOut: 4, description: "Broken rib from impact" },
    { type: "ACL Tear", severity: 'SEVERE' as const, weeksOut: 8, description: "Anterior cruciate ligament rupture" },
    { type: "MCL Injury", severity: 'MAJOR' as const, weeksOut: 6, description: "Medial collateral ligament damage" },
    { type: "Achilles Tendonitis", severity: 'MODERATE' as const, weeksOut: 5, description: "Inflammation of the Achilles tendon" },
    { type: "Concussion", severity: 'MODERATE' as const, weeksOut: 2, description: "Head injury from collision" },
    { type: "Back Strain", severity: 'MINOR' as const, weeksOut: 2, description: "Lower back muscle strain" },
    { type: "Hip Flexor Strain", severity: 'MODERATE' as const, weeksOut: 3, description: "Hip flexor muscle injury" },
    { type: "Meniscus Tear", severity: 'MAJOR' as const, weeksOut: 6, description: "Knee meniscus cartilage damage" },
    { type: "Fractured Metatarsal", severity: 'SEVERE' as const, weeksOut: 10, description: "Broken foot bone" }
];

export const illnessTypes = [
    { type: "Flu", severity: 'MINOR' as const, weeksOut: 1, description: "Seasonal influenza virus" },
    { type: "Food Poisoning", severity: 'MINOR' as const, weeksOut: 1, description: "Gastrointestinal infection from contaminated food" },
    { type: "Viral Infection", severity: 'MODERATE' as const, weeksOut: 2, description: "General viral illness" },
    { type: "Stomach Bug", severity: 'MINOR' as const, weeksOut: 1, description: "Gastroenteritis causing dehydration" },
    { type: "Respiratory Infection", severity: 'MODERATE' as const, weeksOut: 2, description: "Upper respiratory tract infection" },
    { type: "Fever", severity: 'MINOR' as const, weeksOut: 1, description: "High temperature and fatigue" },
    { type: "Bronchitis", severity: 'MODERATE' as const, weeksOut: 2, description: "Inflammation of the bronchial tubes" },
    { type: "Pneumonia", severity: 'SEVERE' as const, weeksOut: 3, description: "Lung infection requiring rest" },
    { type: "Mononucleosis", severity: 'SEVERE' as const, weeksOut: 4, description: "Glandular fever causing extreme fatigue" },
    { type: "Migraine", severity: 'MINOR' as const, weeksOut: 1, description: "Severe headaches affecting performance" }
];

