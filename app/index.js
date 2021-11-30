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

let pgClient = getPgClient(hostname, database);

const connect = async (pgClient) => {
	if (pgClient) {
		return await pgClient.connect();
	}
	console.error('... PostgreSQL SDK client not initialized.');
	return null;
}

(async () => {
	try {
		await connect(pgClient);
		console.info('... connect to PostgreSQL database successful.');
	} catch (err) {
		console.error('... connect to PostgreSQL database failed:', err);
	}
})();

const selectRecordById = async (pgClient, id) => {
	const query = {
		name: 'select-record-by-id',
		text: 'SELECT * FROM record WHERE id = $1',
		values: [id]
	};
	return await pgClient.query(query);
}

app.get('/', async (req, res) => {
	res.send(`... PostgreSQL database access from Node.js`);
	console.log('... root access.');
	const selectResult = await selectRecordById(pgClient, 1);
	if (selectResult.rowCount > 0) {
		console.log('... selected rows:', selectResult.rows);
	} else {
		console.log('... no rows found');
	}
});

const server = app.listen(port, () => {
	console.log(`... listening on port ${port}, the web server started.`);
});

function handleShutdownGracefully() {
	console.info('... closing the web server gracefully.');
	server.close(() => {
		console.log("... the web server closed.");
		if (pgClient) {
			pgClient.end();
		}
		process.exit(0);
	});
}

process.on('SIGINT', handleShutdownGracefully);
process.on('SIGTERM', handleShutdownGracefully);
process.on('SIGHUP', handleShutdownGracefully);
