import { questions, getRandomQuestion, getDailyQuestions } from './data/questions.js';
import { calculateScore, formatNumber, storage, generateMockDistribution, getDailySeed } from './utils/gameLogic.js';

// Global App State
const appState = {
    currentView: 'home',
    mode: 'practice', // 'practice' o 'daily'
    currentQuestion: null,
    userGuess: null,
    score: null,
    stats: storage.loadStats(),
    playedQuestionIds: [],
    
    // Estat del joc diari
    dailyQuestions: [],
    dailyIndex: 0,
    dailyTotalScore: 0,
    
    // Estat de la calculadora
    calcOpen: false,
    calcExpression: ''
};

// Elements
const appContainer = document.getElementById('app-container');

// Main Application Controller
window.app = {
    navigate: (view, data = null) => {
        appState.currentView = view;
        render();
    },
    
    startDailyGame: () => {
        // Obtenir data actual en format YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];
        const lastPlayed = localStorage.getItem('quantcat_last_daily');
        
        if (lastPlayed === todayStr) {
            alert('Ja has jugat el Repte Diari avui! Torna demà.');
            return;
        }
        
        appState.mode = 'daily';
        appState.dailyIndex = 0;
        appState.dailyTotalScore = 0;
        
        const randomFunc = getDailySeed();
        appState.dailyQuestions = getDailyQuestions(randomFunc, 5);
        appState.currentQuestion = appState.dailyQuestions[0];
        
        appState.userGuess = null;
        appState.score = null;
        window.app.navigate('game');
    },
    
    startGame: () => {
        appState.mode = 'practice';
        // Recuperar estat per no repetir preguntes si és possible
        const question = getRandomQuestion(appState.playedQuestionIds);
        
        if (!question) {
            // Si ja ha jugat totes, resetejar l'historial
            appState.playedQuestionIds = [];
            const newQ = getRandomQuestion([]);
            appState.currentQuestion = newQ;
        } else {
            appState.currentQuestion = question;
        }
        
        appState.userGuess = null;
        appState.score = null;
        appState.calcOpen = false;
        window.app.navigate('game');
    },
    
    // Mètodes de la calculadora
    toggleCalculator: () => {
        appState.calcOpen = !appState.calcOpen;
        appState.calcExpression = '';
        render(); // Rerender per mostrar/amagar la calculadora
    },
    
    calcInput: (val) => {
        appState.calcExpression += val;
        document.getElementById('calc-display').innerText = appState.calcExpression;
    },
    
    calcClear: () => {
        appState.calcExpression = '';
        document.getElementById('calc-display').innerText = '0';
    },
    
    calcEval: () => {
        try {
            // Avaluació segura bàsica
            const sanitized = appState.calcExpression.replace(/[^-()\d/*+.]/g, '');
            const result = new Function('return ' + sanitized)();
            if (Number.isFinite(result)) {
                // Arrodonim per evitar problemes decimals
                const finalResult = Math.round(result * 1000000) / 1000000;
                appState.calcExpression = String(finalResult);
                document.getElementById('calc-display').innerText = appState.calcExpression;
            }
        } catch (e) {
            document.getElementById('calc-display').innerText = 'Error';
            appState.calcExpression = '';
        }
    },
    
    calcUseResult: () => {
        window.app.calcEval(); // Assegurar que s'avalua abans
        const result = parseFloat(appState.calcExpression);
        if (!isNaN(result)) {
            appState.calcOpen = false;
            render(); // Això esborra l'input vell i recrea la vista sense calculadora
            
            // Inserim el valor al nou input i disparem l'event per formatar-lo
            setTimeout(() => {
                const inputElement = document.getElementById('guess-input');
                if (inputElement) {
                    inputElement.value = result;
                    const event = new Event('input', { bubbles: true });
                    inputElement.dispatchEvent(event);
                }
            }, 10);
        }
    },
    
    formatInput: (e) => {
        const input = e.target;
        // Obtenim el valor net (sense punts ni espais)
        let raw = input.value.replace(/\./g, '').replace(/\s/g, '');
        
        // Si està buit, permetre-ho
        if (raw === '') return;
        
        // Si conté una 'e' (notació científica com 1e6) o una coma (decimals), no hi fiquem punts de milers
        if (raw.toLowerCase().includes('e') || raw.includes(',')) {
            return;
        }
        
        // Si només són números i potser un signe negatiu inicial
        if (/^-?\d+$/.test(raw)) {
            // Guardem la posició del cursor des del final
            const cursorDistFromEnd = input.value.length - input.selectionStart;
            
            // Formatem amb punts
            const formatted = new Intl.NumberFormat('ca-ES').format(parseInt(raw, 10));
            input.value = formatted;
            
            // Restaurem la posició del cursor
            const newCursorPos = Math.max(0, formatted.length - cursorDistFromEnd);
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    },
    
    submitGuess: (e) => {
        e.preventDefault();
        const inputElement = document.getElementById('guess-input');
        
        // Netejar l'input (treure punts, espais) i permetre format científic (1e6) o comes
        const rawValue = inputElement.value.trim().replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '');
        const guess = Number(rawValue);
        
        if (isNaN(guess) || inputElement.value.trim() === '') {
            // Mostrar error visualment
            inputElement.classList.add('border-red-500');
            setTimeout(() => inputElement.classList.remove('border-red-500'), 500);
            return;
        }
        
        appState.userGuess = guess;
        appState.score = calculateScore(guess, appState.currentQuestion.answer);
        
        // Actualitzar estadístiques globals
        appState.stats.gamesPlayed++;
        appState.stats.totalScore += appState.score;
        appState.stats.averageScore = Math.round(appState.stats.totalScore / appState.stats.gamesPlayed);
        if (appState.score === 100) appState.stats.perfectScores++;
        storage.saveStats(appState.stats);
        
        if (appState.mode === 'daily') {
            appState.dailyTotalScore += appState.score;
            // Si és l'última pregunta del repte diari... (ho gestionarem a la vista del Resultat)
        } else {
            appState.playedQuestionIds.push(appState.currentQuestion.id);
        }
        
        window.app.navigate('result');
    },
    
    nextQuestion: () => {
        if (appState.mode === 'daily') {
            appState.dailyIndex++;
            if (appState.dailyIndex < appState.dailyQuestions.length) {
                appState.currentQuestion = appState.dailyQuestions[appState.dailyIndex];
                appState.userGuess = null;
                appState.score = null;
                window.app.navigate('game');
            } else {
                // Final del repte diari
                const todayStr = new Date().toISOString().split('T')[0];
                localStorage.setItem('quantcat_last_daily', todayStr);
                window.app.navigate('daily_summary');
            }
        } else {
            window.app.startGame();
        }
    },
    
    showStats: () => {
        window.app.navigate('stats');
    }
};

// Render Logic
function render() {
    appContainer.innerHTML = '';
    
    switch (appState.currentView) {
        case 'home':
            appContainer.innerHTML = renderHomeView();
            break;
        case 'game':
            appContainer.innerHTML = renderGameView();
            // Focus automàtic a l'input
            setTimeout(() => document.getElementById('guess-input')?.focus(), 100);
            break;
        case 'result':
            appContainer.innerHTML = renderResultView();
            // Animar la barra de puntuació
            setTimeout(() => {
                const fill = document.getElementById('score-fill');
                if(fill) {
                    fill.style.width = `${appState.score}%`;
                }
            }, 100);
            break;
        case 'stats':
            appContainer.innerHTML = renderStatsView();
            break;
        case 'daily_summary':
            appContainer.innerHTML = renderDailySummaryView();
            break;
    }
}

const catalanQuotes = [
    { text: "L'originalitat consisteix en el retorn a l'origen.", author: "Antoni Gaudí" },
    { text: "El meu país és aquell on em sento lliure.", author: "Pau Casals" },
    { text: "No tinguis por de la perfecció, mai l'assoliràs.", author: "Salvador Dalí" },
    { text: "La vida no té més sentit que aquell que nosaltres vulguem donar-li.", author: "Joan Fuster" },
    { text: "Cal lluitar, lluitar sempre. I no perdre mai l'esperança.", author: "Neus Català" },
    { text: "Un país no és res si no té la seva llengua.", author: "Pompeu Fabra" },
    { text: "Només el que es perd és veritablement nostre.", author: "Josep Pla" },
    { text: "L'amor és una cosa molt estranya i molt difícil d'aconseguir.", author: "Mercè Rodoreda" }
];

// Views
function renderHomeView() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastPlayed = localStorage.getItem('quantcat_last_daily');
    const hasPlayedDaily = lastPlayed === todayStr;
    
    // Tria una frase aleatòria de forma consistent per sessió, o purament aleatòria per visita
    const randomQuote = catalanQuotes[Math.floor(Math.random() * catalanQuotes.length)];
    
    // SVG de la clàssica "Rajola de flor" (Panot de Barcelona)
    const panotSvg = `
        <svg viewBox="0 0 100 100" class="w-10 h-10 text-white" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round">
            <!-- 4 pètals del panot -->
            <path d="M 50 30 A 20 20 0 1 1 70 50" />
            <path d="M 70 50 A 20 20 0 1 1 50 70" />
            <path d="M 50 70 A 20 20 0 1 1 30 50" />
            <path d="M 30 50 A 20 20 0 1 1 50 30" />
            <!-- Cercle central -->
            <circle cx="50" cy="50" r="11" />
        </svg>
    `;
    
    return `
        <div class="flex-grow flex flex-col items-center justify-center fade-in text-center p-6 glass-panel rounded-2xl mx-auto w-full">
            <div class="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-brand-600/30">
                ${panotSvg}
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold mb-4">Quant en saps?</h2>
            <p class="text-lg text-slate-600 mb-8 max-w-md">
                Posa a prova la teva intuïció. Endevina dades sobre Catalunya. 
                Com més a prop estiguis, més punts guanyes.
            </p>
            
            <div class="flex flex-col gap-4 w-full max-w-xs">
                ${hasPlayedDaily 
                    ? `<button disabled class="w-full py-4 rounded-xl text-lg font-bold bg-slate-200 text-slate-400 cursor-not-allowed">
                        <i class="fa-solid fa-calendar-check mr-2"></i> Repte Diari (Fet!)
                       </button>`
                    : `<button onclick="app.startDailyGame()" class="w-full py-4 rounded-xl text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-1">
                        <i class="fa-solid fa-calendar-day mr-2"></i> Repte Diari
                       </button>`
                }
                
                <button onclick="app.startGame()" class="btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-md shadow-brand-600/20">
                    <i class="fa-solid fa-dumbbell mr-2"></i> Pràctica Lliure
                </button>
            </div>
            
            <div class="mt-10 pt-6 border-t border-slate-100 max-w-xs w-full text-center fade-in" style="animation-delay: 0.3s">
                <p class="text-sm italic text-slate-500 mb-2">"${randomQuote.text}"</p>
                <p class="text-xs font-semibold text-brand-600 uppercase tracking-wider">— ${randomQuote.author}</p>
            </div>
        </div>
    `;
}

function renderGameView() {
    const q = appState.currentQuestion;
    const progressText = appState.mode === 'daily' ? `Pregunta ${appState.dailyIndex + 1}/5` : 'Pràctica';
    
    return `
        <div class="flex-grow flex flex-col slide-up p-6 md:p-8 glass-panel rounded-2xl w-full relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-slate-100"></div>
            
            <div class="mb-4 text-sm font-semibold text-brand-600 tracking-wider uppercase flex justify-between">
                <span>${q.category || 'Pregunta'}</span>
                <span>${progressText}</span>
            </div>
            
            <h2 class="text-2xl sm:text-3xl font-bold mb-10 leading-tight">
                ${q.text}
            </h2>
            
            <form onsubmit="app.submitGuess(event)" class="mt-auto flex flex-col items-center">
                <div class="w-full relative mb-8">
                    <input 
                        type="text" 
                        inputmode="numeric"
                        id="guess-input" 
                        class="number-input py-4 text-slate-800" 
                        placeholder="Ex: 10000 o 1e4"
                        autocomplete="off"
                        oninput="app.formatInput(event)"
                    >
                    <div class="absolute right-0 bottom-4 text-slate-400 font-medium text-lg pointer-events-none">
                        ${q.unit}
                    </div>
                </div>
                
                <div class="w-full flex gap-2">
                    <button type="submit" class="btn-primary flex-grow py-4 rounded-xl text-lg font-bold shadow-md shadow-brand-600/20">
                        Enviar Estimació
                    </button>
                    <button type="button" onclick="app.toggleCalculator()" class="bg-slate-100 text-slate-600 hover:bg-slate-200 py-4 px-6 rounded-xl text-lg shadow-sm border border-slate-200">
                        <i class="fa-solid fa-calculator"></i>
                    </button>
                </div>
                
                ${appState.calcOpen ? `
                    <div class="w-full mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 slide-up">
                        <div id="calc-display" class="bg-white border border-slate-200 rounded-lg p-3 text-right text-xl font-mono mb-3 overflow-x-auto min-h-[50px] shadow-inner text-slate-800">
                            ${appState.calcExpression || '0'}
                        </div>
                        <div class="grid grid-cols-4 gap-2 mb-3">
                            <button type="button" onclick="app.calcInput('7')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">7</button>
                            <button type="button" onclick="app.calcInput('8')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">8</button>
                            <button type="button" onclick="app.calcInput('9')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">9</button>
                            <button type="button" onclick="app.calcInput('/')" class="bg-brand-50 text-brand-700 border border-brand-200 rounded-lg py-3 hover:bg-brand-100 font-bold text-lg">÷</button>
                            
                            <button type="button" onclick="app.calcInput('4')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">4</button>
                            <button type="button" onclick="app.calcInput('5')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">5</button>
                            <button type="button" onclick="app.calcInput('6')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">6</button>
                            <button type="button" onclick="app.calcInput('*')" class="bg-brand-50 text-brand-700 border border-brand-200 rounded-lg py-3 hover:bg-brand-100 font-bold text-lg">×</button>
                            
                            <button type="button" onclick="app.calcInput('1')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">1</button>
                            <button type="button" onclick="app.calcInput('2')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">2</button>
                            <button type="button" onclick="app.calcInput('3')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">3</button>
                            <button type="button" onclick="app.calcInput('-')" class="bg-brand-50 text-brand-700 border border-brand-200 rounded-lg py-3 hover:bg-brand-100 font-bold text-lg">-</button>
                            
                            <button type="button" onclick="app.calcClear()" class="bg-red-50 text-red-600 border border-red-200 rounded-lg py-3 hover:bg-red-100 font-bold text-lg">C</button>
                            <button type="button" onclick="app.calcInput('0')" class="bg-white border border-slate-200 rounded-lg py-3 hover:bg-slate-100 font-bold text-lg text-slate-700">0</button>
                            <button type="button" onclick="app.calcEval()" class="bg-brand-600 text-white rounded-lg py-3 hover:bg-brand-700 font-bold text-lg shadow-sm">=</button>
                            <button type="button" onclick="app.calcInput('+')" class="bg-brand-50 text-brand-700 border border-brand-200 rounded-lg py-3 hover:bg-brand-100 font-bold text-lg">+</button>
                        </div>
                        <button type="button" onclick="app.calcUseResult()" class="w-full bg-slate-800 text-white rounded-lg py-3 hover:bg-slate-700 font-bold text-sm shadow-sm">
                            <i class="fa-solid fa-arrow-up mr-2"></i> Posar com a resposta
                        </button>
                    </div>
                ` : ''}
            </form>
        </div>
    `;
}

function renderResultView() {
    const q = appState.currentQuestion;
    const guess = appState.userGuess;
    const score = appState.score;
    const answer = q.answer;
    
    // Calcular el color de fons depenent de la puntuació
    let scoreColorClass = 'text-green-500';
    if (score < 30) scoreColorClass = 'text-red-500';
    else if (score < 70) scoreColorClass = 'text-yellow-500';

    // Missatge segons puntuació
    let message = 'Excel·lent!';
    if (score === 100) message = 'Clavat!';
    else if (score < 10) message = 'Ben lluny...';
    else if (score < 40) message = 'Molt millorable';
    else if (score < 70) message = 'No està malament';
    else if (score < 95) message = 'Molt a prop!';
    
    const nextText = (appState.mode === 'daily' && appState.dailyIndex === 4) ? 'Veure Resum' : 'Següent Pregunta';

    return `
        <div class="flex-grow flex flex-col slide-up p-6 md:p-8 glass-panel rounded-2xl w-full">
            
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold ${scoreColorClass} mb-2">${score} <span class="text-xl">punts</span></h2>
                <p class="text-lg font-medium text-slate-600">${message}</p>
                
                <div class="score-bar-container mt-4 mb-2">
                    <div id="score-fill" class="score-bar-fill" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="bg-slate-50 p-5 rounded-xl mb-6 border border-slate-100">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">La teva resposta</h3>
                        <div class="text-xl font-bold ${score < 50 ? 'text-slate-500' : 'text-slate-700'}">
                            ${formatNumber(guess)}
                        </div>
                    </div>
                    <div>
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">La realitat</h3>
                        <div class="text-2xl font-bold text-brand-700">
                            ${formatNumber(answer)}
                        </div>
                    </div>
                </div>
                <div class="text-center mt-2 text-sm text-slate-500">${q.unit}</div>
                
                <!-- Visualització logarítmica -->
                <div class="mt-6 pt-4 border-t border-slate-200">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">Distribució de jugadors</h3>
                    <div class="relative w-full h-8 flex items-center">
                        <div class="absolute w-full h-2 bg-slate-200 rounded-full"></div>
                        ${renderDistributionChart(answer, guess)}
                    </div>
                    <div class="flex justify-between text-xs text-slate-400 mt-2">
                        <span>Menys</span>
                        <span>Més</span>
                    </div>
                </div>
            </div>
            
            ${q.explanation ? `
                <div class="mb-8 text-slate-600 text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <i class="fa-solid fa-circle-info text-blue-400 mr-2"></i>
                    ${q.explanation}
                    ${q.sourceUrl ? `<a href="${q.sourceUrl}" target="_blank" class="text-blue-500 hover:underline ml-1">(Font)</a>` : ''}
                </div>
            ` : ''}
            
            <div class="mt-auto flex gap-3 flex-col sm:flex-row">
                <button onclick="app.shareResult()" id="share-btn" class="sm:flex-1 py-4 rounded-xl text-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm">
                    <i class="fa-solid fa-share-nodes mr-2"></i> Compartir
                </button>
                <button onclick="app.nextQuestion()" class="btn-primary sm:flex-[2] py-4 rounded-xl text-lg font-bold shadow-md shadow-brand-600/20">
                    ${nextText} <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            </div>
        </div>
    `;
}

// Funció auxiliar per dibuixar la distribució
function renderDistributionChart(answer, userGuess) {
    const players = generateMockDistribution(answer, userGuess);
    
    // Convertim a logaritme per a la visualització
    const logAnswer = Math.log10(Math.max(answer, 1));
    const logGuess = Math.log10(Math.max(userGuess, 1));
    const logPlayers = players.map(p => Math.log10(Math.max(p, 1)));
    
    // Trobem min i max per escalar (afegim un marge de 1 ordre de magnitud)
    const min = Math.min(...logPlayers, logAnswer) - 1;
    const max = Math.max(...logPlayers, logAnswer) + 1;
    const range = max - min;
    
    const getPercent = (val) => Math.max(0, Math.min(100, ((val - min) / range) * 100));
    
    const answerPos = getPercent(logAnswer);
    const guessPos = getPercent(logGuess);
    
    let html = '';
    
    // Punts d'altres jugadors (opacitat baixa)
    logPlayers.forEach(p => {
        const pos = getPercent(p);
        html += `<div class="absolute w-2 h-2 rounded-full bg-slate-400 opacity-30 transform -translate-x-1/2" style="left: ${pos}%"></div>`;
    });
    
    // Resposta real (estrella o marca forta verda)
    html += `
        <div class="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 z-10" style="left: ${answerPos}%; top: 50%;">
            <div class="w-4 h-4 rounded-full bg-brand-500 border-2 border-white shadow-sm z-10 relative"></div>
            <div class="absolute top-4 text-[10px] font-bold text-brand-700 whitespace-nowrap">Realitat</div>
        </div>
    `;
    
    // Intent de l'usuari (marca forta blava/negra)
    html += `
        <div class="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 z-20" style="left: ${guessPos}%; top: 50%;">
            <div class="w-4 h-4 rounded-full bg-slate-800 border-2 border-white shadow-sm z-20 relative"></div>
            <div class="absolute bottom-4 text-[10px] font-bold text-slate-800 whitespace-nowrap">Tu</div>
        </div>
    `;
    
    return html;
}

function renderDailySummaryView() {
    const total = appState.dailyTotalScore;
    let rank = "Aprenent";
    if (total >= 400) rank = "Llegenda Local";
    else if (total >= 300) rank = "Expert Català";
    else if (total >= 200) rank = "Coneixedor";
    
    return `
        <div class="flex-grow flex flex-col slide-up p-6 md:p-8 glass-panel rounded-2xl w-full text-center">
            <h2 class="text-3xl font-bold mb-2">Repte Completat!</h2>
            <p class="text-slate-600 mb-8">Has jugat al repte diari d'avui.</p>
            
            <div class="bg-amber-50 p-6 rounded-2xl border border-amber-200 mb-8">
                <div class="text-sm text-amber-700 uppercase tracking-wider font-bold mb-2">Puntuació Final</div>
                <div class="text-5xl font-black text-amber-600 mb-2">${total} <span class="text-xl">/ 500</span></div>
                <div class="text-lg font-medium text-amber-800">${rank}</div>
            </div>
            
            <button onclick="app.shareDailyResult()" class="btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-md shadow-brand-600/20 mb-4">
                <i class="fa-solid fa-share-nodes mr-2"></i> Compartir Resultat
            </button>
            <button onclick="app.navigate('home')" class="w-full py-4 rounded-xl text-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                Tornar a l'inici
            </button>
        </div>
    `;
}

function renderStatsView() {
    const stats = appState.stats;
    return `
        <div class="flex-grow flex flex-col slide-up p-6 md:p-8 glass-panel rounded-2xl w-full text-center">
            <h2 class="text-2xl font-bold mb-8">El teu rendiment</h2>
            
            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div class="text-sm text-slate-500 mb-1">Partides jugades</div>
                    <div class="text-3xl font-bold text-slate-800">${stats.gamesPlayed}</div>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div class="text-sm text-slate-500 mb-1">Puntuació mitjana</div>
                    <div class="text-3xl font-bold text-brand-600">${stats.averageScore || 0}</div>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2">
                    <div class="text-sm text-slate-500 mb-1">Puntuacions perfectes (100)</div>
                    <div class="text-2xl font-bold text-amber-500">
                        <i class="fa-solid fa-star text-sm mb-1 mr-1"></i>
                        ${stats.perfectScores}
                    </div>
                </div>
            </div>
            
            <button onclick="app.navigate('home')" class="w-full py-4 rounded-xl text-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors mt-auto">
                Tornar a l'inici
            </button>
        </div>
    `;
}

// Inicialitzar l'aplicació quan el DOM estigui carregat
const initApp = () => {
    render();
    
    // Suport per teclat (Enter per avançar a pantalles on no hi ha input)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (appState.currentView === 'home') {
                e.preventDefault();
                // Preferir joc diari si no s'ha jugat avui
                const todayStr = new Date().toISOString().split('T')[0];
                const lastPlayed = localStorage.getItem('quantcat_last_daily');
                if (lastPlayed !== todayStr) {
                    window.app.startDailyGame();
                } else {
                    window.app.startGame();
                }
            } else if (appState.currentView === 'result') {
                e.preventDefault();
                window.app.nextQuestion();
            } else if (appState.currentView === 'daily_summary' || appState.currentView === 'stats') {
                e.preventDefault();
                window.app.navigate('home');
            }
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

window.app.shareResult = () => {
    const text = `🧠 He aconseguit ${appState.score} punts a QuantCAT!\nPregunta: ${appState.currentQuestion.text}\nJuga-hi tu també!`;
    triggerShare(text, 'share-btn');
};

window.app.shareDailyResult = () => {
    const todayStr = new Date().toLocaleDateString('ca-ES');
    const text = `📅 Repte Diari QuantCAT (${todayStr})\nHe aconseguit ${appState.dailyTotalScore}/500 punts!\nEns mesurem? 🐈`;
    triggerShare(text, 'share-btn'); // Fallback in cas ID
};

function triggerShare(text, btnId) {
    if (navigator.share) {
        navigator.share({
            title: 'QuantCAT',
            text: text
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text);
        // Find any button wrapping the share
        const btns = document.querySelectorAll('button');
        const btn = Array.from(btns).find(b => b.innerText.includes('Compartir'));
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiat!';
            setTimeout(() => btn.innerHTML = original, 2000);
        }
    }
}
