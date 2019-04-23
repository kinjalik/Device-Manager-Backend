const winston = require('winston');

function getLogger(module) {
    const path = module.filename.split('/').slice(-2).join('/'); //отобразим метку с именем файла, который выводит сообщение

    return new winston.createLogger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                level: 'debug',
                label: path
            })
        ]
    });
}

module.exports = getLogger;