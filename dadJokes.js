const { argv } = require('node:process');
const https = require('node:https');
const fs = require('node:fs');

const COMMANDS = {
    SEARCH: '--searchTearm',
    LEADERS: '--leaderboard',
}

const FILE_NAME = 'jokes.json';

const args = argv.slice(2)

const getLeader = (jokes) => {
    if(!jokes || !jokes.length) {
        console.log('No joke was found')
    }

    const frequencyMap = jokes.reduce((res, joke) => {
        const count = (res[joke.id]?.count || 0) +1;
        res[joke.id] = {count, joke: joke.joke}
        return res
    }, {})

    const sorted = Object.entries(frequencyMap).sort((a, b) => b[1].count - a[1].count)[0]
    console.log(sorted[1].joke)
}

const getLeaderboard = () => {
    fs.access(FILE_NAME, fs.constants.F_OK, (err) => {
        if (err) {
            saveInFile(JSON.stringify([joke]))
            return;
        }

        fs.readFile(FILE_NAME, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            jokes = JSON.parse(data);
            getLeader(jokes)
        });
    })
}

const randomInteger = (max) => {
  let rand = 0 + Math.random() * (max + 1);
  return Math.floor(rand);
}

const saveInFile = (content) => {
    fs.writeFile(FILE_NAME, content, err => {
        if (err) {
            console.error(err);
        } 
    });
}

const saveJoke = (joke) => {
    fs.access(FILE_NAME, fs.constants.F_OK, (err) => {
        if (err) {
            saveInFile(JSON.stringify([joke]))
            return
        }
        
        fs.readFile(FILE_NAME, 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            jokes = JSON.parse(data);
            jokes.push(joke)
            saveInFile(JSON.stringify(jokes))
        });
    });
}

const showJoke = (jokes) => {
    if(!jokes || !jokes.length) {
        console.log('No joke was found')
    }
    const jokeIndex = randomInteger(jokes.length);
    const joke = jokes[jokeIndex];
    console.log(joke.joke)
    saveJoke(joke)
}

const fetchJoke = (searchTearm) => {
    const options = {
        hostname: 'icanhazdadjoke.com',
        path: `/search?term=${searchTearm}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    };

    const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        let rawData = '';

        res.on('data', (chunk) => {
            rawData += chunk;
        });

        res.on('end', () => {
            const { results } = JSON.parse(rawData);
            showJoke(results)
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.end();
}


const search = () => {
    const serchTerm = args[1]
    if(!serchTerm) {
        console.log('Enter a searchTerm')
        return
    }
    fetchJoke(serchTerm)
}

if(args[0] === COMMANDS.SEARCH) {
    search();
    return;
} else if(args[0] === COMMANDS.LEADERS) {
    getLeaderboard()
}