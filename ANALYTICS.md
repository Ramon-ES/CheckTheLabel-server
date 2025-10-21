# Game Analytics System

This document explains the game analytics logging system for CheckHetLabel.

## Overview

The game analytics system automatically tracks game sessions and stores data in a JSON file (`gameAnalytics.json`) without requiring a database. All data is ordered chronologically and appends automatically.

## Features

- ✅ Automatic JSON file creation if it doesn't exist
- ✅ Chronological data ordering by timestamp
- ✅ Tracks all game events, player actions, trivia, and action cards
- ✅ Protected API endpoints with token authentication
- ✅ No database complexity
- ✅ Easy to backup and version control

## What Gets Logged

### Per Game Session
- **Game ID**: Unique identifier (format: `ROOMCODE_timestamp`)
- **Start/End Time**: ISO timestamps
- **Duration**: Total game time in seconds
- **End Reason**: `microplastics`, `wardrobe`, or `abandoned`
  - `microplastics`: Game ended due to max microplastics
  - `wardrobe`: Game ended due to full wardrobe
  - `abandoned`: All players left before game finished
- **Player Count**: Human vs CPU breakdown
- **Total Rounds**: Number of rounds played
- **Final Microplastics**: End value
- **Winner**: Player with highest points (null for abandoned games)

### Per Player (per game)
- **Basic Info**: Player ID, username, CPU status
- **Final Stats**: Money, points, wardrobe count
- **Trivia Performance**:
  - Correct/incorrect/total answers
  - Each question asked with timestamp
  - Round number when asked
- **Actions Received**:
  - Each action card drawn
  - Round number and timestamp
- **Card Purchases**:
  - Cards purchased per round
  - Material, condition, price, points
- **Round Data**: Detailed data for each round played

## Authentication

The analytics endpoints are protected by a token authentication system.

### Default Token
```
checkhetlabel_analytics_2024
```

### Setting a Custom Token

**Recommended for production!** Set an environment variable:

```bash
# Linux/Mac
export ANALYTICS_TOKEN="your_secure_token_here"

# Windows
set ANALYTICS_TOKEN=your_secure_token_here
```

Or in your `.env` file:
```
ANALYTICS_TOKEN=your_secure_token_here
```

## API Endpoints

All endpoints require authentication via:
- **Header**: `Authorization: Bearer YOUR_TOKEN`
- **Query Parameter**: `?token=YOUR_TOKEN`

### 1. Get All Analytics Data

Returns complete analytics data for all games.

```bash
GET http://localhost:3003/analytics
```

**Example using curl:**
```bash
curl -H "Authorization: Bearer checkhetlabel_analytics_2024" http://localhost:3003/analytics
```

**Example using query parameter:**
```bash
curl http://localhost:3003/analytics?token=checkhetlabel_analytics_2024
```

**Response:**
```json
{
  "games": [
    {
      "gameId": "ABC123_1234567890",
      "roomCode": "ABC123",
      "startTime": "2024-01-15T10:30:00.000Z",
      "endTime": "2024-01-15T11:15:00.000Z",
      "duration": 2700,
      "endReason": "wardrobe",
      "totalRounds": 15,
      "finalMicroplastics": 12,
      "playerCount": {
        "human": 2,
        "cpu": 2,
        "total": 4
      },
      "players": { ... },
      "winner": {
        "playerId": "uuid-here",
        "username": "PLAYER1",
        "points": 85
      }
    }
  ]
}
```

### 2. Get Analytics Summary

Returns aggregated statistics and recent games.

```bash
GET http://localhost:3003/analytics/summary
```

**Example:**
```bash
curl -H "Authorization: Bearer checkhetlabel_analytics_2024" http://localhost:3003/analytics/summary
```

**Response:**
```json
{
  "totalGames": 42,
  "totalPlayers": 168,
  "totalHumanPlayers": 84,
  "totalCPUPlayers": 84,
  "averageDuration": 2400,
  "averageRounds": 12.5,
  "averageMicroplastics": 14.2,
  "endReasons": {
    "microplastics": 25,
    "wardrobe": 17
  },
  "mostRecentGames": [ ... ]
}
```

### 3. Get Specific Game

Returns data for a single game by ID.

```bash
GET http://localhost:3003/analytics/game/:gameId
```

**Example:**
```bash
curl -H "Authorization: Bearer checkhetlabel_analytics_2024" http://localhost:3003/analytics/game/ABC123_1234567890
```

## Client-Side Integration

To properly log all events, you need to emit socket events from your PlayCanvas client:

### 1. Logging Trivia Answers

When a player answers a trivia question:

```javascript
// In your trivia handler script
Network.socket.emit('trivia:answer', {
    roomCode: GameManager.roomCode,
    playerId: GameManager.myPlayerId,
    isCorrect: isCorrect  // boolean
});
```

### 2. Logging Card Purchases

When a player purchases cards:

```javascript
// In your card purchase handler
Network.socket.emit('cards:purchased', {
    roomCode: GameManager.roomCode,
    playerId: GameManager.myPlayerId,
    cards: purchasedCards  // array of card objects
});
```

**Note**: Actions and trivia questions are automatically logged server-side when dealt.

## File Location

Analytics are stored in:
```
Server/gameAnalytics.json
```

### Example Structure

```json
{
  "games": [
    {
      "gameId": "XYZ789_1705315200000",
      "roomCode": "XYZ789",
      "startTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-15T10:45:00.000Z",
      "duration": 2700,
      "endReason": "microplastics",
      "totalRounds": 10,
      "finalMicroplastics": 20,
      "playerCount": {
        "human": 1,
        "cpu": 3,
        "total": 4
      },
      "players": {
        "player-uuid-1": {
          "playerId": "player-uuid-1",
          "username": "ALEX",
          "isCPU": false,
          "finalMoney": 45,
          "finalPoints": 62,
          "totalClothingItems": 12,
          "triviaAnswered": {
            "correct": 5,
            "incorrect": 2,
            "total": 7,
            "questions": [
              {
                "round": 2,
                "title": "Microplastic Sources",
                "statement": "Synthetic clothing releases microplastics...",
                "correctAnswer": true,
                "isCorrect": true,
                "timestamp": "2024-01-15T10:15:00.000Z"
              }
            ]
          },
          "actionsReceived": [
            {
              "round": 3,
              "name": "vacuum",
              "title": "Vacuum Day",
              "statement": "You vacuum your room...",
              "action": "remove_microplastics",
              "timestamp": "2024-01-15T10:20:00.000Z"
            }
          ],
          "cardsPerRound": {
            "1": [
              {
                "title": "Cotton",
                "material": "cotton",
                "condition": "new",
                "item": "T-shirt",
                "points": 8,
                "price": 15
              }
            ]
          },
          "finalWardrobe": {
            "shirts": {
              "count": 4,
              "max": 6,
              "items": [ ... ]
            }
          }
        }
      },
      "winner": {
        "playerId": "player-uuid-1",
        "username": "ALEX",
        "points": 62
      }
    }
  ]
}
```

## Abandoned Games

Games that are started but not finished (all players leave) are automatically saved with special handling:

- **End Reason**: Marked as `"abandoned"`
- **Saved When**: All **human** players disconnect or leave the room
  - ✅ Works for multiplayer games (all humans leave)
  - ✅ Works for single-player vs CPU (human leaves, CPUs ignored)
  - ✅ Triggered immediately when last human disconnects/leaves
- **Data Captured**: All data collected up to the point of abandonment
  - Trivia answers up to that point
  - Actions received up to that point
  - Card purchases up to that point
  - Current player stats (money, points, wardrobe)
  - CPU player data is also saved
- **Winner**: May be null or based on current highest points
- **Use Case**: Analyze where/why players quit games

**Important:** CPU players don't count as "active players" for abandonment detection. When the last human player leaves, the game is immediately marked as abandoned and saved.

This ensures you don't lose valuable analytics data even when games are not completed!

## Data Backup

Since all data is stored in a single JSON file, backing up is simple:

```bash
# Copy the file
cp Server/gameAnalytics.json Server/gameAnalytics_backup_2024-01-15.json

# Or use version control
git add Server/gameAnalytics.json
git commit -m "Analytics data backup"
```

## File Rotation (Optional)

For long-running production servers, consider rotating the analytics file monthly:

```javascript
// Add to gameDataLogger.js or run as a cron job
const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"
const archiveFile = `gameAnalytics_${currentMonth}.json`;
// Move current file to archive, create new file
```

## Security Recommendations

1. **Change the default token** in production
2. **Use environment variables** for the token
3. **Add HTTPS** for production endpoints
4. **Limit access** to analytics endpoints by IP if needed
5. **Backup regularly** to prevent data loss

## Troubleshooting

### Analytics file not being created
- Check write permissions in the `Server/` directory
- Look for error messages in server console

### Data not being logged
- Ensure client emits `trivia:answer` and `cards:purchased` events
- Check that `room.gameSession` is initialized when game starts
- Verify game reaches "game" phase (not stuck in "room" or "login")

### Cannot access analytics endpoint
- Verify token is correct
- Check Authorization header format: `Bearer YOUR_TOKEN`
- Ensure server is running on port 3003

## Future Enhancements

Possible improvements:
- Monthly file rotation
- Analytics dashboard UI
- Export to CSV/Excel
- Real-time analytics streaming
- Player leaderboards
- Trivia question performance analysis
