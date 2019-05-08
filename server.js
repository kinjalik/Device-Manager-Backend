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
        res.send(qres);
    } catch (err) {
        next(err)
        return;
    }
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
        console.log(req.query);
        if (req.query.password)
            qres = await db.User.get(req.params.id, req.query.password);
        else
            qres = await db.User.get(req.params.id);
    } catch (err) {
        next(err)
        return;
    }
    res.send(qres);
});

app.delete('/api/users/:id', function (req, res) {
    if (db.User.delete(req.params.id, req.query.password)) {
        res.send({result: "User Deleted Succesfully"});
    } else {
        res.send({result: "Error while deleting"});
    }
});

app.get('/api/users/:uid/devices', async (req, res, next) => {
    try {
        qres = await db.Device.get(req.params.uid);
    res.send(qres);
    } catch (err) {
        next(err)
        return;
    }
});

app.get('/api/users/:uid/devices/:did', async (req, res, next) => {
    try {
        qres = await db.Device.get(req.params.uid, req.params.did);
        res.send(qres);
    } catch (err) {
        next(err);
        return;
    }
});

app.post('/api/users/:uid/devices', async (req, res, next) => {
    const obj = req.query;
    obj.owner_id = req.params.uid;
    const device = new db.Device(obj);
    try {
        const newDevice = await device.submit();
        res.send(newDevice);
    } catch (err) {
        next(err);
        return;
    }
})

app.delete('/api/users/:uid/devices/:did', async (req, res, next) => {
    if (await db.Device.delete(req.params.uid, req.params.did, req.query.password)) {
        res.send({ result: "Device Deleted Succesfully" });
    } else {
        res.send({ result: "Error while deleting" });
    }
});

app.get('/api/users/:uid/devices/:did/props', async (req, res, next) => {
    try {
        qres = await db.DeviceProp.get(req.params.did);
        res.send(qres);
    } catch (err) {
        next(err);
        return;
    }
});

app.post('/api/users/:uid/devices/:did/props', async (req, res, next) => {
    const obj = req.query;
    obj.device_id = req.params.did;
    const deviceProp = new db.DeviceProp(obj);
    try {
        const newDeviceProp = await deviceProp.submit();
        res.send(newDeviceProp);
    } catch (err) {
        next(err);
        return;
    }
});

app.delete('/api/users/:uid/devices/:did/props/:pid', async (req, res, next) => {
    try {
        await db.DeviceProp.delete(req.params.uid, req.params.did, req.params.pid, req.query.password)
        res.send({ result: "Device Property deleted succesfully" });
    } catch (err) {
        next(err);
        return;
    }
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