const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const trivia = require("./trivia");
const actions = require("./actions");
const cardOptions = require("./cardOptions");
const gameStatsService = require("./services/game-stats");
const { initializeFirebase } = require("./firebase-config");
const app = express();
const server = http.createServer(app);

// Initialize Firebase on startup
initializeFirebase();

// Clean up abandoned games every hour
setInterval(() => {
	gameStatsService.cleanupAbandonedGames().catch(err => {
		console.error(`❌ Failed to cleanup abandoned games: ${err.message}`);
	});
}, 60 * 60 * 1000); // 1 hour

// Run initial cleanup on startup
setTimeout(() => {
	gameStatsService.cleanupAbandonedGames().catch(err => {
		console.error(`❌ Failed initial cleanup: ${err.message}`);
	});
}, 5000); // Wait 5 seconds after startup

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

class Player {
	constructor(id) {
		this.id = id;
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.active = true;
		this.loginReady = false;
		this.username = generateUsername();
		this.money = 0;
		this.points = 0;
		this.roundData = {};
		for (let i = 0; i < 7; i++) {
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

io.on("connection", (socket) => {
	console.log(`✅ Client connected: ${socket.id}`);
	
	// Store persistent username across rooms for this socket
	socket.persistentUsername = null;

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
		rooms[roomCode] = createBaseRoom(roomCode);

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


		// Send info back to this client
		socket.emit("joinedRoom", {
			playerId,
			roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});

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

		// ✅ Ensure microplastics can't go negative
		if (path === "microplastics" && value < 0) {
			value = 0;
		}

		// ✅ Set nested value using the path
		setDeepValue(room.gameState, path, value);
		
		// Initialize stats when game starts
		if (path === 'started' && value === true && !room.statsInitialized) {
			room.statsInitialized = true;
			gameStatsService.initializeGame(room.gameId, roomCode, room.gameState, room.players).catch(err => {
				console.error(`❌ Failed to initialize game stats: ${err.message}`);
			});
		}

		// Update game progress during gameplay
		if (room.statsInitialized && (path === 'roundCounter' || path === 'turnCounter' || path === 'microplastics')) {
			gameStatsService.updateGameProgress(room.gameId, room.gameState).catch(err => {
				console.error(`❌ Failed to update game progress: ${err.message}`);
			});
		}
		
		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		// ✅ Broadcast updated gameState
		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
	});

	socket.on("players:update", ({ roomCode, path, value }) => {
		const room = rooms[roomCode];
		if (!room) return;

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

		// Track trivia question
		if (room.statsInitialized) {
			gameStatsService.addTriviaQuestion(room.gameId, nextTrivia).catch(err => {
				console.error(`❌ Failed to track trivia question: ${err.message}`);
			});
		}

		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
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

		// Track action card
		if (room.statsInitialized && room.gameState.currentTurnPlayerId) {
			gameStatsService.addActionCard(room.gameId, nextAction, room.gameState.currentTurnPlayerId).catch(err => {
				console.error(`❌ Failed to track action card: ${err.message}`);
			});
		}

		// ✅ Increment version for state tracking
		incrementGameStateVersion(room);

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
	});


	socket.on("money:add", ({ roomCode, playerId, amount }) => {
		const room = rooms[roomCode];
		if (!room) return;

		room.players[playerId].money += amount;

		// Update player data in stats
		if (room.statsInitialized) {
			gameStatsService.updatePlayerData(room.gameId, playerId, room.players[playerId]).catch(err => {
				console.error(`❌ Failed to update player data: ${err.message}`);
			});
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

		// Update player data in stats and track clothing card
		if (room.statsInitialized) {
			gameStatsService.updatePlayerData(room.gameId, playerId, player).catch(err => {
				console.error(`❌ Failed to update player data: ${err.message}`);
			});
			
			gameStatsService.addClothingCard(room.gameId, data, playerId).catch(err => {
				console.error(`❌ Failed to track clothing card: ${err.message}`);
			});
		}
		
		console.log(`Added item to ${finalType}: ${data.title} ${data.item} (${player.wardrobe[finalType].items.length}/${player.wardrobe[finalType].max})`);
		
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
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

		io.to(roomCode).emit("fireEvent", {
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

		// Forward the entire args array to everyone in the room
		io.to(roomCode).emit("fireEvent", { event, ...args });
	});

	socket.on("checkIfEnd", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room || room.gameState.ended) return;

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
			
			// Finalize game statistics
			if (room.statsInitialized) {
				gameStatsService.finalizeGame(room.gameId, reason).catch(err => {
					console.error(`❌ Failed to finalize game stats: ${err.message}`);
				});
			}
			
			io.to(roomCode).emit("game:ended", {
				reason,
				gameState: room.gameState,
			});
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

		// If all players are inactive, start delete timeout
		const allInactive = Object.values(room.players).every((p) => !p.active);
		if (allInactive) {
			console.log(
				`⌛ All players left room ${roomCode}, deleting in 5 min`
			);
			room.timeoutId = setTimeout(() => {
				delete rooms[roomCode];
				console.log(`🗑️ Room ${roomCode} deleted after timeout`);
			}, 5 * 60 * 1000); // 5 minutes
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

		// If room is now empty, schedule deletion
		if (Object.keys(room.players).length === 0) {
			console.log(`⌛ Room ${roomCode} empty, deleting in 5 min`);
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
		phase: ["login", "game"],
		phaseCounter: 0,
		currentPhase: "login",
		roundCounter: 0,
		turnCounter: 0,
		stepCounter: 0,
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
function createBaseRoom(roomCode) {
	const gameId = uuidv4();
	return {
		gameId,
		players: {},
		gameState: createBaseGameState(),
		timeoutId: null,
		statsInitialized: false
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


app.get("/", (req, res) => {
	res.send("🟢 Multiplayer server running");
});

app.get("/ping", (req, res) => {
	res.status(200).json({ message: "Server is running!" });
});

const PORT = 3003;
server.listen(PORT, () => {
	console.log(`🚀 Server listening on port ${PORT}`);
});
