/**
 * Lògica del joc per a QuantCAT
 */

// Calcula la puntuació basada en la diferència d'ordres de magnitud (escala logarítmica)
export function calculateScore(guess, answer) {
    if (guess === answer) return 100;
    
    // Evitar logaritme de zero o nombres negatius (tot i que en aquest joc normalment són positius)
    const safeGuess = Math.max(Math.abs(guess), 0.000001);
    const safeAnswer = Math.max(Math.abs(answer), 0.000001);
    
    const logGuess = Math.log10(safeGuess);
    const logAnswer = Math.log10(safeAnswer);
    
    const logDifference = Math.abs(logGuess - logAnswer);
    
    // Si la diferència és de 2 ordres de magnitud o més (ex: dir 1000 quan és 100000), 0 punts
    // Si és de 1 ordre de magnitud (ex: 10 vegades menys), 50 punts
    const maxLogDifferenceForPoints = 2; 
    
    if (logDifference >= maxLogDifferenceForPoints) return 0;
    
    // Calcular percentatge (caiguda lineal respecte el logaritme)
    const rawScore = 100 - ((logDifference / maxLogDifferenceForPoints) * 100);
    
    return Math.max(0, Math.round(rawScore));
}

// Formatejar números de forma llegible en català (ex: 1.000.000)
export function formatNumber(number) {
    return new Intl.NumberFormat('ca-ES').format(number);
}

// Generar una distribució simulada d'altres jugadors per donar sensació de comunitat
// Més endavant es pot substituir per dades reals del backend
export function generateMockDistribution(answer, userGuess) {
    // Generar alguns "jugadors" al voltant de la resposta real
    const players = [];
    
    // El 70% de la gent s'equivoca per 1 ordre de magnitud o menys
    // El 20% s'equivoca per 2
    // El 10% fa una bogeria
    
    for (let i = 0; i < 50; i++) {
        const rand = Math.random();
        let errorFactor;
        
        if (rand < 0.7) {
            errorFactor = (Math.random() * 2) - 1; // -1 a +1 ordres de magnitud
        } else if (rand < 0.9) {
            errorFactor = (Math.random() * 4) - 2; // -2 a +2
        } else {
            errorFactor = (Math.random() * 6) - 3; // -3 a +3
        }
        
        const mockGuess = answer * Math.pow(10, errorFactor);
        players.push(mockGuess);
    }
    
    // Afegir l'usuari
    players.push(userGuess);
    
    return players.sort((a, b) => a - b);
}

// Guarda l'estat del joc actual al localStorage
export const storage = {
    saveState: (state) => {
        try {
            localStorage.setItem('quantcat_state', JSON.stringify(state));
        } catch (e) {
            console.error('Error saving state', e);
        }
    },
    loadState: () => {
        try {
            const state = localStorage.getItem('quantcat_state');
            return state ? JSON.parse(state) : null;
        } catch (e) {
            console.error('Error loading state', e);
            return null;
        }
    },
    saveStats: (stats) => {
        localStorage.setItem('quantcat_stats', JSON.stringify(stats));
    },
    loadStats: () => {
        const stats = localStorage.getItem('quantcat_stats');
        return stats ? JSON.parse(stats) : { gamesPlayed: 0, totalScore: 0, averageScore: 0, perfectScores: 0 };
    }
};

// Generador pseudo-aleatori determinista per al Joc del Dia
export function getDailySeed() {
    const today = new Date();
    // Ex: "2026-09-28"
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    // Hash simple del string de la data
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converteix a enter de 32 bits
    }
    
    // Retorna una funció que genera un número del 0 a l'1
    let seed = Math.abs(hash);
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}
