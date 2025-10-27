/**
 * Example script showing how to access the analytics API
 * Run with: node exampleAnalyticsAccess.js
 */

const ANALYTICS_TOKEN = 'checkhetlabel_analytics_2025'; // Change to your token
const SERVER_URL = 'http://localhost:3003';

// Helper function to make authenticated requests
async function fetchAnalytics(endpoint) {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${ANALYTICS_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Example 1: Get summary statistics
async function getSummary() {
    try {
        console.log('📊 Fetching analytics summary...\n');
        const summary = await fetchAnalytics('/analytics/summary');

        console.log('=== ANALYTICS SUMMARY ===');
        console.log(`Total Games: ${summary.totalGames}`);
        console.log(`Total Players: ${summary.totalPlayers} (${summary.totalHumanPlayers} human, ${summary.totalCPUPlayers} CPU)`);
        console.log(`Average Duration: ${Math.floor(summary.averageDuration / 60)} minutes`);
        console.log(`Average Rounds: ${summary.averageRounds}`);
        console.log(`Average Microplastics: ${summary.averageMicroplastics}`);
        console.log('\nEnd Reasons:');
        Object.entries(summary.endReasons).forEach(([reason, count]) => {
            console.log(`  - ${reason}: ${count} games`);
        });

        if (summary.mostRecentGames && summary.mostRecentGames.length > 0) {
            console.log('\nMost Recent Game:');
            const recent = summary.mostRecentGames[0];
            console.log(`  Game ID: ${recent.gameId}`);
            console.log(`  Duration: ${Math.floor(recent.duration / 60)} minutes`);
            console.log(`  Winner: ${recent.winner?.username} (${recent.winner?.points} points)`);
        }

    } catch (error) {
        console.error('❌ Error fetching summary:', error.message);
    }
}

// Example 2: Get all analytics data
async function getAllData() {
    try {
        console.log('\n📊 Fetching all analytics data...\n');
        const data = await fetchAnalytics('/analytics');

        console.log(`Total games in database: ${data.games.length}\n`);

        // Show details for each game
        data.games.forEach((game, index) => {
            console.log(`\n=== GAME ${index + 1}: ${game.gameId} ===`);
            console.log(`Started: ${new Date(game.startTime).toLocaleString()}`);
            console.log(`Duration: ${Math.floor(game.duration / 60)} minutes`);
            console.log(`Rounds: ${game.totalRounds}`);
            console.log(`End Reason: ${game.endReason}`);
            console.log(`Winner: ${game.winner?.username} (${game.winner?.points} points)`);

            console.log('\nPlayers:');
            Object.values(game.players).forEach(player => {
                console.log(`  - ${player.username} ${player.isCPU ? '(CPU)' : ''}`);
                console.log(`    Final: $${player.finalMoney}, ${player.finalPoints} points`);
                console.log(`    Trivia: ${player.triviaAnswered.correct}/${player.triviaAnswered.total} correct`);
                console.log(`    Actions Received: ${player.actionsReceived.length}`);
            });
        });

    } catch (error) {
        console.error('❌ Error fetching all data:', error.message);
    }
}

// Example 3: Analyze trivia performance
async function analyzeTriviaPerformance() {
    try {
        console.log('\n📊 Analyzing trivia performance...\n');
        const data = await fetchAnalytics('/analytics');

        const triviaStats = {
            totalQuestions: 0,
            totalCorrect: 0,
            questionFrequency: {}
        };

        data.games.forEach(game => {
            Object.values(game.players).forEach(player => {
                triviaStats.totalQuestions += player.triviaAnswered.total;
                triviaStats.totalCorrect += player.triviaAnswered.correct;

                // Count question frequency
                player.triviaAnswered.questions.forEach(q => {
                    const title = q.title;
                    if (!triviaStats.questionFrequency[title]) {
                        triviaStats.questionFrequency[title] = {
                            asked: 0,
                            correct: 0
                        };
                    }
                    triviaStats.questionFrequency[title].asked++;
                    if (q.isCorrect) {
                        triviaStats.questionFrequency[title].correct++;
                    }
                });
            });
        });

        const accuracy = (triviaStats.totalCorrect / triviaStats.totalQuestions * 100).toFixed(1);

        console.log('=== TRIVIA PERFORMANCE ===');
        console.log(`Total Questions Asked: ${triviaStats.totalQuestions}`);
        console.log(`Total Correct Answers: ${triviaStats.totalCorrect}`);
        console.log(`Overall Accuracy: ${accuracy}%\n`);

        console.log('Question Difficulty (by accuracy):');
        Object.entries(triviaStats.questionFrequency)
            .sort((a, b) => {
                const accuracyA = a[1].correct / a[1].asked;
                const accuracyB = b[1].correct / b[1].asked;
                return accuracyA - accuracyB;
            })
            .forEach(([title, stats]) => {
                const qAccuracy = (stats.correct / stats.asked * 100).toFixed(1);
                console.log(`  ${title}: ${qAccuracy}% (${stats.correct}/${stats.asked})`);
            });

    } catch (error) {
        console.error('❌ Error analyzing trivia:', error.message);
    }
}

// Example 4: Analyze action card distribution
async function analyzeActions() {
    try {
        console.log('\n📊 Analyzing action cards...\n');
        const data = await fetchAnalytics('/analytics');

        const actionStats = {};

        data.games.forEach(game => {
            Object.values(game.players).forEach(player => {
                player.actionsReceived.forEach(action => {
                    if (!actionStats[action.name]) {
                        actionStats[action.name] = {
                            count: 0,
                            title: action.title
                        };
                    }
                    actionStats[action.name].count++;
                });
            });
        });

        console.log('=== ACTION CARD DISTRIBUTION ===');
        Object.entries(actionStats)
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([name, stats]) => {
                console.log(`  ${stats.title} (${name}): ${stats.count} times`);
            });

    } catch (error) {
        console.error('❌ Error analyzing actions:', error.message);
    }
}

// Run all examples
async function runExamples() {
    console.log('CheckHetLabel Analytics Access Examples');
    console.log('======================================\n');

    await getSummary();

    // Uncomment to run other examples:
    // await getAllData();
    // await analyzeTriviaPerformance();
    // await analyzeActions();
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ This script requires Node.js 18+ or you need to install node-fetch');
    console.log('Install with: npm install node-fetch');
    process.exit(1);
}

runExamples();
