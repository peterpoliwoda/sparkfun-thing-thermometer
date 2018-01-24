'use strict';

const http = require('http'),
    fs = require('fs'),
    config = require('./config.json'),
    request = require('request'),
    pathUtils = require('path'),
    express = require('express'),
    app = express(),
    PORT = process.env.PORT || 5000,
    appDir = pathUtils.resolve(__dirname, 'client');
let tempFilePath = getTodaysFileName();
let stashedTempOutside = null;

function getTodaysFileName() {
    let fileName = 'temperature/' + new Date().toISOString().split('T')[0] + '.txt';
    return fileName;
}

function getTempOutside() {
    if (!stashedTempOutside || new Date().getMinutes() === 59
        || new Date().getMinutes() === 30) {
        getTempFromAPI().then((temp) => {
            return temp;
        }).catch((err) => {
            console.error('ERROR on getTempOutside:', err);
            return null;
        });
    } else {
        return stashedTempOutside;
    }
}

function getTempFromAPI() {
    return new Promise((resolve, reject) => {
        const weatherPath = 'https://api.darksky.net/forecast/' +
        config.WEATHER_API_TOKEN + '/' + config.WEATHER_LAT_LONG + '?units=si&exclude=flags,hourly,minutely,daily';
        request(weatherPath, {json: true}, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                let currentTemp = body && body.currently && body.currently.temperature ?
                body.currently.temperature : null;
                console.log('currentTemp from API is:', currentTemp);
                stashedTempOutside = currentTemp;
                resolve(currentTemp);
            }
        });
    });
}

app.use(express.static(appDir));

app.post('/temperature/:temp', function(req, res) {
    tempFilePath = getTodaysFileName();
    let outside = getTempOutside();
    let temperatura = req.params.temp;
    if (temperatura && !isNaN(temperatura)) {
        let now = new Date().toISOString();
        let dataLine = now + ' ' + temperatura + ' ' + outside + '\n';
        fs.appendFile(tempFilePath, dataLine, (err) => {
            if (err) throw err;
            console.log(now + ': Temperature ' + temperatura  + ' recorded. ' + 'Outside: ' + outside);
            res.status(200).json({status: 'OK', message: 'Saved temp ' + temperatura + ' to file at ' + now});
        });
    } else {
        console.error('ERR: Error missing or wrong parameter recording [temp]!');
        res.status(422).json({error: 'Missing required parameter [temp]'});
    }
});

app.get('/temperature/view', function(req, res) {
    tempFilePath = getTodaysFileName();
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file.'});
            console.error('ERR: Error opening temperature file!');
        } else {
            data = data.replace(/\n/g, '<br>');
            res.status(200).send(data);
        }
    });
});

app.get('/temperature/:day', function(req, res) {
    fs.readFile('temperature/' + req.params.day, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file. Files does not exist.'});
            console.error('ERR: Error opening temperature file!');
        } else {
            res.status(200).send(data.toString());
        }
    });
});

app.get('/temperature', function(req, res) {
    tempFilePath = getTodaysFileName();
    fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature file. Recreating. Please refresh page.'});
            console.error('ERR: Error opening temperature file!');
            fs.closeSync(fs.openSync(tempFilePath, 'w'));
        } else {
            res.status(200).send(data.toString());
        }
    });
});

app.get('/days', function(req, res) {
    fs.readdir('temperature/', (err, files) => {
        if (err) {
            res.status(500).json({error: 'Error opening temperature folder.'});
            console.error('ERR: Error opening temperature folder!');
        } else {
            res.status(200).send(files);
        }
    });
});

app.get('/', function(req, res) {
    res.sendfile(pathUtils.resolve(appDir, 'index.html'));
});

http.createServer(app).listen(PORT, function() {
    console.log('Thermometer server listening on port ' + PORT);
    console.log('http://localhost:' + PORT);
    getTempOutside();
});
