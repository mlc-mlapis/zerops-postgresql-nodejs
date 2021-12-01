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

const connect = async (pgClient) => {
	if (pgClient) {
		return await pgClient.connect();
	}
	console.error('<3>... PostgreSQL SDK client not initialized.');
	return null;
}

const getPgClient = (hostname, database) => {
	const connectionString = getConnectionString(hostname);
	if (connectionString) {
		const client = new Client(`${connectionString}/${database}`);
		client.on('error', (err) => {
			console.error('<3>... PostgreSQL connection lost! A new one has been established.');
			if (pgClient) {
				pgClient.off('error', (err) => {
					console.info('... an error hook on the PostgreSQL client removed.');
				});
				pgClient.end();
			}
			pgClient = getPgClient(hostname, database);
			(async () => {
				try {
					await connect(pgClient);
					console.info('... a new connect to PostgreSQL database successful.');
				} catch (err) {
					console.error(`<3>... a new connect to PostgreSQL database failed: ${err.code} - ${err.message}`);
				}
			})();
		});
		return client;
	}
	return null;
}

let pgClient = getPgClient(hostname, database);

(async () => {
	try {
		await connect(pgClient);
		console.info('... connect to PostgreSQL database successful.');
	} catch (err) {
		console.error(`<3>... connect to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
})();

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
