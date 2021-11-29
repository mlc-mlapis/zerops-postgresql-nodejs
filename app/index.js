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
	if (connectionString) {
		return new Client({connectionString});
	}
	return null;
}

const pgClient = getPgClient(hostname);

const connect = async (pgClient) => {
	if (pgClient) {
		return await pgClient.connect();
	}
	console.log('... connect failed.');
	return null;
}

app.get('/', (req, res) => {
	(async () => {
		const connectResult = await connect(pgClient);
		console.log('... connect successful:', connectResult);
	})();
	res.send(`... PostgreSQL access from Node.js`);
	console.log('... root access.');
});

app.listen(port, () => {
	console.log(`... listening on port ${port}, the application started.`);
});
