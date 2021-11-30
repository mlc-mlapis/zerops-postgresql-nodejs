const fs = require('fs');
const path = require('path');
const express = require('express');
const {Client} = require('pg');
const app = express();
const port = 3000;

// Get the global environment object.
const env = process.env;
const hostname = 'postgresql';
const database = 'postgres';

// Function returning an connectionString environment variable of the <hostname> service.
const getConnectionString = (hostname) => {
	const connectionString = 'connectionString';
	const value = env[`${hostname}_${connectionString}`];
	return value ? value : null;
}

const getPgClient = (hostname, database) => {
	const connectionString = getConnectionString(hostname);
	if (connectionString) {
		return new Client(`${connectionString}/${database}`);
	}
	return null;
}

const pgClient = getPgClient(hostname, database);

const connect = async (pgClient) => {
	if (pgClient) {
		return await pgClient.connect();
	}
	console.error('... PostgreSQL SDK client not initialized.');
	return null;
}

(async () => {
	try {
		const connectResult = await connect(pgClient);
		console.info('... connect successful:', connectResult);
	} catch (err) {
		console.error('... connect failed:', err);
	}
})();

app.get('/', (req, res) => {
	res.send(`... PostgreSQL access from Node.js`);
	console.log('... root access.');
	process.kill(process.pid, 'SIGTERM');
});

const server = app.listen(port, () => {
	console.log(`... listening on port ${port}, the application started.`);
});

function handleShutdownGracefully() {
	console.info('... closing server gracefully.');
	server.close(() => {
		console.log("... server closed.");
		if (pgClient) {
			pgClient.end();
			console.info('... pgClient:', pgClient);
		}
		process.exit(0);
	});
}

process.on('SIGINT', handleShutdownGracefully);
process.on('SIGTERM', handleShutdownGracefully);
process.on('SIGHUP', handleShutdownGracefully);
