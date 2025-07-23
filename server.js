const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const trivia = require("./trivia");
const actions = require("./actions");
const cardOptions = require("./cardOptions");
const app = express();
const server = http.createServer(app);

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
		this.money = 100;
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

		// ✅ Set nested value using the path
		setDeepValue(room.gameState, path, value);

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
		if (!room || !room.trivia.length) return;

		// Pick and remove the next trivia question
		const nextTrivia = room.trivia.shift();

		room.gameState.trivia.active = true;
		room.gameState.trivia.title = nextTrivia.title;
		room.gameState.trivia.text = nextTrivia.statement;
		room.gameState.trivia.reasoning = nextTrivia.reasoning;
		room.gameState.trivia.correct = nextTrivia.correct || 2;
		room.gameState.trivia.wrong = nextTrivia.wrong || -2;
		room.gameState.trivia.answer = nextTrivia.answer;

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
	});

	socket.on("action:get", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room || !room.actions.length) return;

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

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
	});

	socket.on("money:add", ({ roomCode, playerId, amount }) => {
		const room = rooms[roomCode];
		if (!room) return;

		room.players[playerId].money += amount;
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("wardrobe:add", ({ roomCode, playerId, data }) => {
		const room = rooms[roomCode];
		if (!room) return;
		room.players[playerId].wardrobe[data.type.toLowerCase()].items.push(
			data
		);
		io.to(roomCode).emit("playersUpdated", {
			players: room.players,
		});
	});

	socket.on("cards:generate", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room) return;

		const options = room.gameState.cardOptions;
		for (let i = 0; i < room.gameState.cards.length; i++) {
			const card = room.gameState.cards[i];
			if (!card.active) {
				const sort = Math.floor(Math.random() * options.length);
				const material = Math.floor(
					Math.random() * options[sort].material.length
				);
				const item = Math.floor(
					Math.random() * options[sort].item.length
				);

				card.active = true;
				card.selected = false;
				card.title = options[sort].sort;
				card.material = options[sort].material[material];
				card.item = options[sort].item[item];
				card.points = Math.floor(Math.random() * 10);
				card.price = Math.floor(Math.random() * 10);
				card.washed = false;

				console.log("generated new card");
			}
		}

		io.to(roomCode).emit("gameStateUpdated", {
			gameState: room.gameState,
		});
	});

	socket.on("fireEvent", ({ roomCode, event, ...args }) => {
		const room = rooms[roomCode];
		if (!room) return;

		// Forward the entire args array to everyone in the room
		io.to(roomCode).emit("fireEvent", { event, ...args });
	});

	socket.on("getFullState", ({ roomCode }) => {
		const room = rooms[roomCode];
		if (!room) {
			console.log("room does not exist:", roomCode);
			return;
		}

		broadcastFullState(roomCode);
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

		if (room.players[socket.id]) {
			delete room.players[socket.id];
			socket.to(roomCode).emit("playerLeft", socket.id);
			console.log(`🚪 ${socket.id} left room ${roomCode}`);
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
function createBaseRoom() {
	return {
		players: {},
		gameState: createBaseGameState(),
		timeoutId: null,
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
