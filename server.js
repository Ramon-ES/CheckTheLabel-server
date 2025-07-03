const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

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
		this.wardrobe = {
			jackets: [
				{
					type: "synthetic",
					washed: false,
				},
				{
					type: "natural",
				},
			],
			sweaters: {
				amount: 0,
			},
			pants: {
				amount: 0,
			},
			shirts: {
				amount: 0,
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

		const player = new Player(socket.id);
		rooms[roomCode].players[socket.id] = player;
		socket.join(roomCode);
		socket.roomCode = roomCode;
		socket.playerId = socket.id;

		socket.emit("roomCreated", { roomCode });
		socket.emit("joinedRoom", {
			id: socket.id,
			roomCode: roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});
	});

	socket.on("updateUsername", ({ playerId, newUsername }) => {
		console.log(playerId);
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
		socket.playerId = socket.id;

		// Restore or create player
		if (rooms[roomCode].players[socket.id]) {
			rooms[roomCode].players[socket.id].active = true;
		} else {
			rooms[roomCode].players[socket.id] = new Player(socket.id);
		}

		socket.emit("joinedRoom", {
			id: socket.id,
			roomCode: roomCode,
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});

		socket.to(roomCode).emit("playerJoined", {
			id: socket.id,
			player: rooms[roomCode].players[socket.id],
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
		});
	});

	socket.on("rejoinRoom", ({ roomCode, playerId }) => {
		const room = rooms[roomCode];
		if (!room || !room.players[playerId]) {
			socket.emit("rejoinFailed");
			return;
		}

		socket.join(roomCode);
		socket.roomCode = roomCode;
		socket.playerId = playerId;

		// Reassign socket to existing player
		room.players[playerId].active = true;

		// Attach new socket ID if needed
		if (playerId !== socket.id) {
			// Optionally transfer ownership if socket.id has changed
			room.players[socket.id] = room.players[playerId];
			delete room.players[playerId];
			socket.playerId = socket.id;
		}

		socket.emit("rejoinSuccess", {
			id: socket.id,
			roomCode: roomCode,
			players: room.players,
			gameState: room.gameState,
		});

		socket.to(roomCode).emit("playerRejoined", {
			id: socket.id,
			player: rooms[roomCode].players[socket.id],
			players: rooms[roomCode].players,
			gameState: rooms[roomCode].gameState,
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
		if (room.players[socket.id]) {
			room.players[socket.id].active = false;
			socket.to(roomCode).emit("playerInactive", socket.id);
			console.log(`⚠️ Marked ${socket.id} inactive in room ${roomCode}`);
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

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
	console.log(`🚀 Server listening on port ${PORT}`);
});
