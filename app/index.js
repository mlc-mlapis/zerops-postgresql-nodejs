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

const connect = async (client) => {
	if (client) {
		return await client.connect();
	}
	console.error('<3>... PostgreSQL SDK client not initialized.');
	return null;
}

const handleNewConnection = (hostname, database) => {
	const newPgClient = getPgClient(hostname, database);
	(async () => {
		try {
			await connect(newPgClient);
			console.info('... a new connect to PostgreSQL database successful.');
		} catch (err) {
			console.error(`<3>... a new connect to PostgreSQL database failed: ${err.code} - ${err.message}`);
		}
	})();
	return newPgClient;
}

const getPgClient = (hostname, database) => {
	const connectionString = getConnectionString(hostname);
	if (connectionString) {
		const newPgClient = new Client(`${connectionString}/${database}`);
		newPgClient.once('error', () => {
			console.error('<3>... PostgreSQL connection terminated unexpectedly!');
			if (pgClient) {
				// Releasing the old PostgreSQL client <pgClient> via the global variable reference.
				pgClient.end();
			}
			setTimeout(() => {
				// Setting a new PostgreSQL client on the global variable <pgClient>.
				// A delay before attempting to reconnect has a goal to avoid a hot loop,
				// and to allow to process asynchronous requests in the meantime.
				pgClient = handleNewConnection(hostname, database);
			}, 1000);
		});
		return newPgClient;
	}
	return null;
}

// Global variable of the PostgreSQL client.
let pgClient = handleNewConnection(hostname, database);

const getVersion = async (pgClient) => {
	if (pgClient) {
		const query = {
			name: 'select-version',
			text: 'version()'
		};
		return await pgClient.query(query);
	}
	return null;
}

const selectRecordById = async (pgClient, id) => {
	if (pgClient) {
		const query = {
			name: 'select-record-by-id',
			text: 'SELECT * FROM record WHERE id = $1',
			values: [id]
		};
		return await pgClient.query(query);
	}
	return null;
}

const insertRecord = async (pgClient, name, value) => {
	if (pgClient) {
		const query = {
			name: 'insert-record',
			text: 'INSERT INTO records(name, value) VALUES($1, $2) RETURNING id',
			values: [name, value]
		};
		return await pgClient.query(query);
	}
	return null;
}

app.get('/', async (req, res) => {
	res.send(`... PostgreSQL database access from Node.js`);
	console.log('... PostgreSQL connection setting:', {
		timeout,
		keepAliveTimeout,
		headersTimeout,
		requestTimeout
	});
	try {
		console.log('... getVersion');
		const selectResult = await getVersion(pgClient);
		if (selectResult) {
			console.log('... used version:', selectResult);
		} else {
			console.error('<3>... PostgreSQL SDK client not initialized.');
		}
	} catch (err) {
		console.error(`<3>... request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
	try {
		console.log('... insertRecord');
		const insertResult = await insertRecord(pgClient, 'Patrik Cain', 155);
		if (insertResult && insertResult.rowCount > 0) {
			console.log('... inserted rows:', insertResult.rows);
		} else {
			if (insertResult) {
				console.log('... no rows inserted');
			} else {
				console.error('<3>... PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`<3>... request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
	try {
		console.log('... selectRecordById');
		const selectResult = await selectRecordById(pgClient, 1);
		if (selectResult && selectResult.rowCount > 0) {
			console.log('... selected rows:', selectResult.rows);
		} else {
			if (selectResult) {
				console.log('... no rows found');
			} else {
				console.error('<3>... PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`<3>... request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
});

const server = app.listen(port, () => {
	console.log(`... listening on port ${port}, the web server started.`);
});

const {timeout, keepAliveTimeout, headersTimeout, requestTimeout} = server;

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
