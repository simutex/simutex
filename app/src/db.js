const config = require('../../config');

const mongoClient = require('mongodb').MongoClient;
const mongoDbUrl = `mongodb://${config.database.hostname}:${config.database.port}/${config.database.name}`;
let mongodb;

function connect(callback) {
    mongoClient.connect(mongoDbUrl, { useUnifiedTopology: true }, (err, db) => {
        mongodb = db.db(config.database.name);
        callback();
    });
}
function get() {
    return mongodb;
}

function close() {
    mongodb.close();
}

module.exports = {
    connect,
    get,
    close
};