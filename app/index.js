const fs = require('fs');
const path = require('path');
const express = require('express');
const {Client} = require('pg');
const app = express();
const port = 3000;

const hostname = 'postgresql';

// Function returning an connectionString environment variable of the <hostname> service.
const getConnectionString = (hostname) => {
	const connectionString = 'connectionString';
	const value = env[`${hostname}_${connectionString}`];
	return value ? value : null;
}

const pgClient = new Client({connectionString: connectionString});

const connect = async (pgClient) => {
	const connectionString = getConnectionString(hostname);
	if (host) {
		return await pgClient.connect(connectionString);
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
