require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const trivia = require("./trivia");
const actions = require("./actions");
const cardOptions = require("./cardOptions");
const gameDataLogger = require("./gameDataLogger");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);

// Middleware for JSON parsing
app.use(express.json());

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

const stepData = {
	step1: {
		money: undefined,
		action: undefined,
	},
	step2: {
		money: undefined,
		action: undefined,
	},
	step3: {
		money: undefined,
		action: undefined,
	},
};

// CPU Player Configuration
const CPU_CONFIG = {
	maxPlayers: 4,
	cpuPlayerCount: 1, // Number of CPU players to add when only 1 human player
	cpuNames: ["ALEX", "MAYA", "SAM", "ZARA", "KYLE", "NINA", "JADE", "RYAN", "EMMA", "LIAM", "ANYA", "OMAR", "SAGE", "FINN", "LUNA", "DREW", "IRIS", "EZRA", "NOVA", "JUDE", "WREN", "SETH", "VERA", "KAI"],
	decisionDelays: {
		min: 500, // Minimum delay for CPU decisions (ms)
		max: 1000, // Maximum delay for CPU decisions (ms)
	},
	turnStartDelays: {
		// Delay before CPU starts their turn (in milliseconds)
		normal: {
			min: 4000,  // Normal day minimum delay
			max: 6000   // Normal day maximum delay
		},
		washday: {
			min: 18000,  // Sunday washday minimum delay
			max: 20000   // Sunday washday maximum delay
		}
	}
};

class Player {
	constructor(id, isCPU = false) {
		this.id = id;
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.active = true;
		this.loginReady = false;
		this.isCPU = isCPU;
		this.username = isCPU ? this.generateCPUName() : generateUsername();
		this.money = 0;
		this.points = 0;
		this.roundData = {};
		// Initialize roundData for up to 20 rounds (should be more than enough)
		for (let i = 0; i < 20; i++) {
			this.roundData[i] = {
				step1: { money: undefined, action: undefined },
				step2: { money: undefined, action: undefined },
				step3: { money: undefined, action: undefined },
			};
		}

		this.wardrobe = {
			jackets: {
				max: 2,
				items: [],
			},
			sweaters: {
				max: 3,
				items: [],
			},
			pants: {
				max: 4,
				items: [],
			},
			shirts: {
				max: 6,
				items: [],
			},
			excess: {
				max: 200,
				items: [],
			},
		};
		this.clothingItems = 0;
		this.tabActive = true; // Track if player's tab is active
		this.storedCards = []; // Cards stored for later use (e.g., washing day skip cards)
	}

	generateCPUName() {
		const availableNames = [...CPU_CONFIG.cpuNames];
		return availableNames[Math.floor(Math.random() * availableNames.length)];
	}
}

const rooms = {};

function generateUsername(length = 4) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let username = "";
	for (let i = 0; i < length; i++) {
		username += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return username;
}

function generateRoomCode(length = 6) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let code = "";
	for (let i = 0; i < length; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

function shuffleArray(array) {
	return array
		.map((value) => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value);
}

// ✅ Completion Code System (for testing verification)
const COMPLETION_SECRET = process.env.COMPLETION_SECRET || "changeme-use-env-variable-in-production";

/**
 * Generate a signed completion code when a player finishes the game
 * @param {string} playerId - Player UUID
 * @param {string} roomId - Room code
 * @param {string} reason - End reason (microplastics/wardrobe/timeCap)
 * @returns {string} - Completion code (e.g., "A3F8D192-L5K2PM")
 */
function generateCompletionCode(playerId, roomId, reason) {
	const timestamp = Date.now();
	const dataString = JSON.stringify({ playerId, roomId, reason, timestamp });

	// Create HMAC signature
	const signature = crypto
		.createHmac("sha256", COMPLETION_SECRET)
		.update(dataString)
		.digest("hex")
		.substring(0, 8)
		.toUpperCase();

	// Create short timestamp representation (base36 for compactness)
	const timestampShort = timestamp.toString(36).toUpperCase();

	return `CHF-${signature}-${timestampShort}`;
}

/**
 * Verify a completion code against gameAnalytics.json
 * @param {string} code - Completion code to verify
 * @returns {object} - { valid: boolean, data?: object, error?: string }
 */
function verifyCompletionCode(code) {
	try {
		// Parse code format: SIGNATURE-TIMESTAMP (new) or CHK-SIGNATURE-TIMESTAMP (legacy)
		const parts = code.trim().toUpperCase().split("-");

		let signature, timestampShort;

		if (parts.length === 2) {
			// New format: SIGNATURE-TIMESTAMP
			[signature, timestampShort] = parts;
		} else if (parts.length === 3 && parts[0] === "CHK") {
			// Legacy format: CHK-SIGNATURE-TIMESTAMP
			[, signature, timestampShort] = parts;
		} else {
			return { valid: false, error: "Invalid code format" };
		}

		const timestamp = parseInt(timestampShort, 36);

		if (isNaN(timestamp)) {
			return { valid: false, error: "Invalid timestamp in code" };
		}

		const completionDate = new Date(timestamp);
		const now = new Date();
		const daysDiff = Math.floor((now - completionDate) / (1000 * 60 * 60 * 24));

		// Basic validation: code should have valid structure and reasonable timestamp
		if (completionDate > now) {
			return { valid: false, error: "Code timestamp is in the future" };
		}

		// Code is older than 1 year - might be suspicious
		if (daysDiff > 365) {
			return { valid: false, error: "Code is too old (>1 year)" };
		}

		// 🔍 Verify signature against gameAnalytics.json
		const analytics = gameDataLogger.getAllAnalytics();
		const games = analytics.games || [];

		// Search for matching game (timestamp within 10 seconds)
		const TIME_TOLERANCE = 10000; // 10 seconds in milliseconds
		let matchedGame = null;
		let matchedPlayer = null;

		for (const game of games) {
			if (!game.endTime) continue;

			const gameEndTime = new Date(game.endTime).getTime();
			const timeDiff = Math.abs(gameEndTime - timestamp);

			// Check if timestamps match (within tolerance)
			if (timeDiff <= TIME_TOLERANCE) {
				// Search for matching player in this game
				for (const playerId in game.players) {
					const player = game.players[playerId];

					// Skip CPU players
					if (player.isCPU) continue;

					// Try to regenerate signature for this player
					const dataString = JSON.stringify({
						playerId: playerId,
						roomId: game.roomCode,
						reason: game.endReason,
						timestamp: timestamp
					});

					const expectedSignature = crypto
						.createHmac("sha256", COMPLETION_SECRET)
						.update(dataString)
						.digest("hex")
						.substring(0, 8)
						.toUpperCase();

					// Check if signature matches
					if (expectedSignature === signature) {
						matchedGame = game;
						matchedPlayer = { ...player, playerId: playerId };
						break;
					}
				}

				if (matchedGame) break;
			}
		}

		// If no match found, code is invalid
		if (!matchedGame || !matchedPlayer) {
			return {
				valid: false,
				error: "Code signature verification failed - no matching game record found"
			};
		}

		// ✅ Code verified successfully! Return rich game data
		return {
			valid: true,
			data: {
				completionDate: completionDate.toISOString(),
				daysAgo: daysDiff,
				player: {
					playerId: matchedPlayer.playerId,
					username: matchedPlayer.username,
					finalPoints: matchedPlayer.finalPoints,
					finalMoney: matchedPlayer.finalMoney,
					totalClothingItems: matchedPlayer.totalClothingItems,
					triviaStats: {
						correct: matchedPlayer.triviaAnswered.correct,
						incorrect: matchedPlayer.triviaAnswered.incorrect,
						total: matchedPlayer.triviaAnswered.total
					}
				},
				game: {
					gameId: matchedGame.gameId,
					roomCode: matchedGame.roomCode,
					duration: matchedGame.duration,
					totalRounds: matchedGame.totalRounds,
					endReason: matchedGame.endReason,
					finalMicroplastics: matchedGame.finalMicroplastics,
					playerCount: matchedGame.playerCount,
					winner: matchedGame.winner
				},
				isWinner: matchedGame.winner && matchedGame.winner.playerId === matchedPlayer.playerId
			}
		};
	} catch (error) {
		console.error("Error verifying completion code:", error);
		return { valid: false, error: "Failed to verify code" };
	}
}

// CPU Player Management Functions
function createCPUPlayer(roomCode) {
	const playerId = `cpu_${uuidv4()}`;
	const cpuPlayer = new Player(playerId, true);
	cpuPlayer.loginReady = true; // CPU players are always ready
	return cpuPlayer;
}

function addCPUPlayers(roomCode) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const humanPlayerCount = Object.values(room.players).filter(p => !p.isCPU).length;
	const totalPlayerCount = Object.keys(room.players).length;
	
	// Only add CPU players if there's exactly 1 human player and room isn't full
	if (humanPlayerCount === 1 && totalPlayerCount < CPU_CONFIG.maxPlayers) {
		const cpuPlayersToAdd = Math.min(
			CPU_CONFIG.cpuPlayerCount, 
			CPU_CONFIG.maxPlayers - totalPlayerCount
		);
		
		console.log(`Adding ${cpuPlayersToAdd} CPU players to room ${roomCode}`);
		
		for (let i = 0; i < cpuPlayersToAdd; i++) {
			const cpuPlayer = createCPUPlayer(roomCode);
			room.players[cpuPlayer.id] = cpuPlayer;
		}
		
		// Broadcast updated player list to all clients in the room
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
			gameState: room.gameState,
		});
		
		return true;
	}
	return false;
}

function removeCPUPlayers(roomCode) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const cpuPlayerIds = Object.keys(room.players).filter(id => room.players[id].isCPU);
	
	if (cpuPlayerIds.length > 0) {
		console.log(`Removing ${cpuPlayerIds.length} CPU players from room ${roomCode}`);
		
		cpuPlayerIds.forEach(id => {
			delete room.players[id];
		});
		
		// Broadcast updated player list to all clients in the room
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
			gameState: room.gameState,
		});
		
		return true;
	}
	return false;
}

function getRandomDelay() {
	return Math.random() * (CPU_CONFIG.decisionDelays.max - CPU_CONFIG.decisionDelays.min) + CPU_CONFIG.decisionDelays.min;
}

function getCPUTurnStartDelay(roomCode) {
	const room = rooms[roomCode];
	if (!room) return CPU_CONFIG.turnStartDelays.normal.min;

	const gameDay = room.gameState.roundCounter % 7; // 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
	const isWashday = (gameDay === 6); // Sunday is washday

	const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
	const dayName = weekdays[gameDay];

	const delayConfig = isWashday ? CPU_CONFIG.turnStartDelays.washday : CPU_CONFIG.turnStartDelays.normal;
	const delay = Math.random() * (delayConfig.max - delayConfig.min) + delayConfig.min;

	console.log(`🗓️ Game day is ${dayName}${isWashday ? ' (WASHDAY)' : ''}, CPU turn start delay: ${Math.round(delay)}ms`);
	return delay;
}

// CPU Decision Making Functions  
function simulateCPUStep1Roll(roomCode, cpuPlayerId) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	if (!cpuPlayer || !cpuPlayer.isCPU) return;

	console.log(`🤖 CPU ${cpuPlayer.username} will click Step 0 dice button`);
	
	// Simulate clicking the Step 0 button (like human players do)
	// This will trigger the frontend to call generateDices() and handle all the timing naturally
	emitOrQueue(roomCode, "fireEvent", {
		event: 'cpu:clickButton',
		stepIndex: 0,
		playerId: cpuPlayerId
	});
}

function simulateCPUStep2Action(roomCode, cpuPlayerId, data) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	if (!cpuPlayer || !cpuPlayer.isCPU) return;

	console.log(`🤖 CPU ${cpuPlayer.username} will click Step 1 action button`);
	
	// Simulate clicking the Step 1 button (like human players do)
	// This will trigger Network.fire(`show:${this.actionDraw}`) naturally
	emitOrQueue(roomCode, "fireEvent", {
		event: 'cpu:clickButton',
		stepIndex: 1,
		playerId: cpuPlayerId
	});
}

function simulateCPUTrivia(roomCode, cpuPlayerId) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	if (!cpuPlayer || !cpuPlayer.isCPU) return;

	setTimeout(() => {
		// CPU answers trivia with 70% accuracy
		const isCorrect = Math.random() > 0.3;

		// Simulate trivia answer processing (similar to actual trivia logic)
		if (isCorrect) {
			cpuPlayer.points += 5;
			console.log(`🤖 CPU ${cpuPlayer.username} answered trivia correctly (+5 points)`);
		} else {
			room.gameState.microplastics = Math.min(room.gameState.microplasticsMax, room.gameState.microplastics + 1);
			console.log(`🤖 CPU ${cpuPlayer.username} answered trivia incorrectly (+1 microplastic)`);
		}

		// 📊 Log CPU trivia answer to analytics
		if (room.gameSession) {
			gameDataLogger.logTrivia(
				room.gameSession,
				cpuPlayerId,
				room.gameState.trivia,
				isCorrect,
				room.gameState.roundCounter
			);
		}

		// Broadcast the update
		emitOrQueue(roomCode, "game:update", {
			gameState: room.gameState,
		});
		io.to(roomCode).emit("players:update", {
			players: room.players,
		});

		// Let frontend handle step advancement naturally after trivia completion

	}, getRandomDelay());
}

function simulateCPUAction(roomCode, cpuPlayerId, actionData) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	if (!cpuPlayer || !cpuPlayer.isCPU) return;

	// The client-side action.js already handles CPU actions automatically
	// with auto-click after 3 seconds. No server-side processing needed.
	console.log(`🤖 CPU ${cpuPlayer.username} action will be handled by client-side auto-click`);
}

function simulateCPUCardDecision(roomCode, cpuPlayerId, cards) {
	if (!rooms[roomCode] || !cards || cards.length === 0) return;
	
	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	if (!cpuPlayer || !cpuPlayer.isCPU) return;
	
	setTimeout(() => {
		console.log(`🤖 CPU ${cpuPlayer.username} analyzing cards for purchase (budget: $${cpuPlayer.money})`);

		// CPU selects cards based on simple heuristics
		const selectedCardIndices = [];
		const budget = cpuPlayer.money;
		let remainingBudget = budget;

		// Sort cards by value/price ratio (prefer better deals)
		const sortedCards = [...cards].map((card, index) => ({ ...card, originalIndex: index }))
			.sort((a, b) => {
				const ratioA = (a.points || 0) / Math.max(a.price || 1, 1);
				const ratioB = (b.points || 0) / Math.max(b.price || 1, 1);
				return ratioB - ratioA;
			});

		// Select cards that fit budget and wardrobe space (but don't actually purchase yet)
		for (const card of sortedCards) {
			const price = card.price || 0;
			if (price <= remainingBudget) {
				const wardrobeCategory = card.type?.toLowerCase() || 'excess';
				const wardrobe = cpuPlayer.wardrobe[wardrobeCategory] || cpuPlayer.wardrobe.excess;

				if (wardrobe.items.length < wardrobe.max) {
					selectedCardIndices.push(card.originalIndex);
					remainingBudget -= price;
					console.log(`🤖 CPU ${cpuPlayer.username} selecting card ${card.originalIndex}: ${card.title} ${card.type} for $${price}`);
				}
			}
		}

		console.log(`🤖 CPU ${cpuPlayer.username} selected ${selectedCardIndices.length} cards for $${budget - remainingBudget}`);

		// Store whether CPU selected any cards for later use
		cpuPlayer.hasSelectedCards = selectedCardIndices.length > 0;
		cpuPlayer.selectedCardIndices = selectedCardIndices;

		// Mark selected cards in game state (like clicking on cards)
		selectedCardIndices.forEach(cardIndex => {
			setDeepValue(room.gameState, `cards[${cardIndex}].selected`, true);
		});

		// Increment version for state tracking
		incrementGameStateVersion(room);

		// Broadcast the card selection update
		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		console.log(`🛒 CPU ${cpuPlayer.username} completed card selection, will purchase after delay`);

	}, getRandomDelay());
}

// Helper function to simulate CPU firing network events with proper timing
function simulateCPUFireEvent(roomCode, cpuPlayerId, event, args = {}) {
	if (!rooms[roomCode]) return;
	
	// Use a longer delay to give frontend time to update
	const delay = Math.random() * 2000 + 1500; // 1.5-3.5 seconds (more human-like)
	
	setTimeout(() => {
		// Double-check it's still this CPU's turn before firing
		const room = rooms[roomCode];
		if (!room) return;
		
		const currentPlayer = room.players[room.gameState.currentTurnPlayerId];
		if (!currentPlayer || !currentPlayer.isCPU || currentPlayer.id !== cpuPlayerId) {
			console.log(`🤖 CPU ${cpuPlayerId} skipping event ${event} - not their turn anymore`);
			return;
		}
		
		console.log(`🤖 CPU ${currentPlayer.username} firing event: ${event}`, args);
		// Emit the same fireEvent that human players would trigger
		emitOrQueue(roomCode, "fireEvent", {
			event,
			playerId: cpuPlayerId,
			...args
		});
	}, delay);
}

// Helper function to trigger CPU actions for the current turn player only
function triggerCPUDecision(roomCode, cpuPlayerId, eventType, data = {}) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const cpuPlayer = room.players[cpuPlayerId];
	
	if (!cpuPlayer || !cpuPlayer.isCPU || !cpuPlayer.active) return;
	
	// Double-check this is still the current turn player
	if (room.gameState.currentTurnPlayerId !== cpuPlayerId) {
		console.log(`🤖 Skipping ${eventType} for CPU ${cpuPlayer.username} - not their turn`);
		return;
	}
	
	switch (eventType) {
		case 'step1':
			simulateCPUStep1Roll(roomCode, cpuPlayerId);
			break;
		case 'step2':
			simulateCPUStep2Action(roomCode, cpuPlayerId, data);
			break;
		case 'trivia':
			simulateCPUTrivia(roomCode, cpuPlayerId);
			break;
		case 'action':
			simulateCPUAction(roomCode, cpuPlayerId, data.actionData);
			break;
		case 'cards':
			simulateCPUCardDecision(roomCode, cpuPlayerId, data.cards);
			break;
	}
}

// Legacy function for compatibility - now targets current turn player only
function triggerCPUDecisions(roomCode, eventType, data = {}) {
	if (!rooms[roomCode]) return;
	
	const room = rooms[roomCode];
	const currentPlayerId = room.gameState.currentTurnPlayerId;
	const currentPlayer = room.players[currentPlayerId];
	
	console.log(`🎯 triggerCPUDecisions called: eventType=${eventType}, currentPlayer=${currentPlayer?.username}, isCPU=${currentPlayer?.isCPU}`);
	
	// Only trigger for the current turn player if they're a CPU
	if (currentPlayer && currentPlayer.isCPU && currentPlayer.active) {
		triggerCPUDecision(roomCode, currentPlayerId, eventType, data);
	} else {
		console.log(`🚫 Skipping CPU trigger - currentPlayer: ${currentPlayer?.username}, isCPU: ${currentPlayer?.isCPU}, active: ${currentPlayer?.active}`);
	}
}

// No longer needed - CPU now uses natural frontend flow through button clicks

io.on("connection", (socket) => {
	console.log(`✅ Client connected: ${socket.id}`);

	// Store persistent username across rooms for this socket
	socket.persistentUsername = null;

	// Send initial username immediately upon connection
	const initialUsername = generateUsername();
	socket.emit("initialConnection", {
		playerId: socket.id,
		player: {
			username: initialUsername
		}
	});

	socket.on("getFullState", () => {
		const roomCode = socket.roomCode;
		if (!roomCode || !rooms[roomCode]) return;

		const room = rooms[roomCode];
		socket.emit("fullState", {
			players: room.players,
			gameState: room.gameState,
		});
	});

	socket.on("createRoom", () => {
		const roomCode = generateRoomCode();
		rooms[roomCode] = createBaseRoom();

		// store trivia
		rooms[roomCode].trivia = shuffleArray([...trivia]);

		// store action
		rooms[roomCode].actions = shuffleArray([...actions]);

		// Generate a persistent playerId
		const playerId = uuidv4();
		socket.playerId = playerId;

		// Create new player
		const player = new Player(playerId);
		
		// Use persistent username if available
		if (socket.persistentUsername) {
			player.username = socket.persistentUsername;
		}
		
		rooms[roomCode].players[playerId] = player;

		// const player = new Player(socket.id);
		// rooms[roomCode].players[socket.id] = player;
		socket.join(roomCode);
		socket.roomCode = roomCode;
		// socket.playerId = socket.id;

		// Don't add CPU players for regular room creation - only for startAlone
		// addCPUPlayers(roomCode);

		// Set phase to "room" for multiplayer room creation
		rooms[roomCode].gameState.currentPhase = "room";

		socket.emit("roomCreated", { roomCode });
		socket.emit("joinedRoom", {
			id: socket.id,
			playerId: playerId,
			roomCode: roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});

		// For CPU games, resend latest event in case game was stuck
		setTimeout(() => {
			resendLatestEventToCPUPlayer(roomCode, playerId);
		}, 1500);
	});

	socket.on("startAlone", () => {
		const roomCode = generateRoomCode();
		rooms[roomCode] = createBaseRoom();

		// store trivia
		rooms[roomCode].trivia = shuffleArray([...trivia]);

		// store action
		rooms[roomCode].actions = shuffleArray([...actions]);

		// Generate a persistent playerId
		const playerId = uuidv4();
		socket.playerId = playerId;

		// Create new player
		const player = new Player(playerId);

		// Use persistent username if available
		if (socket.persistentUsername) {
			player.username = socket.persistentUsername;
		}

		rooms[roomCode].players[playerId] = player;

		socket.join(roomCode);
		socket.roomCode = roomCode;

		// Add CPU players for single player game
		addCPUPlayers(roomCode);

		// Start with introduction phase for single player
		rooms[roomCode].gameState.currentPhase = "introduction";
		rooms[roomCode].gameState.started = true;

		console.log(`🤖 Started single player game in room ${roomCode} - showing introduction`);

		socket.emit("roomCreated", { roomCode });
		socket.emit("joinedRoom", {
			id: socket.id,
			playerId: playerId,
			roomCode: roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});
	});

	socket.on("updateUsername", ({ playerId, newUsername }) => {
		// console.log(playerId);
		console.log(newUsername);
		
		// Store username persistently on the socket
		socket.persistentUsername = newUsername;
		
		if (
			rooms[socket.roomCode] &&
			rooms[socket.roomCode].players[playerId]
		) {
			rooms[socket.roomCode].players[playerId].username = newUsername;

			// Broadcast updated player data to others in the room
			io.to(socket.roomCode).emit("playerUpdated", {
				id: socket.id,
				roomCode: socket.roomCode,
				player: rooms[socket.roomCode].players[socket.id],
				players: rooms[socket.roomCode].players,
				gameState: rooms[socket.roomCode].gameState,
			});
		}
	});

	socket.on("updateLoginReady", ({ playerId, loginReady }) => {
		console.log(playerId);
		console.log(loginReady);
		if (
			rooms[socket.roomCode] &&
			rooms[socket.roomCode].players[playerId]
		) {
			rooms[socket.roomCode].players[playerId].loginReady = loginReady;

			// Broadcast updated player data to others in the room
			io.to(socket.roomCode).emit("playerUpdated", {
				id: socket.id,
				roomCode: socket.roomCode,
				player: rooms[socket.roomCode].players[socket.id],
				players: rooms[socket.roomCode].players,
				gameState: rooms[socket.roomCode].gameState,
			});
		}
	});

	socket.on("joinRoom", (roomCode) => {
		if (!rooms[roomCode]) {
			socket.emit("error", { message: "Room not found" });
			return;
		}

		socket.join(roomCode);
		socket.roomCode = roomCode;

		// Generate a persistent playerId
		const playerId = uuidv4();
		socket.playerId = playerId;

		// Create new player
		const player = new Player(playerId);
		player.socketId = socket.id; // Optional: track active socket for this player
		player.active = true;
		
		// Use persistent username if available
		if (socket.persistentUsername) {
			player.username = socket.persistentUsername;
		}
		
		rooms[roomCode].players[playerId] = player;

		// Remove CPU players when a second human player joins
		const humanPlayerCount = Object.values(rooms[roomCode].players).filter(p => !p.isCPU).length;
		if (humanPlayerCount > 1) {
			removeCPUPlayers(roomCode);
		}

		// Set phase to "room" when joining a room (if not already started)
		if (rooms[roomCode].gameState.currentPhase === "login") {
			rooms[roomCode].gameState.currentPhase = "room";
		}

		// Send info back to this client
		socket.emit("joinedRoom", {
			playerId,
			roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});

		// For CPU games, resend latest event in case game was stuck
		setTimeout(() => {
			resendLatestEventToCPUPlayer(roomCode, playerId);
		}, 1500);

		// Notify others
		socket.to(roomCode).emit("playerJoined", {
			playerId,
			player,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});
	});

	socket.on("rejoinRoom", ({ roomCode, playerId }) => {
		const room = rooms[roomCode];
		const player = room?.players[playerId];

		if (!room || !player) {
			console.log("rejoin failed");
			console.log(room?.players);
			console.log(playerId);
			socket.emit("rejoinFailed");
			return;
		}

		socket.join(roomCode);
		socket.roomCode = roomCode;
		socket.playerId = playerId;

		// Re-link socket
		player.active = true;
		player.socketId = socket.id;

		socket.emit("rejoinSuccess", {
			playerId,
			roomCode,
			players: room.players,
			gameState: room.gameState,
		});

		socket.to(roomCode).emit("playerRejoined", {
			playerId,
			player,
			players: room.players,
			gameState: room.gameState,
		});

		if (room.timeoutId) {
			clearTimeout(room.timeoutId);
			room.timeoutId = null;
			console.log(`✅ Cancelled deletion timeout for room ${roomCode}`);
		}

		// For CPU games, resend the latest event to help unstick the game
		resendLatestEventToCPUPlayer(roomCode, playerId);
	});

	socket.on("positionUpdate", (data) => {
		const roomCode = socket.roomCode;
		const playerId = socket.playerId;

		if (!roomCode || !rooms[roomCode]) return;
		const player = rooms[roomCode].players[playerId];
		if (!player) return;

		player.x = data.x;
		player.y = data.y;
		player.z = data.z;

		socket.to(roomCode).emit("playerMoved", {
			id: playerId,
			x: data.x,
			y: data.y,
			z: data.z,
		});
	});

	socket.on("playerAction", ({ roomCode, action }) => {
		const room = rooms[roomCode];
		if (!room) return;

		// Update gameState
		room.gameState.someValue = action.someValue;

		// Option 1: Send only delta
		socket.to(roomCode).emit("gameStateUpdated", room.gameState);

		// Option 2: Send full state to all (if major change)
		// broadcastFullState(roomCode);
	});

	socket.on("game:update", ({ roomCode, path, value }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const playerId = socket.playerId;
		const currentTurnPlayerId = room.gameState.currentTurnPlayerId;

		// ✅ CRITICAL: Validate turn ownership for turn-sensitive updates
		const turnSensitivePaths = ['stepCounter', 'currentTurnPlayerId', 'roundCounter', 'turnCounter'];
		const isTurnSensitive = turnSensitivePaths.some(p => path === p || path.startsWith(p + '.'));

		if (isTurnSensitive && currentTurnPlayerId !== playerId) {
			const player = room.players[playerId];
			const currentPlayer = room.players[currentTurnPlayerId];

			// Allow if:
			// 1. The requester is a CPU (server-controlled)
			// 2. OR it's a single-player game and the current turn player is CPU (human controls CPU actions)
			const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
			const isSinglePlayer = humanPlayers.length === 1;
			const currentPlayerIsCPU = currentPlayer && currentPlayer.isCPU;

			const canUpdate = player?.isCPU || (isSinglePlayer && currentPlayerIsCPU);

			if (!canUpdate) {
				console.log(`❌ Rejected game:update from ${playerId} - not their turn (path: ${path})`);
				console.log(`   Current turn: ${currentTurnPlayerId} (${currentPlayer?.username})`);
				console.log(`   Requester: ${playerId} (${player?.username})`);

				// Send current game state back to sync the client
				socket.emit("gameStateUpdated", {
					gameState: room.gameState,
				});
				return;
			}
		}

		// ✅ Ensure microplastics can't go negative
		if (path === "microplastics" && value < 0) {
			value = 0;
		}

		// Store previous values for comparison
		const prevStepCounter = room.gameState.stepCounter;
		const prevCurrentTurnPlayerId = room.gameState.currentTurnPlayerId;

		console.log(`📡 game:update received - path: ${path}, value: ${value}, prevStep: ${prevStepCounter}, playerId: ${playerId}`);

		// 🔄 Intercept turn advancement to ensure consistent player ordering
		if (path === "currentTurnPlayerId" && value !== room.gameState.currentTurnPlayerId) {
			console.log(`🔄 Turn advancement detected: ${room.players[room.gameState.currentTurnPlayerId]?.username} → ${room.players[value]?.username}`);
			
			// Get consistent sorted player order
			const playerIds = Object.keys(room.players).filter(id => room.players[id].active);
			const sortedPlayerIds = playerIds.sort((a, b) => {
				const playerA = room.players[a];
				const playerB = room.players[b];
				if (playerA.isCPU && !playerB.isCPU) return 1; // CPU comes after human
				if (!playerA.isCPU && playerB.isCPU) return -1; // Human comes before CPU
				return 0; // Same type, maintain current order
			});
			
			// Find current player index in sorted order
			const currentIndex = sortedPlayerIds.indexOf(room.gameState.currentTurnPlayerId);
			const nextIndex = (currentIndex + 1) % sortedPlayerIds.length;
			const correctNextPlayer = sortedPlayerIds[nextIndex];
			
			console.log(`🔍 Turn order check:`, {
				sortedPlayerIds: sortedPlayerIds.map(id => ({id, name: room.players[id].username})),
				currentIndex,
				nextIndex,
				requestedPlayer: {id: value, name: room.players[value]?.username},
				correctNextPlayer: {id: correctNextPlayer, name: room.players[correctNextPlayer]?.username}
			});
			
			// If the requested player is not the correct next player, override it
			if (value !== correctNextPlayer) {
				console.log(`🔄 Correcting turn order: ${room.players[value]?.username} → ${room.players[correctNextPlayer]?.username}`);
				value = correctNextPlayer;
			}
		}

		// ✅ Set nested value using the path
		setDeepValue(room.gameState, path, value);
		
		// 🎬 Start introduction phase when phase changes to "introduction"
		if (path === "currentPhase" && value === "introduction") {
			console.log(`🎬 Introduction phase started for room ${roomCode}`);
			startIntroductionTimer(roomCode);
		}

		// 🎮 Initialize first turn player when game starts
		if (path === "currentPhase" && value === "game" && !room.gameState.currentTurnPlayerId) {
			const playerIds = Object.keys(room.players).filter(id => room.players[id].active);
			if (playerIds.length > 0) {
				// Sort players to ensure consistent turn order: human players first, then CPU players
				const sortedPlayerIds = playerIds.sort((a, b) => {
					const playerA = room.players[a];
					const playerB = room.players[b];
					if (playerA.isCPU && !playerB.isCPU) return 1; // CPU comes after human
					if (!playerA.isCPU && playerB.isCPU) return -1; // Human comes before CPU
					return 0; // Same type, maintain current order
				});

				room.gameState.currentTurnPlayerId = sortedPlayerIds[0];
				room.gameState.currentTurnIndex = 0;
				room.gameState.turnOrder = sortedPlayerIds;
				console.log(`🎯 Game started! Turn order:`, sortedPlayerIds.map(id => room.players[id].username));
				console.log(`🎯 First turn player: ${room.players[sortedPlayerIds[0]].username}`);

				// 📊 Initialize analytics tracking for this game
				if (!room.gameSession) {
					room.gameSession = gameDataLogger.initGameSession(roomCode, room.players);
					console.log(`📊 Analytics tracking started for game ${room.gameSession.gameId}`);
				}

				// ⏱️ Start game timer for 20-minute event tracking
				startGameTimer(roomCode);
			}
		}
		
		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		console.log(`📡 Updated gameState - stepCounter: ${room.gameState.stepCounter}, currentTurn: ${room.gameState.currentTurnPlayerId}`);

		// ✅ Broadcast updated gameState
		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		// 🤖 Check if we need to trigger CPU actions based on step/turn changes
		const currentPlayerId = room.gameState.currentTurnPlayerId;
		const currentPlayer = room.players[currentPlayerId];
		
		console.log(`🔍 CPU Decision Check - path: ${path}, value: ${value}, currentPlayer: ${currentPlayer?.username}, isCPU: ${currentPlayer?.isCPU}`);

		if (currentPlayer && currentPlayer.isCPU && room.gameState.currentPhase === 'game') {
			// Only trigger CPU actions if the game is in the right state
			const gameState = room.gameState;

			// If stepCounter changed to 0 (start of turn), CPU needs to roll dice
			// But only if no cards are selected and not purchased
			if (path === "stepCounter" && value === 0 && !gameState.cards?.some(card => card.selected)) {
				console.log(`🤖 Step 0: CPU ${currentPlayer.username} will roll dice after turn start delay`);
				// Add configurable delay based on day of the week (longer on washday Sunday)
				setTimeout(() => {
					triggerCPUDecisions(roomCode, 'step1');
				}, getCPUTurnStartDelay(roomCode));
			}
			// If stepCounter changed to 1, CPU needs to execute step 2 action
			// But only if no trivia/action is currently active
			else if (path === "stepCounter" && value === 1 && !gameState.trivia?.active && !gameState.action?.active) {
				console.log(`🤖 Step 1: CPU ${currentPlayer.username} will execute step 2 after frontend updates`);
				// Add human-like delay before clicking action button (2-4 seconds)
				setTimeout(() => {
					triggerCPUDecisions(roomCode, 'step2');
				}, Math.random() * 2000 + 2000);
			}
			// If stepCounter changed to 2 (card purchasing step), CPU should analyze and select cards
			else if (path === "stepCounter" && value === 2) {
				console.log(`🤖 Step 2: CPU ${currentPlayer.username} is now in card purchasing phase`);

				// First, trigger card analysis and selection
				const activeCards = gameState.cards?.filter(card => card.active) || [];
				if (activeCards.length > 0) {
					console.log(`🤖 CPU ${currentPlayer.username} will analyze ${activeCards.length} available cards`);
					triggerCPUDecisions(roomCode, 'cards', { cards: activeCards });
				}

				// Then after a longer delay, make the purchase decision
				setTimeout(() => {
					// Check if CPU selected any cards (hasSelectedCards was set during simulateCPUCardDecision)
					if (currentPlayer.hasSelectedCards === false) {
						console.log(`🤖 CPU ${currentPlayer.username} can't afford any cards, will buy nothing`);
						emitOrQueue(roomCode, "fireEvent", {
							event: "cpu:buyNothing",
							playerId: currentPlayerId
						});
					} else if (currentPlayer.hasSelectedCards === true) {
						console.log(`🤖 CPU ${currentPlayer.username} has selected cards, will click purchase button`);
						emitOrQueue(roomCode, "fireEvent", {
							event: "cpu:purchase",
							playerId: currentPlayerId
						});
					}
				}, Math.random() * 3000 + 3000); // Longer delay to allow card selection to complete
			}
			// If turn just changed to this CPU player and we're at step 0
			else if (path === "currentTurnPlayerId" && value === currentPlayerId && gameState.stepCounter === 0) {
				console.log(`🤖 Turn changed to CPU ${currentPlayer.username}, will start after turn delay`);
				// Add configurable delay based on day of the week (longer on washday Sunday)
				setTimeout(() => {
					triggerCPUDecisions(roomCode, 'step1');
				}, getCPUTurnStartDelay(roomCode));
			}
		}
		
		// Let the normal game flow handle turn advancement, just ensure proper ordering above
	});

	socket.on("players:update", ({ roomCode, path, value }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const playerId = socket.playerId;
		const currentTurnPlayerId = room.gameState.currentTurnPlayerId;

		// ✅ CRITICAL: Validate player can only update their own data or if it's their turn
		// Extract the target player ID from path (e.g., "playerId123.money" -> "playerId123")
		const targetPlayerId = path.split('.')[0];

		// Player can update their own data, or current turn player can update game-related data
		let canUpdate = targetPlayerId === playerId || currentTurnPlayerId === playerId;

		// In single-player mode, also allow human to update CPU player data (since CPU actions are client-driven)
		if (!canUpdate) {
			const player = room.players[playerId];
			const targetPlayer = room.players[targetPlayerId];
			const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
			const isSinglePlayer = humanPlayers.length === 1;

			// Allow if:
			// 1. The requester is a CPU (server-controlled)
			// 2. OR it's single-player and target is a CPU (human controls CPU actions)
			canUpdate = player?.isCPU || (isSinglePlayer && targetPlayer?.isCPU);
		}

		if (!canUpdate) {
			const player = room.players[playerId];
			console.log(`❌ Rejected players:update from ${playerId} - unauthorized (path: ${path})`);
			console.log(`   Target player: ${targetPlayerId}`);
			console.log(`   Current turn: ${currentTurnPlayerId} (${room.players[currentTurnPlayerId]?.username})`);
			console.log(`   Requester: ${playerId} (${player?.username})`);

			// Send current players state back to sync the client
			socket.emit("playersUpdated", {
				players: room.players,
			});
			return;
		}

		// ✅ Ensure money never goes negative
		if (path.endsWith('.money') && value < 0) {
			value = 0;
		}

		setDeepValue(room.players, path, value);

		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("trivia:get", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room) return;

		// If no trivia left, reshuffle and reset all questions
		if (!room.trivia.length) {
			room.trivia = shuffleArray([...trivia]);
			console.log(`🔄 Reshuffled trivia questions for room ${roomCode}`);
		}

		// First check for prioritized questions
		let nextTrivia;
		const prioritizedIndex = room.trivia.findIndex(q => q.prioritize === true || q.priotize === true);

		if (prioritizedIndex !== -1) {
			// Use prioritized question
			nextTrivia = room.trivia.splice(prioritizedIndex, 1)[0];
		} else {
			// No prioritized questions left, pick random from remaining
			const randomIndex = Math.floor(Math.random() * room.trivia.length);
			nextTrivia = room.trivia.splice(randomIndex, 1)[0];
		}

		room.gameState.trivia.active = true;
		room.gameState.trivia.title = nextTrivia.title;
		room.gameState.trivia.text = nextTrivia.statement;
		room.gameState.trivia.reasoning = nextTrivia.reasoning;
		room.gameState.trivia.correct = nextTrivia.correct || 2;
		room.gameState.trivia.wrong = nextTrivia.wrong || -2;
		room.gameState.trivia.answer = nextTrivia.answer;

		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		// Trigger CPU trivia decisions
		triggerCPUDecisions(roomCode, 'trivia');
	});

	// New socket handler for logging trivia answers
	socket.on("trivia:answer", ({ roomCode, playerId, isCorrect }) => {
		const room = rooms[roomCode];
		if (!room || !room.gameSession) return;

		// 📊 Log trivia answer to analytics
		gameDataLogger.logTrivia(
			room.gameSession,
			playerId,
			room.gameState.trivia,
			isCorrect,
			room.gameState.roundCounter
		);
	});

	// 🎬 Introduction: Player reached waitGroup and is ready
	socket.on("intro:playerReady", ({ roomCode, playerId }) => {
		const room = rooms[roomCode];
		if (!room) return;

		// Check if player is already marked as ready
		if (room.gameState.introduction.playersReady.includes(playerId)) {
			console.log(`🎬 Player ${playerId} already marked as ready`);
			return;
		}

		// Add player to ready list
		room.gameState.introduction.playersReady.push(playerId);
		const player = room.players[playerId];
		console.log(`🎬 Player ${player?.username || playerId} is ready (${room.gameState.introduction.playersReady.length} ready)`);

		// Check if this is a single player game (1 human + CPUs)
		const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
		const isSinglePlayer = humanPlayers.length === 1;

		// Increment version for state tracking
		incrementGameStateVersion(room);

		// Broadcast updated state
		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		// For single player: start immediately when ready
		if (isSinglePlayer) {
			console.log(`🎬 Single player ready, starting game immediately in room ${roomCode}`);
			stopIntroductionTimer(roomCode);
			startGameFromIntroduction(roomCode);
			return;
		}

		// For multiplayer: check if all players are ready
		if (checkIfAllPlayersReady(roomCode)) {
			console.log(`🎬 All players ready, starting game early in room ${roomCode}`);
			stopIntroductionTimer(roomCode);
			startGameFromIntroduction(roomCode);
		}
	});

	socket.on("action:get", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room) return;

		// Pick and remove the next action question
		// const nextAction = room.actions.shift();

		// Pick random one
		const index = Math.floor(Math.random() * room.actions.length);
		const nextAction = room.actions[index];

		room.gameState.action.active = true;
		room.gameState.action.title = nextAction.title;
		room.gameState.action.text = nextAction.statement;
		room.gameState.action.reasoning = nextAction.reasoning;
		room.gameState.action.action = nextAction.action;
		room.gameState.action.name = nextAction.name;
		room.gameState.action.texture = nextAction.texture;

		// 📊 Log action to analytics for current turn player
		if (room.gameSession && room.gameState.currentTurnPlayerId) {
			gameDataLogger.logAction(
				room.gameSession,
				room.gameState.currentTurnPlayerId,
				nextAction,
				room.gameState.roundCounter
			);
		}

		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		// Trigger CPU action decisions
		triggerCPUDecisions(roomCode, 'action', { actionData: nextAction });
	});

	socket.on("money:add", ({ roomCode, playerId, amount }) => {
		const room = rooms[roomCode];
		if (!room) return;

		room.players[playerId].money += amount;
		// ✅ Ensure money never goes negative
		if (room.players[playerId].money < 0) {
			room.players[playerId].money = 0;
		}
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("wardrobe:add", ({ roomCode, playerId, data }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const player = room.players[playerId];
		const targetType = data.type.toLowerCase();

		// Check if the target wardrobe category has capacity
		const wardrobeCategory = player.wardrobe[targetType];
		const currentCount = wardrobeCategory ? wardrobeCategory.items.length : 0;
		const maxCapacity = wardrobeCategory ? wardrobeCategory.max : 0;

		// If the target category is full (and not already excess), redirect to excess
		let finalType = targetType;
		if (targetType !== 'excess' && currentCount >= maxCapacity) {
			console.log(`Wardrobe overflow: ${targetType} is full (${currentCount}/${maxCapacity}), redirecting to excess`);
			finalType = 'excess';
			data.type = 'excess'; // Update the item's type for consistency
		}

		// Add item to the final determined category
		player.wardrobe[finalType].items.push(data);

		console.log(`Added item to ${finalType}: ${data.title} ${data.item} (${player.wardrobe[finalType].items.length}/${player.wardrobe[finalType].max})`);

		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("storedCard:add", ({ roomCode, playerId, cardData }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const player = room.players[playerId];
		if (!player) return;

		// Add card to player's stored cards
		player.storedCards.push(cardData);

		console.log(`Stored card for player ${playerId}: ${cardData.name} (${cardData.skipAmount})`);

		// Notify all clients of the player state update
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("storedCard:remove", ({ roomCode, playerId, cardId }) => {
		console.log(`🗑️ SERVER: Received storedCard:remove request for player ${playerId}, card ${cardId}`);

		const room = rooms[roomCode];
		if (!room) {
			console.log(`🗑️ SERVER: Room ${roomCode} not found`);
			return;
		}

		const player = room.players[playerId];
		if (!player) {
			console.log(`🗑️ SERVER: Player ${playerId} not found in room`);
			return;
		}

		console.log(`🗑️ SERVER: Player ${playerId} has ${player.storedCards.length} stored cards before removal`);
		console.log(`🗑️ SERVER: Stored cards:`, player.storedCards);

		// Remove card from player's stored cards
		const index = player.storedCards.findIndex(card => card.id === cardId);
		if (index !== -1) {
			const removedCard = player.storedCards.splice(index, 1)[0];
			console.log(`✅ SERVER: Removed stored card for player ${playerId}: ${removedCard.name}`);
			console.log(`✅ SERVER: Player now has ${player.storedCards.length} stored cards`);

			// Notify all clients of the player state update
			io.to(roomCode).emit("playersUpdated", {
				players: room.players,
			});
			console.log(`✅ SERVER: Emitted playersUpdated to room ${roomCode}`);
		} else {
			console.log(`⚠️ SERVER: Card ${cardId} not found in player's storedCards`);
		}
	});

	// New socket handler for logging card purchases
	socket.on("cards:purchased", ({ roomCode, playerId, cards }) => {
		const room = rooms[roomCode];
		if (!room || !room.gameSession) return;

		// 📊 Log card purchases to analytics
		if (cards && cards.length > 0) {
			gameDataLogger.logCardPurchases(
				room.gameSession,
				playerId,
				cards,
				room.gameState.roundCounter
			);
		}
	});

	socket.on("cards:generate", ({ roomCode, forceReset = false }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const options = room.gameState.cardOptions;
		const items = Object.keys(options);

		console.log(`Generating cards for room ${roomCode}, forceReset: ${forceReset}`);

		for (let i = 0; i < room.gameState.cards.length; i++) {
			const card = room.gameState.cards[i];
			
			// If forceReset is true, or card is not active, generate a new card
			if (forceReset || !card.active) {
				// pick random item type (T-shirt, Jeans, etc.)
				const itemType =
					items[Math.floor(Math.random() * items.length)];
				const itemOptions = options[itemType];

				// decide randomly between new or secondHand
				const condition =
					Math.random() < 0.5 && itemOptions.secondHand.length > 0
						? "secondHand"
						: "new";

				const choices = itemOptions[condition];
				const choice =
					choices[Math.floor(Math.random() * choices.length)];

				card.active = true;
				card.selected = false;
				card.title = choice.sort;
				card.material = choice.material;
				card.condition = condition;
				card.item = itemType;
				card.sort = choice.sort;
				card.points = choice.value;
				card.price = choice.price;
				card.washed = false;

				console.log(`Generated new card for slot ${i}: ${choice.sort} ${itemType}`);
			}
		}

		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});

		// Cards are generated, but CPU will only analyze them when they reach step 2
	});

	socket.on("cards:forceReset", ({ roomCode }) => {
		console.log(`Force resetting all cards for room ${roomCode}`);

		// First, notify client to reset all cards
		io.to(roomCode).emit("cardsForceReset");

		// Then regenerate all cards on server
		const room = rooms[roomCode];
		if (room) {
			// Mark all cards as inactive to force regeneration
			room.gameState.cards.forEach(card => {
				card.active = false;
			});
			
			// Generate new cards directly on server with forceReset flag
			setTimeout(() => {
				const options = room.gameState.cardOptions;
				const items = Object.keys(options);

				console.log(`Generating cards for room ${roomCode}, forceReset: true`);

				for (let i = 0; i < room.gameState.cards.length; i++) {
					const card = room.gameState.cards[i];
					
					// Generate a new card since forceReset is true
					const itemType = items[Math.floor(Math.random() * items.length)];
					const itemOptions = options[itemType];

					// decide randomly between new or secondHand
					const condition =
						Math.random() < 0.5 && itemOptions.secondHand.length > 0
							? "secondHand"
							: "new";

					const choices = itemOptions[condition];
					const choice = choices[Math.floor(Math.random() * choices.length)];

					card.active = true;
					card.selected = false;
					card.title = choice.sort;
					card.material = choice.material;
					card.condition = condition;
					card.item = itemType;
					card.sort = choice.sort;
					card.points = choice.value;
					card.price = choice.price;
					card.washed = false;

					console.log(`Generated new card for slot ${i}: ${choice.sort} ${itemType}`);
				}

				// ✅ Increment version for state tracking
				incrementGameStateVersion(room);

				// Broadcast updated game state to ALL players in the room
				io.to(roomCode).emit("gameStateUpdated", {
					gameState: room.gameState,
				});
			}, 100); // Small delay to ensure client reset completes first
		}
	});

	socket.on("wardrobe:swap:init", ({ roomCode }) => {
		console.log("Swap init called for room:", roomCode);

		const room = rooms[roomCode];
		if (!room) {
			console.log("Room not found!");
			return;
		}
		if (room.gameState.ended) {
			console.log("Game already ended for room:", roomCode);
			return;
		}

		const currentPlayerId = room.gameState.currentTurnPlayerId;
		console.log("Current player ID:", currentPlayerId);

		const currentPlayer = room.players[currentPlayerId];
		if (!currentPlayer) {
			console.log("Current player not found in room.players");
			return;
		}
		console.log("Current player object:", currentPlayer);

		// Helper: get all items from a wardrobe
		const getAllItems = (wardrobe) =>
			Object.values(wardrobe || {}).flatMap((slot) => slot?.items || []);

		let currentPlayerWardrobeItem = null;
		let otherPlayerWardrobeItem = null;
		let randomOtherPlayerId = null;
		let canSwap = false;

		const currentPlayerItems = getAllItems(currentPlayer.wardrobe);
		console.log("Current player items:", currentPlayerItems);

		// Pick random other player who has at least one item
		const otherPlayers = Object.values(room.players).filter(
			(p) =>
				p.id !== currentPlayerId && getAllItems(p.wardrobe).length > 0
		);
		console.log(
			"Other eligible players:",
			otherPlayers.map((p) => p.playerId)
		);

		if (currentPlayerItems.length > 0 && otherPlayers.length > 0) {
			currentPlayerWardrobeItem =
				currentPlayerItems[
					Math.floor(Math.random() * currentPlayerItems.length)
				];
			console.log(
				"Selected current player item:",
				currentPlayerWardrobeItem
			);

			const otherPlayer =
				otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
			randomOtherPlayerId = otherPlayer.id;
			console.log("Selected other player ID:", randomOtherPlayerId);

			const otherPlayerItems = getAllItems(otherPlayer.wardrobe);
			console.log("Other player items:", otherPlayerItems);

			otherPlayerWardrobeItem =
				otherPlayerItems[
					Math.floor(Math.random() * otherPlayerItems.length)
				];
			console.log("Selected other player item:", otherPlayerWardrobeItem);

			canSwap = true;
		} else {
			console.log(
				"Cannot swap: either current player or other players have no items"
			);
		}

		console.log("canSwap final:", canSwap);

		emitOrQueue(roomCode, "fireEvent", {
			event: "action:swap:random",
			data: {
				currentPlayerId,
				currentPlayerWardrobeItem,
				randomOtherPlayerId,
				otherPlayerWardrobeItem,
				canSwap,
			},
		});
	});

	socket.on("wardrobe:swap:save", ({ roomCode, swapData }) => {
		console.log("[swap:save] Swap request received");

		const room = rooms[roomCode];
		if (!room || room.gameState.ended) return;

		const { currentPlayer, otherPlayer } = swapData;

		const player1 = room.players[currentPlayer?.currentPlayerId];
		const player2 = room.players[otherPlayer?.randomOtherPlayerId];

		console.log("  Player1:", player1?.username || "null");
		console.log("  Player2:", player2?.username || "null");
		console.log("  Item1:", currentPlayer?.item || "null");
		console.log("  Item2:", otherPlayer?.item || "null");

		const item1 = currentPlayer?.item;
		const item2 = otherPlayer?.item;

		// ---- Case 1: Both items exist → swap
		if (player1 && player2 && item1 && item2) {
			console.log("[swap:save] Case 1: swapping both ways");

			const type1 = item1.item.toLowerCase();
			const type2 = item2.item.toLowerCase();

			const index1 = player1.wardrobe[type1].items.findIndex(
				(i) => i.title === item1.title && i.material === item1.material
			);
			const index2 = player2.wardrobe[type2].items.findIndex(
				(i) => i.title === item2.title && i.material === item2.material
			);

			if (index1 === -1 || index2 === -1) {
				console.log(
					"[swap:save] ERROR: Item not found in one of the wardrobes"
				);
				return;
			}

			const swapped1 = player1.wardrobe[type1].items.splice(index1, 1)[0];
			const swapped2 = player2.wardrobe[type2].items.splice(index2, 1)[0];

			player1.wardrobe[type2].items.push(swapped2);
			player2.wardrobe[type1].items.push(swapped1);

			console.log(`  Swapped ${swapped1.title} <-> ${swapped2.title}`);
		}

		// ---- Case 2: currentPlayer.item is null → transfer from other to current
		else if (player1 && player2 && !item1 && item2) {
			console.log(
				"[swap:save] Case 2: currentPlayer has no item, transfer from other → current"
			);

			const type2 = item2.item.toLowerCase();
			const index2 = player2.wardrobe[type2].items.findIndex(
				(i) => i.title === item2.title && i.material === item2.material
			);

			if (index2 === -1) {
				console.log(
					"[swap:save] ERROR: Item2 not found in otherPlayer’s wardrobe"
				);
				return;
			}

			const removed = player2.wardrobe[type2].items.splice(index2, 1)[0];
			player1.wardrobe[type2].items.push(removed);

			console.log(
				`  Transferred ${removed.title} from ${player2.username} → ${player1.username}`
			);
		}

		// ---- Case 3: otherPlayer.item is null → transfer from current to other
		else if (player1 && player2 && item1 && !item2) {
			console.log(
				"[swap:save] Case 3: otherPlayer has no item, transfer from current → other"
			);

			const type1 = item1.item.toLowerCase();
			const index1 = player1.wardrobe[type1].items.findIndex(
				(i) => i.title === item1.title && i.material === item1.material
			);

			if (index1 === -1) {
				console.log(
					"[swap:save] ERROR: Item1 not found in currentPlayer’s wardrobe"
				);
				return;
			}

			const removed = player1.wardrobe[type1].items.splice(index1, 1)[0];
			player2.wardrobe[type1].items.push(removed);

			console.log(
				`  Transferred ${removed.title} from ${player1.username} → ${player2.username}`
			);
		} else {
			console.log("[swap:save] ERROR: Invalid swap case, nothing to do!");
		}

		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("wardrobe:discard:card", ({ roomCode, data }) => {
		const room = rooms[roomCode];
		if (!room || room.gameState.ended) return;

		console.log(data);

		const player = room.players[data.player.playerId];
		const item = data.player.item;
		const type = item.item.toLowerCase();
		const index = player.wardrobe[type].items.findIndex(
			(i) => i.title === item.title && i.material === item.material
		);

		if (index === -1) {
			console.log(
				"[card:discard] ERROR: data.item not found in currentPlayer's wardrobe"
			);
			return;
		}

		player.wardrobe[type].items.splice(index, 1)[0];

		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("fireEvent", ({ roomCode, event, ...args }) => {
		const room = rooms[roomCode];
		if (!room) return;

		console.log(`🔥 Server received fireEvent: ${event} from room ${roomCode}`, args);

		// Let all actions (vacuum, ventilate, trivia, action) use the normal frontend flow
		// CPU players should use the same logic as humans, just with GameManager.myTurn fixes

		// Handle step:1:roll events that need server processing
		if (event === "step:1:roll") {
			const { playerId, numberArray, actionArray } = args;
			const player = room.players[playerId];
			
			console.log(`🎲 Received step:1:roll from ${playerId} (${player?.username}), current turn: ${room.gameState.currentTurnPlayerId}`);
			
			// Only process dice roll server-side for CPU players
			// Human players handle their own money/data updates through the frontend
			if (player && player.isCPU && numberArray && actionArray && room.gameState.currentTurnPlayerId === playerId) {
				const moneyDraw = numberArray[numberArray.length - 1];
				const actionDraw = actionArray[actionArray.length - 1];
				const currentRound = room.gameState.roundCounter;
				
				console.log(`💰 Processing dice roll for ${player.username}: +${moneyDraw} money, action: ${actionDraw} (round ${currentRound})`);

				// Update player money and round data
				player.money += moneyDraw;

				// Ensure roundData exists for this round
				if (!player.roundData[currentRound]) {
					console.log(`⚠️ Creating missing roundData for round ${currentRound} for player ${player.username}`);
					player.roundData[currentRound] = {
						step1: { money: undefined, action: undefined },
						step2: { money: undefined, action: undefined },
						step3: { money: undefined, action: undefined },
					};
				}

				player.roundData[currentRound].step1.money = moneyDraw;
				player.roundData[currentRound].step1.action = actionDraw;
				
				// Increment version for state tracking
				incrementGameStateVersion(room);
				
				// Broadcast player updates
				io.to(roomCode).emit("playersUpdated", { players: room.players });
				
				console.log(`✅ Dice roll data saved for ${player.username}, ready for step advancement`);
				
				console.log(`📈 ${player.username} now has $${player.money}, dice roll processed`);
			} else {
				console.log(`❌ Rejected step:1:roll from ${playerId} - not their turn or invalid data`);
			}
		}

		// Forward the entire args array to everyone in the room
		emitOrQueue(roomCode, "fireEvent", { event, ...args });
	});

	socket.on("checkIfEnd", ({ roomCode }, callback) => {
		const room = rooms[roomCode];
		if (!room) {
			if (callback) callback({ ended: false });
			return;
		}

		if (room.gameState.ended) {
			if (callback) callback({ ended: true, reason: room.gameState.ended, gameState: room.gameState });
			return;
		}

		let reason;

		if (room.gameState.microplastics >= room.gameState.microplasticsMax) {
			reason = "microplastics";
		}

		// Zoek speler met volle wardrobe
		const fullWardrobePlayer = Object.values(room.players).find((player) =>
			hasFullWardrobe(player)
		);

		if (fullWardrobePlayer) {
			reason = "wardrobe";
			room.gameState.endedBy = fullWardrobePlayer.username;
		}

		if (reason) {
			room.gameState.ended = reason;

			// ✅ Generate completion codes for all players
			const completionCodes = {};
			console.log("\n==============================================");
			console.log(`🎮 GAME ENDED (${reason.toUpperCase()}) - Room: ${roomCode}`);
			console.log("==============================================");
			Object.keys(room.players).forEach((playerId) => {
				const player = room.players[playerId];
				// Only generate codes for non-CPU players
				if (!player.isCPU) {
					const code = generateCompletionCode(playerId, roomCode, reason);
					completionCodes[playerId] = code;
					console.log(`✅ ${player.username}: ${code}`);
				}
			});
			console.log("==============================================\n");

			// 📊 End game session and save analytics
			if (room.gameSession) {
				gameDataLogger.endGameSession(room.gameSession, room, reason);
				console.log(`📊 Game ${room.gameSession.gameId} analytics saved`);
			}

			// ⏱️ Stop game timer when game ends
			stopGameTimer(roomCode);

			io.to(roomCode).emit("game:ended", {
				reason,
				gameState: room.gameState,
				completionCodes: completionCodes,
			});
			if (callback) callback({ ended: true, reason, gameState: room.gameState, completionCodes });
		} else {
			if (callback) callback({ ended: false });
		}
	});

	socket.on("getFullState", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room) {
			console.log("room does not exist:", roomCode);
			return;
		}

		// Send full state only to the requesting player, not broadcast to all
		socket.emit("fullState", {
			players: room.players,
			gameState: room.gameState,
		});
	});

	// 🔄 State sync mechanism for handling tab visibility issues
	socket.on("requestStateSync", ({ roomCode, clientStateVersion, playerId }) => {
		const room = rooms[roomCode];
		if (!room) {
			console.log("room does not exist for sync:", roomCode);
			return;
		}

		const serverVersion = room.gameState.version || 1;
		const clientVersion = clientStateVersion || 0;

		// If client is behind, send full state sync
		if (clientVersion < serverVersion) {
			console.log(`🔄 Client sync needed: client v${clientVersion} < server v${serverVersion}`);
			socket.emit("fullStateSync", {
				gameState: room.gameState,
				players: room.players,
				syncVersion: serverVersion,
				timestamp: Date.now()
			});
		} else {
			console.log(`✅ Client in sync: v${clientVersion}`);
			socket.emit("stateSyncConfirmed", { 
				version: serverVersion,
				timestamp: Date.now() 
			});
		}
	});

	// 🔄 Handle client tab becoming active (visibility change)
	socket.on("clientTabActive", ({ roomCode, playerId, lastClientUpdate }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const serverUpdate = room.gameState.lastUpdate || 0;
		const clientUpdate = lastClientUpdate || 0;

		// If server state changed while client was inactive, trigger full sync
		if (serverUpdate > clientUpdate) {
			console.log(`🔄 Tab active sync: server updated at ${serverUpdate}, client last saw ${clientUpdate}`);
			socket.emit("fullStateSync", {
				gameState: room.gameState,
				players: room.players,
				syncVersion: room.gameState.version,
				timestamp: Date.now()
			});
		}
	});

	// CPU Player Configuration Endpoints
	socket.on("cpu:getConfig", () => {
		socket.emit("cpu:config", {
			maxPlayers: CPU_CONFIG.maxPlayers,
			cpuPlayerCount: CPU_CONFIG.cpuPlayerCount,
			decisionDelays: CPU_CONFIG.decisionDelays
		});
	});

	socket.on("cpu:updateCount", ({ newCount }) => {
		if (typeof newCount === 'number' && newCount >= 0 && newCount <= 3) {
			CPU_CONFIG.cpuPlayerCount = newCount;
			console.log(`🤖 Updated CPU player count to: ${newCount}`);
			
			// Broadcast the config update to all clients
			io.emit("cpu:configUpdated", {
				maxPlayers: CPU_CONFIG.maxPlayers,
				cpuPlayerCount: CPU_CONFIG.cpuPlayerCount,
				decisionDelays: CPU_CONFIG.decisionDelays
			});
		}
	});

	// Tab visibility event handlers
	socket.on("playerTabInactive", ({ roomCode, playerId }) => {
		if (!rooms[roomCode] || !rooms[roomCode].players[playerId]) return;

		const room = rooms[roomCode];
		const player = room.players[playerId];
		player.tabActive = false;

		console.log(`🔄 Player ${player.username} tab became inactive in room ${roomCode}`);
	});

	socket.on("playerTabActive", ({ roomCode, playerId }) => {
		if (!rooms[roomCode] || !rooms[roomCode].players[playerId]) return;

		const room = rooms[roomCode];
		const player = room.players[playerId];
		player.tabActive = true;

		console.log(`🔄 Player ${player.username} tab became active in room ${roomCode}`);

		// Send any queued events to the now-active player
		flushQueuedEventsToPlayer(roomCode, playerId);
	});

	socket.on("disconnect", () => {
		const roomCode = socket.roomCode;
		if (!roomCode || !rooms[roomCode]) return;
		const room = rooms[roomCode];
		if (room.players[socket.playerId]) {
			room.players[socket.playerId].active = false;
			socket.to(roomCode).emit("playerInactive", {
				playerId: socket.playerId,
				players: room.players,
				// gameState: room.gameState,
			});
			console.log(
				`⚠️ Marked ${socket.playerId} inactive in room ${roomCode}`
			);
		}

		// Check if only one human player remains active and add CPU players if needed
		const activeHumanPlayers = Object.values(room.players).filter(p => p.active && !p.isCPU);
		if (activeHumanPlayers.length === 1) {
			addCPUPlayers(roomCode);
		}

		// If all HUMAN players are inactive (CPU doesn't count), start delete timeout and save data
		const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
		const allHumansInactive = humanPlayers.length > 0 && humanPlayers.every((p) => !p.active);
		if (allHumansInactive) {
			console.log(
				`⌛ All human players left room ${roomCode}, deleting in 5 min`
			);

			// 📊 Save abandoned game data if game was started but not ended
			if (room.gameSession && room.gameState.started && !room.gameState.ended) {
				console.log(`📊 Saving abandoned game data for room ${roomCode}`);
				gameDataLogger.endGameSession(room.gameSession, room, "abandoned");
			}

			// ⏱️ Stop game timer when all players leave
			stopGameTimer(roomCode);

			room.timeoutId = setTimeout(() => {
				delete rooms[roomCode];
				console.log(`🗑️ Room ${roomCode} deleted after timeout`);
			}, 5 * 60 * 1000); // 5 minutes
		}
	});
	socket.on("removePlayer", ({ roomCode, playerId }) => {
		const room = rooms[roomCode];
		if (!room) {
			socket.emit("error", { message: "Room not found" });
			return;
		}

		// Check if the requesting socket is the host (first player in the room)
		const playerIds = Object.keys(room.players);
		const isHost = playerIds.length > 0 && playerIds[0] === socket.playerId;

		if (!isHost) {
			socket.emit("error", { message: "Only the host can remove players" });
			return;
		}

		// Can't remove the host (themselves)
		if (playerId === socket.playerId) {
			socket.emit("error", { message: "Host cannot remove themselves" });
			return;
		}

		// Check if player exists in the room
		if (!room.players[playerId]) {
			socket.emit("error", { message: "Player not found in room" });
			return;
		}

		console.log(`🦵 Host ${socket.playerId} removing player ${playerId} from room ${roomCode}`);

		// Remove the player from the room
		delete room.players[playerId];

		// Notify all players in the room that someone was removed
		io.to(roomCode).emit("playerLeft", {
			playerId: playerId,
			roomCode: roomCode,
			players: room.players,
			gameState: room.gameState,
		});

		// Find the socket of the removed player and force them to leave
		// Note: This is a simplified approach - in production you'd want to track socket IDs properly
		const allSockets = io.sockets.sockets;
		for (const [socketId, playerSocket] of allSockets) {
			if (playerSocket.playerId === playerId && playerSocket.roomCode === roomCode) {
				// Force the removed player back to login screen
				playerSocket.emit("removedFromRoom", {
					reason: "You were removed from the room by the host"
				});
				playerSocket.leave(roomCode);
				delete playerSocket.roomCode;
				delete playerSocket.playerId;
				break;
			}
		}

		console.log(`✅ Player ${playerId} removed from room ${roomCode}`);

		// If room is now empty, schedule deletion
		if (Object.keys(room.players).length === 0) {
			console.log(`⌛ Room ${roomCode} empty after removal, deleting in 5 min`);

			// 📊 Save abandoned game data if game was started but not ended
			if (room.gameSession && room.gameState.started && !room.gameState.ended) {
				console.log(`📊 Saving abandoned game data for room ${roomCode}`);
				gameDataLogger.endGameSession(room.gameSession, room, "abandoned");
			}

			// ⏱️ Stop game timer when room becomes empty
			stopGameTimer(roomCode);

			room.timeoutId = setTimeout(() => {
				delete rooms[roomCode];
				console.log(`🗑️ Room ${roomCode} deleted`);
			}, 5 * 60 * 1000);
		}
	});

	socket.on("leaveRoom", () => {
		const roomCode = socket.roomCode;
		if (!roomCode || !rooms[roomCode]) return;

		const room = rooms[roomCode];

		if (room.players[socket.playerId]) {
			console.log("current players:", room.players);
			delete room.players[socket.playerId];
			console.log("current players:", room.players);
			socket.to(roomCode).emit("playerLeft", {
				playerId: socket.playerId,
				roomCode: socket.roomCode,
				player: rooms[socket.roomCode].players[socket.id],
				players: rooms[socket.roomCode].players,
				gameState: rooms[socket.roomCode].gameState,
			});
			console.log(`🚪 ${socket.playerId} left room ${roomCode}`);
		}

		socket.leave(roomCode);
		delete socket.roomCode;
		delete socket.playerId;

		// If all HUMAN players have left (CPU doesn't count), schedule deletion and save data
		const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
		if (humanPlayers.length === 0) {
			console.log(`⌛ All human players left room ${roomCode}, deleting in 5 min`);

			// 📊 Save abandoned game data if game was started but not ended
			if (room.gameSession && room.gameState.started && !room.gameState.ended) {
				console.log(`📊 Saving abandoned game data for room ${roomCode}`);
				gameDataLogger.endGameSession(room.gameSession, room, "abandoned");
			}

			// ⏱️ Stop game timer when all players leave
			stopGameTimer(roomCode);

			room.timeoutId = setTimeout(() => {
				delete rooms[roomCode];
				console.log(`🗑️ Room ${roomCode} deleted`);
			}, 5 * 60 * 1000);
		}
	});
});

function hasFullWardrobe(player) {
	// Check elke categorie behalve 'excess'
	return Object.entries(player.wardrobe).every(([type, data]) => {
		if (type === "excess") return true; // skip excess
		return data.items.length >= data.max;
	});
}

function broadcastFullState(roomCode) {
	const room = rooms[roomCode];
	if (!room) return;

	io.to(roomCode).emit("fullState", {
		players: room.players,
		gameState: room.gameState,
	});
}
function createBaseGameState() {
	return {
		version: 1,
		lastUpdate: Date.now(),
		started: false,
		phase: ["login", "room", "introduction", "game"],
		phaseCounter: 0,
		currentPhase: "login",
		roundCounter: 0,
		turnCounter: 0,
		stepCounter: 0,
		currentTurnIndex: 0,
		currentTurnPlayerId: undefined,
		turnOrder: [],
		introduction: {
			active: false,
			startTime: null,
			countdown: 90,
			playersReady: [],
		},
		trivia: {
			active: false,
			title: undefined,
			text: undefined,
			answer: undefined,
			correct: 2,
			wrong: -2,
		},
		action: {
			active: false,
			title: undefined,
			text: undefined,
			answer: undefined,
			correct: 2,
			wrong: -2,
		},
		cardOptions: cardOptions,
		cards: [
			{ selected: false, price: undefined, active: false },
			{ selected: false, price: undefined, active: false },
			{ selected: false, price: undefined, active: false },
			{ selected: false, price: undefined, active: false },
			{ selected: false, price: undefined, active: false },
		],
		ui: {
			login: true,
			actions: false,
			sidebars: false,
			wardrobe: false,
			clothingmarket: false,
		},
		microplastics: 0,
		microplasticsMax: 20,
		timer: 0,
	};
}
function createBaseRoom() {
	return {
		players: {},
		gameState: createBaseGameState(),
		timeoutId: null,
		queuedEvents: [], // Queue events for inactive single players
		lastGameEvent: null, // Track latest game event for CPU games
		gameSession: null, // Track analytics for this game
		gameTimerInterval: null, // Interval to track game time
		gameStartTime: null, // Timestamp when game started
		twentyMinuteEventFired: false, // Track if 20-minute event was already fired
		introductionTimerInterval: null, // Interval for introduction countdown
	};
}

// 🧠 Utility to set deep values (e.g., 'player.inventory.items[0]')
function setDeepValue(obj, path, value) {
	const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".");
	let current = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];
		if (!(k in current)) current[k] = {};
		current = current[k];
	}
	current[keys[keys.length - 1]] = value;
}

// 🔄 Utility to increment game state version and update timestamp
function incrementGameStateVersion(room) {
	if (room && room.gameState) {
		room.gameState.version++;
		room.gameState.lastUpdate = Date.now();
	}
}

// ⏱️ Game Timer Functions
function startGameTimer(roomCode) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];

	// Don't start timer if already running
	if (room.gameTimerInterval || room.gameStartTime) {
		console.log(`⏱️ Game timer already running for room ${roomCode}`);
		return;
	}

	// Record game start time
	room.gameStartTime = Date.now();
	room.twentyMinuteEventFired = false;

	console.log(`⏱️ Started game timer for room ${roomCode}`);

	// Check every 30 seconds if 20 minutes have passed
	room.gameTimerInterval = setInterval(() => {
		if (!rooms[roomCode]) {
			// Room was deleted, clean up interval
			clearInterval(room.gameTimerInterval);
			return;
		}

		const elapsedTime = Date.now() - room.gameStartTime;
		const twentyMinutesMs = 20 * 60 * 1000; // 20 minutes in milliseconds

		// Check if 20 minutes have passed and event hasn't been fired yet
		if (elapsedTime >= twentyMinutesMs && !room.twentyMinuteEventFired) {
			room.twentyMinuteEventFired = true;
			console.log(`⏰ Game in room ${roomCode} has reached 20 minutes!`);

			// 🎮 Mark game as ended with timeCap reason
			room.gameState.ended = "timeCap";

			// ✅ Generate completion codes for all players (without full game end)
			const completionCodes = {};
			console.log("\n==============================================");
			console.log(`⏰ TIME CAP REACHED (20 MINUTES) - Room: ${roomCode}`);
			console.log("==============================================");
			Object.keys(room.players).forEach((playerId) => {
				const player = room.players[playerId];
				// Only generate codes for non-CPU players
				if (!player.isCPU) {
					const code = generateCompletionCode(playerId, roomCode, "timeCap");
					completionCodes[playerId] = code;
					console.log(`✅ ${player.username}: ${code}`);
				}
			});
			console.log("==============================================\n");

			// 📊 End game session and save analytics
			if (room.gameSession) {
				gameDataLogger.endGameSession(room.gameSession, room, "timeCap");
				console.log(`📊 Game ${room.gameSession.gameId} analytics saved (timeCap)`);
			}

			// ⏱️ Stop game timer
			stopGameTimer(roomCode);

			// Emit event to all players in the room
			io.to(roomCode).emit("game:twentyMinutes", {
				roomCode,
				elapsedTime,
				message: "The game has been running for 20 minutes",
				completionCodes: completionCodes,
				gameState: room.gameState
			});
		}
	}, 30000); // Check every 30 seconds
}

function stopGameTimer(roomCode) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];

	if (room.gameTimerInterval) {
		clearInterval(room.gameTimerInterval);
		room.gameTimerInterval = null;
		console.log(`⏱️ Stopped game timer for room ${roomCode}`);
	}
}

// 🎬 Introduction Timer Functions
function startIntroductionTimer(roomCode) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];

	// Don't start timer if already running
	if (room.introductionTimerInterval) {
		console.log(`🎬 Introduction timer already running for room ${roomCode}`);
		return;
	}

	// Check if this is a single player game (1 human + CPUs)
	const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
	const isSinglePlayer = humanPlayers.length === 1;

	// Initialize introduction state
	room.gameState.introduction.active = true;
	room.gameState.introduction.startTime = Date.now();
	room.gameState.introduction.playersReady = [];

	if (isSinglePlayer) {
		// Single player: no countdown, just wait for player to finish reading
		room.gameState.introduction.countdown = -1; // -1 indicates no countdown
		console.log(`🎬 Single player introduction started for room ${roomCode} - no countdown`);

		// Broadcast countdown=-1 to hide countdown UI for single player
		io.to(roomCode).emit("intro:countdownUpdate", {
			countdown: -1,
		});
	} else {
		// Multiplayer: start 90-second countdown
		room.gameState.introduction.countdown = 90;
		console.log(`🎬 Started 90-second introduction countdown for room ${roomCode}`);

		// Update countdown every second
		room.introductionTimerInterval = setInterval(() => {
			if (!rooms[roomCode]) {
				clearInterval(room.introductionTimerInterval);
				return;
			}

			room.gameState.introduction.countdown--;

			// Broadcast countdown update to all clients
			io.to(roomCode).emit("intro:countdownUpdate", {
				countdown: room.gameState.introduction.countdown,
			});

			console.log(`🎬 Introduction countdown: ${room.gameState.introduction.countdown}s remaining`);

			// Check if countdown reached 0
			if (room.gameState.introduction.countdown <= 0) {
				console.log(`🎬 Introduction countdown finished for room ${roomCode}`);
				stopIntroductionTimer(roomCode);
				startGameFromIntroduction(roomCode);
			}
		}, 1000); // Update every second
	}

	// Increment version for state tracking
	incrementGameStateVersion(room);

	// Broadcast initial state
	io.to(roomCode).emit("gameStateUpdated", {
		gameState: room.gameState,
	});
}

function stopIntroductionTimer(roomCode) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];

	if (room.introductionTimerInterval) {
		clearInterval(room.introductionTimerInterval);
		room.introductionTimerInterval = null;
		room.gameState.introduction.active = false;
		console.log(`🎬 Stopped introduction timer for room ${roomCode}`);
	}
}

function checkIfAllPlayersReady(roomCode) {
	if (!rooms[roomCode]) return false;

	const room = rooms[roomCode];
	const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
	const readyPlayers = room.gameState.introduction.playersReady;

	// Check if all human players are ready
	const allReady = humanPlayers.every(p => readyPlayers.includes(p.id));

	if (allReady && humanPlayers.length > 0) {
		console.log(`🎬 All ${humanPlayers.length} players are ready in room ${roomCode}`);
		return true;
	}

	return false;
}

function startGameFromIntroduction(roomCode) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];

	console.log(`🎮 Starting game from introduction in room ${roomCode}`);

	// Stop introduction timer
	stopIntroductionTimer(roomCode);

	// Set phase to game
	room.gameState.currentPhase = "game";
	room.gameState.started = true;

	// Initialize first turn player if not set
	if (!room.gameState.currentTurnPlayerId) {
		const playerIds = Object.keys(room.players).filter(id => room.players[id].active);
		if (playerIds.length > 0) {
			const sortedPlayerIds = playerIds.sort((a, b) => {
				const playerA = room.players[a];
				const playerB = room.players[b];
				if (playerA.isCPU && !playerB.isCPU) return 1;
				if (!playerA.isCPU && playerB.isCPU) return -1;
				return 0;
			});

			room.gameState.currentTurnPlayerId = sortedPlayerIds[0];
			room.gameState.currentTurnIndex = 0;
			room.gameState.turnOrder = sortedPlayerIds;
			console.log(`🎯 First turn player: ${room.players[sortedPlayerIds[0]].username}`);
		}
	}

	// Generate initial cards
	const options = room.gameState.cardOptions;
	const items = Object.keys(options);

	for (let i = 0; i < room.gameState.cards.length; i++) {
		const card = room.gameState.cards[i];

		const itemType = items[Math.floor(Math.random() * items.length)];
		const itemOptions = options[itemType];

		const condition =
			Math.random() < 0.5 && itemOptions.secondHand.length > 0
				? "secondHand"
				: "new";

		const choices = itemOptions[condition];
		const choice = choices[Math.floor(Math.random() * choices.length)];

		card.active = true;
		card.selected = false;
		card.title = choice.sort;
		card.material = choice.material;
		card.condition = condition;
		card.item = itemType;
		card.sort = choice.sort;
		card.points = choice.value;
		card.price = choice.price;
		card.washed = false;
	}

	// Initialize analytics tracking for this game
	if (!room.gameSession) {
		room.gameSession = gameDataLogger.initGameSession(roomCode, room.players);
		console.log(`📊 Analytics tracking started for game ${room.gameSession.gameId}`);
	}

	// Start game timer for 20-minute event tracking
	startGameTimer(roomCode);

	// Increment version for state tracking
	incrementGameStateVersion(room);

	// Broadcast game start
	io.to(roomCode).emit("gameStateUpdated", {
		gameState: room.gameState,
	});

	console.log(`✅ Game started successfully in room ${roomCode}`);
}

// 🔄 Tab Visibility Event Queuing Functions
function shouldQueueEvent(roomCode, eventName) {
	if (!rooms[roomCode]) return false;

	const room = rooms[roomCode];
	const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);

	// Only queue events if:
	// 1. There's exactly one human player (single player with CPUs)
	// 2. That player's tab is inactive
	// 3. The event is a game-changing event (not UI updates)
	if (humanPlayers.length === 1) {
		const singlePlayer = humanPlayers[0];
		if (!singlePlayer.tabActive) {
			// Queue important game events that should wait for player attention
			const gameEventTypes = ['fireEvent', 'game:update', 'action:get', 'trivia:get'];
			return gameEventTypes.some(type => eventName.includes(type));
		}
	}

	return false;
}

function queueEventForPlayer(roomCode, eventName, eventData) {
	if (!rooms[roomCode]) return false;

	const room = rooms[roomCode];
	const queuedEvent = {
		eventName,
		eventData,
		timestamp: Date.now()
	};

	room.queuedEvents.push(queuedEvent);
	console.log(`📥 Queued event ${eventName} for inactive player in room ${roomCode}`);
	return true;
}

function flushQueuedEventsToPlayer(roomCode, playerId) {
	if (!rooms[roomCode]) return;

	const room = rooms[roomCode];
	if (room.queuedEvents.length === 0) return;

	console.log(`📤 Flushing ${room.queuedEvents.length} queued events to player ${playerId} in room ${roomCode}`);

	// Send all queued events to the room (since there's only one human player)
	room.queuedEvents.forEach(({ eventName, eventData }) => {
		io.to(roomCode).emit(eventName, eventData);
	});

	// Clear the queue
	room.queuedEvents = [];
}

// 🔄 Smart event emission that queues events for inactive single players
function emitOrQueue(roomCode, eventName, eventData) {
	if (!rooms[roomCode]) return;

	// Track important game events for CPU games
	if (isImportantGameEvent(eventName)) {
		rooms[roomCode].lastGameEvent = {
			eventName,
			eventData,
			timestamp: Date.now()
		};
	}

	if (shouldQueueEvent(roomCode, eventName)) {
		queueEventForPlayer(roomCode, eventName, eventData);
	} else {
		io.to(roomCode).emit(eventName, eventData);
	}
}

function isImportantGameEvent(eventName) {
	// Events that might be needed to unstick the game flow
	const importantEvents = ['fireEvent', 'game:update', 'action:get', 'trivia:get'];
	return importantEvents.some(type => eventName.includes(type));
}

function isCPUGame(roomCode) {
	if (!rooms[roomCode]) return false;

	const room = rooms[roomCode];
	const humanPlayers = Object.values(room.players).filter(p => !p.isCPU);
	const cpuPlayers = Object.values(room.players).filter(p => p.isCPU);

	// It's a CPU game if there are CPU players and only 1 human player
	return humanPlayers.length === 1 && cpuPlayers.length > 0;
}

function resendLatestEventToCPUPlayer(roomCode, playerId) {
	if (!rooms[roomCode] || !isCPUGame(roomCode)) return;

	const room = rooms[roomCode];

	// First, resend the latest game event if it exists and is recent
	if (room.lastGameEvent) {
		const eventAge = Date.now() - room.lastGameEvent.timestamp;
		// Only resend events that are less than 30 seconds old
		if (eventAge <= 30000) {
			console.log(`🔄 Resending latest event to rejoined player ${playerId} in CPU game ${roomCode}:`, room.lastGameEvent.eventName);

			// Send the latest game event to help unstick the game
			setTimeout(() => {
				io.to(roomCode).emit(room.lastGameEvent.eventName, room.lastGameEvent.eventData);
			}, 1000); // Small delay to let the client fully reconnect
		}
	}

	// More importantly, check if it's currently a CPU's turn and restart their logic if needed
	const currentTurnPlayerId = room.gameState.currentTurnPlayerId;
	const currentPlayer = room.players[currentTurnPlayerId];

	if (currentPlayer && currentPlayer.isCPU && room.gameState.currentPhase === 'game') {
		console.log(`🤖 Detected CPU ${currentPlayer.username} should be active, restarting turn logic after refresh`);

		// Wait a bit for the client to fully load, then restart CPU logic
		setTimeout(() => {
			const gameState = room.gameState;

			// Restart CPU logic based on current step
			if (gameState.stepCounter === 0) {
				// CPU should be rolling dice or starting their turn
				console.log(`🔄 Restarting CPU ${currentPlayer.username} at step 0 (dice roll)`);
				triggerCPUDecisions(roomCode, 'step1');
			} else if (gameState.stepCounter === 1 && !gameState.trivia?.active && !gameState.action?.active) {
				// CPU should be executing step 2 action
				console.log(`🔄 Restarting CPU ${currentPlayer.username} at step 1 (action)`);
				triggerCPUDecisions(roomCode, 'step2');
			} else if (gameState.stepCounter === 2) {
				// CPU should be in card purchasing phase
				console.log(`🔄 Restarting CPU ${currentPlayer.username} at step 2 (card purchasing)`);
				const activeCards = gameState.cards?.filter(card => card.active) || [];
				if (activeCards.length > 0) {
					triggerCPUDecisions(roomCode, 'cards', { cards: activeCards });

					// Also trigger purchase decision after delay if they haven't already decided
					setTimeout(() => {
						if (currentPlayer.hasSelectedCards === false) {
							console.log(`🤖 CPU ${currentPlayer.username} will buy nothing after restart`);
							emitOrQueue(roomCode, "fireEvent", {
								event: "cpu:buyNothing",
								playerId: currentTurnPlayerId
							});
						} else if (currentPlayer.hasSelectedCards === true) {
							console.log(`🤖 CPU ${currentPlayer.username} will purchase selected cards after restart`);
							emitOrQueue(roomCode, "fireEvent", {
								event: "cpu:purchase",
								playerId: currentTurnPlayerId
							});
						}
					}, Math.random() * 3000 + 3000);
				}
			}
		}, 2000); // Give client time to fully load before restarting CPU logic
	}
}

app.get("/", (req, res) => {
	res.send("🟢 Multiplayer server running");
});

app.get("/ping", (req, res) => {
	res.status(200).json({ message: "Server is running!" });
});

// ✅ Completion code verification endpoint
app.get("/verify", (req, res) => {
	const code = req.query.code;

	if (!code) {
		return res.status(400).json({
			valid: false,
			error: "Missing 'code' parameter. Use: /verify?code=YOUR_CODE"
		});
	}

	const result = verifyCompletionCode(code);

	if (result.valid) {
		res.status(200).json({
			valid: true,
			message: "✅ Valid completion code!",
			completionDate: result.data.completionDate,
			daysAgo: result.data.daysAgo,
			player: result.data.player,
			game: result.data.game,
			isWinner: result.data.isWinner
		});
	} else {
		res.status(400).json({
			valid: false,
			error: result.error || "Invalid code"
		});
	}
});

// Analytics middleware - verify token
function verifyAnalyticsToken(req, res, next) {
	const token = req.headers['authorization'] || req.query.token;

	if (!token) {
		return res.status(401).json({ error: 'No token provided. Use Authorization header or ?token=YOUR_TOKEN' });
	}

	// Remove 'Bearer ' prefix if present
	const cleanToken = token.replace('Bearer ', '');

	if (!gameDataLogger.verifyToken(cleanToken)) {
		return res.status(403).json({ error: 'Invalid token' });
	}

	next();
}

// Analytics endpoint - get all game data
app.get("/analytics", verifyAnalyticsToken, (req, res) => {
	try {
		const analytics = gameDataLogger.getAllAnalytics();
		res.status(200).json(analytics);
	} catch (error) {
		console.error('Error fetching analytics:', error);
		res.status(500).json({ error: 'Failed to fetch analytics' });
	}
});

// Analytics summary endpoint - get summary statistics
app.get("/analytics/summary", verifyAnalyticsToken, (req, res) => {
	try {
		const summary = gameDataLogger.getAnalyticsSummary();
		res.status(200).json(summary);
	} catch (error) {
		console.error('Error fetching analytics summary:', error);
		res.status(500).json({ error: 'Failed to fetch analytics summary' });
	}
});

// Analytics endpoint - get specific game by gameId
app.get("/analytics/game/:gameId", verifyAnalyticsToken, (req, res) => {
	try {
		const analytics = gameDataLogger.getAllAnalytics();
		const game = analytics.games.find(g => g.gameId === req.params.gameId);

		if (!game) {
			return res.status(404).json({ error: 'Game not found' });
		}

		res.status(200).json(game);
	} catch (error) {
		console.error('Error fetching game:', error);
		res.status(500).json({ error: 'Failed to fetch game' });
	}
});

// Analytics endpoint - reset analytics data (creates backup)
app.post("/analytics/reset", verifyAnalyticsToken, (req, res) => {
	try {
		const result = gameDataLogger.resetAnalytics();

		if (result.success) {
			res.status(200).json({
				message: 'Analytics reset successfully',
				gamesCleared: result.gamesCleared,
				backupFile: result.backupFile,
				timestamp: result.timestamp
			});
		} else {
			res.status(500).json({
				error: 'Failed to reset analytics',
				details: result.error
			});
		}
	} catch (error) {
		console.error('Error resetting analytics:', error);
		res.status(500).json({ error: 'Failed to reset analytics' });
	}
});

const PORT = 3003;
server.listen(PORT, () => {
	console.log(`🚀 Server listening on port ${PORT}`);
});
