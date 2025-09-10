const { getFirestore, isFirebaseEnabled, admin } = require('../firebase-config');

class GameStatsService {
    constructor() {
        this.db = null;
        this.initializeService();
    }

    initializeService() {
        this.db = getFirestore();
        if (this.db) {
            console.log('✅ Game Statistics Service initialized with Firestore');
        } else {
            console.log('⚠️  Game Statistics Service running in offline mode (no Firestore)');
        }
    }

    isEnabled() {
        return isFirebaseEnabled();
    }

    // Initialize game when it starts
    async initializeGame(gameId, roomCode, gameState, players) {
        if (!this.db) return null;

        try {
            const gameStats = {
                gameId,
                roomCode,
                startTime: new Date(),
                endTime: null,
                currentMicroplastics: gameState.microplastics || 0,
                currentRounds: gameState.roundCounter || 0,
                currentTurns: gameState.turnCounter || 0,
                endReason: null,
                playerCount: Object.keys(players).length,
                cardsPlayed: {
                    clothingCards: [],
                    triviaQuestions: [],
                    actionCards: []
                },
                players: {}
            };

            // Add initial player data
            Object.entries(players).forEach(([playerId, player]) => {
                gameStats.players[playerId] = {
                    username: player.username,
                    currentMoney: player.money || 0,
                    currentPoints: player.points || 0,
                    totalClothingItems: this.countClothingItems(player.wardrobe),
                    wardrobeData: player.wardrobe
                };
            });

            await this.db.collection('gameStats').doc(gameId).set(gameStats);
            console.log(`📊 Game stats initialized for game ${gameId}`);
            return gameStats;
        } catch (error) {
            console.error('❌ Failed to initialize game stats:', error);
            return null;
        }
    }

    // Update game progress during gameplay
    async updateGameProgress(gameId, gameState) {
        if (!this.db) return;

        try {
            await this.db.collection('gameStats').doc(gameId).update({
                currentMicroplastics: gameState.microplastics || 0,
                currentRounds: gameState.roundCounter || 0,
                currentTurns: gameState.turnCounter || 0,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error('❌ Failed to update game progress:', error);
        }
    }

    // Update player data during gameplay  
    async updatePlayerData(gameId, playerId, player) {
        if (!this.db) return;

        try {
            const updates = {
                [`players.${playerId}.currentMoney`]: player.money || 0,
                [`players.${playerId}.currentPoints`]: player.points || 0,
                [`players.${playerId}.totalClothingItems`]: this.countClothingItems(player.wardrobe),
                [`players.${playerId}.wardrobeData`]: player.wardrobe,
                lastUpdated: new Date()
            };

            await this.db.collection('gameStats').doc(gameId).update(updates);
        } catch (error) {
            console.error('❌ Failed to update player data:', error);
        }
    }

    // Track clothing card drawn/purchased
    async addClothingCard(gameId, cardData, playerId) {
        if (!this.db) return;

        try {
            const clothingCard = {
                timestamp: new Date(),
                playerId,
                item: cardData.item,
                material: cardData.material,
                condition: cardData.condition,
                sort: cardData.sort,
                price: cardData.price,
                points: cardData.points
            };

            await this.db.collection('gameStats').doc(gameId).update({
                'cardsPlayed.clothingCards': admin.firestore.FieldValue.arrayUnion(clothingCard)
            });
        } catch (error) {
            console.error('❌ Failed to add clothing card:', error);
        }
    }

    // Track trivia question asked
    async addTriviaQuestion(gameId, triviaData) {
        if (!this.db) return;

        try {
            const triviaQuestion = {
                timestamp: new Date(),
                title: triviaData.title,
                statement: triviaData.statement,
                answer: triviaData.answer,
                reasoning: triviaData.reasoning
            };

            await this.db.collection('gameStats').doc(gameId).update({
                'cardsPlayed.triviaQuestions': admin.firestore.FieldValue.arrayUnion(triviaQuestion)
            });
        } catch (error) {
            console.error('❌ Failed to add trivia question:', error);
        }
    }

    // Track action card drawn
    async addActionCard(gameId, actionData, playerId) {
        if (!this.db) return;

        try {
            const actionCard = {
                timestamp: new Date(),
                playerId,
                name: actionData.name,
                title: actionData.title,
                statement: actionData.statement,
                action: actionData.action
            };

            await this.db.collection('gameStats').doc(gameId).update({
                'cardsPlayed.actionCards': admin.firestore.FieldValue.arrayUnion(actionCard)
            });
        } catch (error) {
            console.error('❌ Failed to add action card:', error);
        }
    }

    // Finalize game when it ends
    async finalizeGame(gameId, endReason) {
        if (!this.db) return;

        try {
            await this.db.collection('gameStats').doc(gameId).update({
                endTime: new Date(),
                endReason: endReason || 'unknown',
                lastUpdated: new Date()
            });
            console.log(`📊 Game ${gameId} finalized with reason: ${endReason}`);
        } catch (error) {
            console.error('❌ Failed to finalize game:', error);
        }
    }

    // Clean up abandoned games (older than 5 hours without end time)
    async cleanupAbandonedGames() {
        if (!this.db) return;

        try {
            const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
            
            const snapshot = await this.db.collection('gameStats')
                .where('endTime', '==', null)
                .where('startTime', '<', fiveHoursAgo)
                .get();

            if (snapshot.empty) {
                console.log('✅ No abandoned games to clean up');
                return;
            }

            const batch = this.db.batch();
            let cleanupCount = 0;

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    endTime: new Date(),
                    endReason: 'abandoned',
                    lastUpdated: new Date()
                });
                cleanupCount++;
            });

            await batch.commit();
            console.log(`🧹 Cleaned up ${cleanupCount} abandoned games`);
            
            return cleanupCount;
        } catch (error) {
            console.error('❌ Failed to cleanup abandoned games:', error);
            return 0;
        }
    }

    // Get abandoned games (for monitoring)
    async getAbandonedGames(hoursOld = 5) {
        if (!this.db) return [];

        try {
            const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
            
            const snapshot = await this.db.collection('gameStats')
                .where('endTime', '==', null)
                .where('startTime', '<', cutoffTime)
                .get();

            return snapshot.docs.map(doc => ({
                gameId: doc.id,
                ...doc.data(),
                hoursRunning: Math.round((Date.now() - doc.data().startTime.toDate()) / (1000 * 60 * 60))
            }));
        } catch (error) {
            console.error('❌ Failed to get abandoned games:', error);
            return [];
        }
    }

    // Helper to count total clothing items
    countClothingItems(wardrobe) {
        if (!wardrobe) return 0;
        return Object.values(wardrobe).reduce((total, category) => {
            return total + (category.items ? category.items.length : 0);
        }, 0);
    }

    // Get game statistics
    async getGameStats(gameId) {
        if (!this.db) return null;

        try {
            const doc = await this.db.collection('gameStats').doc(gameId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('❌ Failed to get game stats:', error);
            return null;
        }
    }

    // Get recent games
    async getRecentGames(limit = 10) {
        if (!this.db) return [];

        try {
            const snapshot = await this.db.collection('gameStats')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                gameId: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Failed to get recent games:', error);
            return [];
        }
    }

    // Get games by room code
    async getGamesByRoom(roomCode, limit = 10) {
        if (!this.db) return [];

        try {
            const snapshot = await this.db.collection('gameStats')
                .where('roomCode', '==', roomCode)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                gameId: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Failed to get games by room:', error);
            return [];
        }
    }
}

module.exports = new GameStatsService();