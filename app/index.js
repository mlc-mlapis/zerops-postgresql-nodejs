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
		console.error(`... connect to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
})();

const selectRecordById = async (pgClient, id) => {
	if (pgClient) {
		const query = {
			name: 'select-record-by-id',
			text: 'SELECT * FROM records WHERE id = $1',
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
			text: 'INSERT INTO records(name, value) VALUES($1, $2)',
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
		const insertResult = await insertRecord(pgClient, 'Patric Cain', 155);
		if (insertResult) {
			console.log('... insertResult:', insertResult);
		} else {
			if (insertResult) {
				console.log('... insertResult');
			} else {
				console.log('... PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`... request to PostgreSQL database failed: ${err.code} - ${err.message}`);
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
				console.log('... PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`... request to PostgreSQL database failed: ${err.code} - ${err.message}`);
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
