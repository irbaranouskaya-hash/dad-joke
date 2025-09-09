const { argv } = require('node:process');
const https = require('node:https');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const COMMANDS = {
    SEARCH: '--searchTerm',
    LEADERBOARD: '--leaderboard',
};

const FILE_NAME = 'jokes.json';

const args = argv.slice(2);

let fileCache = '';


const readJsonFile = async (filePath) => {
    try {
        if (fileCache) {
            return JSON.parse(fileCache);
        }
        
        const data = await fsp.readFile(filePath, 'utf8');
        const parsedData = JSON.parse(data);
        fileCache = data;
        
        return parsedData;
    } catch (error) {
        if (error.code === 'ENOENT') {
            fileCache = '';
            return [];
        }
        throw error;
    }
};

const writeJsonFile = async (filePath, value) => {
    const content = JSON.stringify(value);
    await fsp.writeFile(filePath, content, 'utf8');
    
    fileCache = '';
};

const getLeader = (jokes) => {
    if (!Array.isArray(jokes) || jokes.length === 0) {
        console.log('No joke was found');
        return;
    }

    const frequencyMap = jokes.reduce((result, joke) => {
        const current = result[joke.id] ? result[joke.id].count : 0;
        result[joke.id] = { count: current + 1, joke: joke.joke };
        return result;
    }, {});

    const mostFrequentJokeEntry = Object.entries(frequencyMap)
        .sort((a, b) => b[1].count - a[1].count)[0] || [];
    
    const mostFrequentJoke = mostFrequentJokeEntry[1].joke;

    if (!mostFrequentJoke) {
        console.log('No joke was found');
        return;
    }
    console.log(mostFrequentJoke);
};

const getLeaderboard = async () => {
    try {
        const jokes = await readJsonFile(FILE_NAME);
        getLeader(jokes);
    } catch (error) {
        console.error(error);
    }
};

const randomInteger = (maxExclusive) => {
    return Math.floor(Math.random() * maxExclusive);
};

const saveJoke = async (joke) => {
    try {
        const jokes = await readJsonFile(FILE_NAME);
        jokes.push(joke);
        await writeJsonFile(FILE_NAME, jokes);
    } catch (error) {
        console.error(error);
    }
};

const showJoke = async (jokes) => {
    if (!Array.isArray(jokes) || jokes.length === 0) {
        console.log('No joke was found');
        return;
    }
    const jokeIndex = randomInteger(jokes.length);
    const joke = jokes[jokeIndex];
    console.log(joke.joke);
    await saveJoke(joke);
};

const fetchJoke = (searchTerm) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'icanhazdadjoke.com',
            path: `/search?term=${encodeURIComponent(searchTerm)}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'dadJokes CLI (https://icanhazdadjoke.com)'
            },
        };

        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let rawData = '';

            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(rawData);
                    resolve(parsed.results || []);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
};

const search = async () => {
    try {
        // Validate search term
        const searchTerm = args[1];
        if (!searchTerm) {
            console.error('❌ Error: Search term is required');
            console.log('💡 Usage: node dadJokes.js --searchTerm <your_search_term>');
            console.log('📝 Example: node dadJokes.js --searchTerm cat');
            return;
        }
        
        if (typeof searchTerm !== 'string') {
            console.error('❌ Error: Search term must be a string');
            return;
        }
        
        if (searchTerm.trim().length === 0) {
            console.error('❌ Error: Search term cannot be empty');
            return;
        }
        
        if (searchTerm.length > 100) {
            console.error('❌ Error: Search term is too long (max 100 characters)');
            return;
        }
        
        console.log(`🔍 Searching for jokes with term: "${searchTerm}"`);
        
        // Fetch jokes from API
        let results;
        try {
            results = await fetchJoke(searchTerm);
        } catch (apiError) {
            if (apiError.code === 'ENOTFOUND' || apiError.code === 'ECONNREFUSED') {
                console.error('❌ Network Error: Cannot connect to icanhazdadjoke.com');
                console.log('💡 Please check your internet connection');
                return;
            } else if (apiError.code === 'ETIMEDOUT') {
                console.error('❌ Timeout Error: Request to icanhazdadjoke.com timed out');
                console.log('💡 The server might be slow, please try again later');
                return;
            } else if (apiError.message.includes('JSON')) {
                console.error('❌ Data Error: Invalid response from server');
                console.log('💡 The server returned malformed data');
                return;
            } else {
                console.error('❌ API Error:', apiError.message);
                console.log('💡 There was a problem fetching jokes from the server');
                return;
            }
        }
        
        // Validate API results
        if (!Array.isArray(results)) {
            console.error('❌ Data Error: Server returned invalid data format');
            console.log('💡 Expected array of jokes, got:', typeof results);
            return;
        }
        
        if (results.length === 0) {
            console.log(`ℹ️ No jokes found for term: "${searchTerm}"`);
            console.log('💡 Try a different search term');
            return;
        }
        
        // Show and save joke
        try {
            await showJoke(results);
        } catch (showError) {
            console.error('❌ Error displaying joke:', showError.message);
            console.log('💡 The joke was fetched but could not be displayed');
            return;
        }
        
    } catch (unexpectedError) {
        console.error('❌ Unexpected Error in search function:', unexpectedError.message);
        console.error('📋 Error details:', unexpectedError.stack);
        console.log('💡 This is an unexpected error, please report it if it persists');
    }
};

const showHelp = () => {
    console.log('Usage:');
    console.log(`${COMMANDS.SEARCH} <term>    Search jokes by term and save a random result`);
    console.log(`${COMMANDS.LEADERBOARD}        Show the most frequently shown joke`);
};

(async () => {
    if (args[0] === COMMANDS.SEARCH) {
        await search();
        return;
    }
    if (args[0] === COMMANDS.LEADERBOARD) {
        await getLeaderboard();
        return;
    }
    showHelp();
})();