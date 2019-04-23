const express = require('express');
const path = require('path');
const bodyParser = require('body-parser'); // Parser for Express
const methodOverride = require('method-override'); // Add PUT and DELETE supprot
const morgan = require('morgan'); // Logger for Express

const log = require('./libs/log')(module); // Logger

const app = express();

app.use(morgan('dev')); // Log all reqs into console
app.use(bodyParser.json()); // JSON Parser
app.use(express.urlencoded())
app.use(methodOverride()); // поддержка put и delete
// app.use(express.static(path.join(__dirname, "public"))); // запуск статического файлового сервера, который смотрит на папку public/ (в нашем случае отдает index.html)



app.get('/ErrorExample', function (req, res, next) {
    next(new Error('Not valid name'));
});

app.get('/api', function (req, res) {
    res.send('API is running');
});

app.listen(1337, function(){
    log.info('Express server listening on port 1337');
});

const db = require("./libs/database.js");

app.get('/api/users', async (req, res, next) => {
    try {
        qres = await db.User.get();
    } catch (err) {
        next(err)
        return;
    }
    res.send({result: qres });
});

app.post('/api/users', async (req, res, next) => {
    const user = new db.User(req.query);
    user.struct.hashed_password = db.User.getHash(req.query.password)
    try {
        const newUsr = await user.submit();
        res.send(newUsr);
    } catch (e) {
        next(e);
    }
});

app.get('/api/users/:id', async (req, res, next) => {
    try {
        qres = await db.User.get(req.params.id);
    } catch (err) {
        next(err)
        return;
    }
    res.send({ result: qres });
});

app.put('/api/users/:id', function (req, res) {
    // NOT IMPLEMENTED
});

app.delete('/api/users/:id', function (req, res) {
    // NOT IMPLEMENTED
});

// 404 Handler
app.use(function (req, res, next) {
    res.status(404);
    log.debug('Not found URL: %s', req.url);
    res.send({ error: 'Not found' });
    return;
});

// 500 Handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    log.error(`Internal error(${res.statusCode}): ${err.message}`);
    console.log(err);
    res.send({ error: err.message });
    return;
});