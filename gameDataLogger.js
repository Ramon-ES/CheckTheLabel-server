const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, 'gameAnalytics.json');
const COMPLETION_CODES_FILE = path.join(__dirname, 'completionCodes.json');
const ANALYTICS_TOKEN = process.env.ANALYTICS_TOKEN;

class GameDataLogger {
	constructor() {
		this.ensureAnalyticsFileExists();
		this.ensureCompletionCodesFileExists();
	}

	ensureAnalyticsFileExists() {
		if (!fs.existsSync(ANALYTICS_FILE)) {
			console.log('📊 Creating new analytics file...');
			fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ games: [] }, null, 2), 'utf8');
		}
	}

	ensureCompletionCodesFileExists() {
		if (!fs.existsSync(COMPLETION_CODES_FILE)) {
			console.log('🎫 Creating new completion codes file...');
			fs.writeFileSync(COMPLETION_CODES_FILE, JSON.stringify({ codes: [] }, null, 2), 'utf8');
		}
	}

	readAnalytics() {
		try {
			const data = fs.readFileSync(ANALYTICS_FILE, 'utf8');
			return JSON.parse(data);
		} catch (error) {
			console.error('❌ Error reading analytics file:', error);
			return { games: [] };
		}
	}

	writeAnalytics(data) {
		try {
			fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
			console.log('✅ Analytics saved successfully');
		} catch (error) {
			console.error('❌ Error writing analytics file:', error);
		}
	}

	readCompletionCodes() {
		try {
			const data = fs.readFileSync(COMPLETION_CODES_FILE, 'utf8');
			return JSON.parse(data);
		} catch (error) {
			console.error('❌ Error reading completion codes file:', error);
			return { codes: [] };
		}
	}

	writeCompletionCodes(data) {
		try {
			fs.writeFileSync(COMPLETION_CODES_FILE, JSON.stringify(data, null, 2), 'utf8');
			console.log('✅ Completion codes saved successfully');
		} catch (error) {
			console.error('❌ Error writing completion codes file:', error);
		}
	}

	/**
	 * Initialize a new game session for tracking
	 * @param {string} roomCode - The room code
	 * @param {object} players - Players object
	 * @returns {object} - Game session object
	 */
	initGameSession(roomCode, players) {
		const gameSession = {
			gameId: `${roomCode}_${Date.now()}`,
			roomCode: roomCode,
			startTime: new Date().toISOString(),
			endTime: null,
			duration: null,
			endReason: null,
			endedBy: null,
			totalRounds: 0,
			finalMicroplastics: 0,
			playerCount: {
				human: Object.values(players).filter(p => !p.isCPU).length,
				cpu: Object.values(players).filter(p => p.isCPU).length,
				total: Object.keys(players).length
			},
			players: {},
			winner: null
		};

		// Initialize player tracking
		Object.values(players).forEach(player => {
			gameSession.players[player.id] = {
				playerId: player.id,
				username: player.username,
				isCPU: player.isCPU,
				finalMoney: 0,
				finalPoints: 0,
				finalWardrobe: {},
				totalClothingItems: 0,
				triviaAnswered: {
					correct: 0,
					incorrect: 0,
					total: 0,
					questions: [] // Track each trivia question
				},
				actionsReceived: [], // Track each action card
				cardsPerRound: {}, // Track purchases per round
				roundData: {} // Store detailed round data
			};
		});

		return gameSession;
	}

	/**
	 * Log a trivia event for a player
	 * @param {object} gameSession - Current game session
	 * @param {string} playerId - Player ID
	 * @param {object} triviaData - Trivia question data
	 * @param {boolean} isCorrect - Whether answer was correct
	 * @param {number} roundNumber - Current round number
	 */
	logTrivia(gameSession, playerId, triviaData, isCorrect, roundNumber) {
		if (!gameSession.players[playerId]) return;

		const player = gameSession.players[playerId];
		player.triviaAnswered.total++;

		if (isCorrect) {
			player.triviaAnswered.correct++;
		} else {
			player.triviaAnswered.incorrect++;
		}

		player.triviaAnswered.questions.push({
			round: roundNumber,
			title: triviaData.title,
			statement: triviaData.text,
			correctAnswer: triviaData.answer,
			isCorrect: isCorrect,
			timestamp: new Date().toISOString()
		});

		console.log(`📊 Logged trivia for ${player.username}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
	}

	/**
	 * Log an action card received by a player
	 * @param {object} gameSession - Current game session
	 * @param {string} playerId - Player ID
	 * @param {object} actionData - Action card data
	 * @param {number} roundNumber - Current round number
	 */
	logAction(gameSession, playerId, actionData, roundNumber) {
		if (!gameSession.players[playerId]) return;

		const player = gameSession.players[playerId];
		player.actionsReceived.push({
			round: roundNumber,
			name: actionData.name,
			title: actionData.title,
			statement: actionData.statement || actionData.text, // Support both formats
			action: actionData.action,
			timestamp: new Date().toISOString()
		});

		console.log(`📊 Logged action for ${player.username}: ${actionData.name}`);
	}

	/**
	 * Log card purchases for a player in a round
	 * @param {object} gameSession - Current game session
	 * @param {string} playerId - Player ID
	 * @param {array} cards - Array of purchased cards
	 * @param {number} roundNumber - Current round number
	 */
	logCardPurchases(gameSession, playerId, cards, roundNumber) {
		if (!gameSession.players[playerId]) return;

		const player = gameSession.players[playerId];
		player.cardsPerRound[roundNumber] = cards.map(card => ({
			title: card.title,
			material: card.material,
			condition: card.condition,
			item: card.item,
			points: card.points,
			price: card.price
		}));

		console.log(`📊 Logged ${cards.length} card purchases for ${player.username} in round ${roundNumber}`);
	}

	/**
	 * Log completion codes for a game
	 * @param {string} gameId - Game session ID
	 * @param {string} roomCode - Room code
	 * @param {object} completionCodes - Object with playerId: code pairs
	 * @param {string} endReason - Reason game ended
	 */
	logCompletionCodes(gameId, roomCode, completionCodes, endReason) {
		try {
			const codesData = this.readCompletionCodes();
			const timestamp = new Date().toISOString();

			// Add each completion code to the codes array
			Object.entries(completionCodes).forEach(([playerId, code]) => {
				codesData.codes.push({
					code: code,
					gameId: gameId,
					roomCode: roomCode,
					playerId: playerId,
					endReason: endReason,
					timestamp: timestamp
				});
			});

			this.writeCompletionCodes(codesData);
			console.log(`🎫 Logged ${Object.keys(completionCodes).length} completion codes for game ${gameId}`);
		} catch (error) {
			console.error('❌ Error logging completion codes:', error);
		}
	}

	/**
	 * End a game session and save final data
	 * @param {object} gameSession - Current game session
	 * @param {object} room - Room object with final state
	 * @param {string} endReason - Reason game ended
	 * @param {object} completionCodes - Optional object with playerId: code pairs
	 */
	endGameSession(gameSession, room, endReason, completionCodes = {}) {
		const endTime = new Date();
		const startTime = new Date(gameSession.startTime);

		gameSession.endTime = endTime.toISOString();
		gameSession.duration = Math.round((endTime - startTime) / 1000); // Duration in seconds
		gameSession.endReason = endReason;
		gameSession.totalRounds = room.gameState.roundCounter;
		gameSession.finalMicroplastics = room.gameState.microplastics;
		gameSession.completionCodes = completionCodes; // Store completion codes in analytics

		if (room.gameState.endedBy) {
			gameSession.endedBy = room.gameState.endedBy;
		}

		// Update final player stats
		Object.values(room.players).forEach(player => {
			if (gameSession.players[player.id]) {
				const playerData = gameSession.players[player.id];
				playerData.finalMoney = player.money;
				playerData.finalPoints = player.points;
				playerData.finalWardrobe = {};
				playerData.totalClothingItems = player.clothingItems || 0;

				// Calculate wardrobe breakdown
				Object.keys(player.wardrobe).forEach(category => {
					playerData.finalWardrobe[category] = {
						count: player.wardrobe[category].items.length,
						max: player.wardrobe[category].max,
						items: player.wardrobe[category].items.map(item => ({
							title: item.title,
							material: item.material,
							condition: item.condition,
							points: item.points
						}))
					};
				});

				// Store round data if available
				if (player.roundData) {
					playerData.roundData = player.roundData;
				}
			}
		});

		// Determine winner (highest points) - only for completed games
		if (endReason !== 'abandoned') {
			let maxPoints = -1;
			let winnerId = null;

			Object.values(gameSession.players).forEach(player => {
				if (player.finalPoints > maxPoints) {
					maxPoints = player.finalPoints;
					winnerId = player.playerId;
				}
			});

			if (winnerId) {
				gameSession.winner = {
					playerId: winnerId,
					username: gameSession.players[winnerId].username,
					points: maxPoints
				};
			} else {
				gameSession.winner = null;
			}
		} else {
			// Abandoned games have no winner
			gameSession.winner = null;
		}

		// Append to analytics file
		const analytics = this.readAnalytics();
		analytics.games.push(gameSession);
		this.writeAnalytics(analytics);

		// Log completion codes to separate file
		if (Object.keys(completionCodes).length > 0) {
			this.logCompletionCodes(gameSession.gameId, gameSession.roomCode, completionCodes, endReason);
		}

		console.log(`📊 Game session ended and saved: ${gameSession.gameId}`);
		console.log(`   Duration: ${gameSession.duration}s, Rounds: ${gameSession.totalRounds}, Winner: ${gameSession.winner?.username}`);
	}

	/**
	 * Get all analytics data
	 * @returns {object} - All analytics data
	 */
	getAllAnalytics() {
		return this.readAnalytics();
	}

	/**
	 * Get analytics summary
	 * @returns {object} - Summary statistics
	 */
	getAnalyticsSummary() {
		const analytics = this.readAnalytics();
		const games = analytics.games || [];

		if (games.length === 0) {
			return {
				totalGames: 0,
				totalPlayers: 0,
				averageDuration: 0,
				averageRounds: 0,
				endReasons: {}
			};
		}

		const summary = {
			totalGames: games.length,
			totalPlayers: games.reduce((sum, game) => sum + game.playerCount.total, 0),
			totalHumanPlayers: games.reduce((sum, game) => sum + game.playerCount.human, 0),
			totalCPUPlayers: games.reduce((sum, game) => sum + game.playerCount.cpu, 0),
			averageDuration: Math.round(games.reduce((sum, game) => sum + (game.duration || 0), 0) / games.length),
			averageRounds: Math.round(games.reduce((sum, game) => sum + (game.totalRounds || 0), 0) / games.length * 10) / 10,
			averageMicroplastics: Math.round(games.reduce((sum, game) => sum + (game.finalMicroplastics || 0), 0) / games.length * 10) / 10,
			endReasons: {},
			mostRecentGames: games.slice(-10).reverse() // Last 10 games
		};

		// Count end reasons
		games.forEach(game => {
			const reason = game.endReason || 'unknown';
			summary.endReasons[reason] = (summary.endReasons[reason] || 0) + 1;
		});

		return summary;
	}

	/**
	 * Verify analytics token
	 * @param {string} token - Token to verify
	 * @returns {boolean} - Whether token is valid
	 */
	verifyToken(token) {
		return token === ANALYTICS_TOKEN;
	}

	/**
	 * Get all completion codes
	 * @returns {object} - All completion codes data
	 */
	getAllCompletionCodes() {
		return this.readCompletionCodes();
	}

	/**
	 * Search for a specific completion code
	 * @param {string} code - Completion code to search for
	 * @returns {object|null} - Code data if found, null otherwise
	 */
	findCompletionCode(code) {
		const codesData = this.readCompletionCodes();
		return codesData.codes.find(entry => entry.code === code) || null;
	}

	/**
	 * Reset analytics data - creates backup before clearing
	 * @returns {object} - Status and backup info
	 */
	resetAnalytics() {
		try {
			const currentData = this.readAnalytics();
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const backupFile = path.join(__dirname, `gameAnalytics.backup.${timestamp}.json`);

			// Create backup of current data
			fs.writeFileSync(backupFile, JSON.stringify(currentData, null, 2), 'utf8');
			console.log(`📦 Analytics backup created: ${backupFile}`);

			// Reset analytics file
			const emptyAnalytics = { games: [] };
			this.writeAnalytics(emptyAnalytics);
			console.log('🔄 Analytics data reset successfully');

			return {
				success: true,
				gamesCleared: currentData.games?.length || 0,
				backupFile: backupFile,
				timestamp: timestamp
			};
		} catch (error) {
			console.error('❌ Error resetting analytics:', error);
			return {
				success: false,
				error: error.message
			};
		}
	}
}

module.exports = new GameDataLogger();
