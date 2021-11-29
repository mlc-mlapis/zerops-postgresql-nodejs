const fs = require('fs');
const path = require('path');
const express = require('express');
const {Client} = require('pg');
const app = express();
const port = 3000;

// Get the global environment object.
const env = process.env;
const hostname = 'postgresql';

// Function returning an connectionString environment variable of the <hostname> service.
const getConnectionString = (hostname) => {
	const connectionString = 'connectionString';
	const value = env[`${hostname}_${connectionString}`];
	return value ? value : null;
}

const getPgClient = (hostname) => {
	const connectionString = getConnectionString(hostname);
	console.log('... connectionString:', connectionString);
	if (connectionString) {
		return new Client(connectionString);
	}
	return null;
}

const pgClient = getPgClient(hostname);

const connect = async (pgClient) => {
	if (pgClient) {
		return await pgClient.connect();
	}
	console.log('... PostgreSQL SDK client not initialized.');
	return null;
}

(async () => {
	try {
		const connectResult = await connect(pgClient);
		console.log('... connect successful:', connectResult);
	} catch (err) {
		console.log('... connect failed:', err);
	}
})();

app.get('/', (req, res) => {
	res.send(`... PostgreSQL access from Node.js`);
	console.log('... root access.');
});

app.listen(port, () => {
	console.log(`... listening on port ${port}, the application started.`);
});
