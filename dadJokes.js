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

const readJsonFile = async (filePath) => {
    try {
        const data = await fsp.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

const writeJsonFile = async (filePath, value) => {
    const content = JSON.stringify(value);
    await fsp.writeFile(filePath, content, 'utf8');
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

    const [ , top ] = Object.entries(frequencyMap)
        .sort((a, b) => b[1].count - a[1].count)[0] || [];

    if (!top) {
        console.log('No joke was found');
        return;
    }
    console.log(top.joke);
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
    const searchTerm = args[1];
    if (!searchTerm) {
        console.log('Enter a searchTerm');
        return;
    }
    try {
        const results = await fetchJoke(searchTerm);
        await showJoke(results);
    } catch (error) {
        console.error(error);
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