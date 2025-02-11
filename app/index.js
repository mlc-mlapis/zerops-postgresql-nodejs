const fs = require('fs');
const path = require('path');
const express = require('express');
const {Client, Pool} = require('pg');
const app = express();
const port = 3000;

// Get the global environment object.
const env = process.env;
const hostname = 'postgresql';
const database = 'postgres';

// Function returning an connectionString environment variable of the <hostname> service.
const getConnectionString = (hostname, readOnly) => {
	const connectionString = 'connectionString';
	let value = env[`${hostname}_${connectionString}`];
	// A read only connection means access to standby replicas of the PostgreSQL cluster.
	if (readOnly) {
		value = value.replace('5432', '5433');
	}
	const zeropsPassword = 'zeropsPassword';
	let zps = env[`${hostname}_${zeropsPassword}`];
	console.log('... zps:', zps);
	return value ? value : null;
};

const connect = async (client) => {
	if (client) {
		return await client.connect();
	}
	console.error('<3>... a PostgreSQL SDK client not initialized.');
	return null;
};

const handleNewConnection = (hostname, database) => {
	const newPgClient = getPgClient(hostname, database);
	(async () => {
		try {
			await connect(newPgClient);
			console.info('... a new connect to the PostgreSQL database successful.');
		} catch (err) {
			console.error(`<3>... a new connect to the PostgreSQL database failed: ${err.code} - ${err.message}`);
		}
	})();
	return newPgClient;
};

const getPgClient = (hostname, database) => {
	const connectionString = getConnectionString(hostname, false);
	if (connectionString) {
		// const newPgClient = new Client(`${connectionString}/${database}`);
		const newPgClient = new Client({
			connectionString,
			// keepAlive: false,
			// keepAliveInitialDelayMillis: 10000,
			// connectionTimeoutMillis: 10000,
			// idle_in_transaction_session_timeout: 10000
		});
		newPgClient.once('error', () => {
			console.error('<3>... a PostgreSQL connection terminated unexpectedly!');
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
};

// Global variable of the PostgreSQL client.
let pgClient = handleNewConnection(hostname, database);

const getPgPool = (hostname, database) => {
	const connectionString = getConnectionString(hostname, true);
	if (connectionString) {
		const newPgPool = new Pool({
			max: 10,
			min: 10,
			connectionString: connectionString,
			idleTimeoutMillis: 180000
		});
		newPgPool.on('error', (err, client) => {
			console.error('<3>... a PostgreSQL pool connection terminated unexpectedly!');
			process.exit(-1);
		});
		newPgPool.on('connect', (err, client) => {
			console.info('... a PostgreSQL pool connection: connect');
		});
		newPgPool.on('acquire', (err, client) => {
			console.info('... a PostgreSQL pool connection: acquire');
		});
		newPgPool.on('remove', (err, client) => {
			console.info('... a PostgreSQL pool connection: remove');
		});
		console.info('... a new pool to the PostgreSQL database created:', connectionString);
		return newPgPool;
	}
	return null;
};

// Global variable of the PostgreSQL connection pool.
// const pgPool = getPgPool(hostname, database);

/*
const pgClients = [
	{index: 0, pgClient: handleNewConnection(hostname, database)},
	{index: 1, pgClient: handleNewConnection(hostname, database)},
	{index: 2, pgClient: handleNewConnection(hostname, database)},
	{index: 3, pgClient: handleNewConnection(hostname, database)},
	{index: 4, pgClient: handleNewConnection(hostname, database)},
	{index: 5, pgClient: handleNewConnection(hostname, database)},
	{index: 6, pgClient: handleNewConnection(hostname, database)},
	{index: 7, pgClient: handleNewConnection(hostname, database)},
	{index: 8, pgClient: handleNewConnection(hostname, database)},
	{index: 9, pgClient: handleNewConnection(hostname, database)}
];
*/

const getVersion = async (pgClient) => {
	if (pgClient) {
		const query = {
			name: 'select-version',
			text: 'SELECT version()'
		};
		return await pgClient.query(query);
	}
	return null;
};

const getMode = async (pgClient) => {
	if (pgClient) {
		const query = {
			name: 'select-mode',
			text: 'SELECT pg_is_in_recovery()'
		};
		return await pgClient.query(query);
	}
	return null;
};

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
};

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
};

const handleNewPoolConnection = async (pgPool) => {
	if (pgPool) {
		try {
			checkPoolConnections(pgPool, 'before creating a new');
			const newPgPoolClient = await pgPool.connect();
			console.info('... a new pool connect to the PostgreSQL database successful.');
			checkPoolConnections(pgPool, 'after creating a new');
			return newPgPoolClient;
		} catch (err) {
			console.error(`<3>... a new pool connect to the PostgreSQL database failed: ${err.code} - ${err.message}`);
			return null;
		}
	}
	return null;
};

const checkPoolConnections = (pgPool, message) => {
	const {totalCount, idleCount, waitingCount} = pgPool;
	console.info(`... pool connections (${message}):`, {totalCount, idleCount, waitingCount});
}

app.get('/', async (req, res) => {
	res.send(`... PostgreSQL database access from Node.js`);

	/*
	const pgPoolClient = await handleNewPoolConnection(pgPool);
	if (pgPoolClient) {
		try {
			console.log('... getMode in pool');
			const selectResult = await getMode(pgPoolClient);
			console.log('... used mode:', selectResult.rows);
			pgPoolClient.release();
		} catch (err) {
			pgPoolClient.release();
			console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
		};
	}
	*/

	try {
		console.log('... getMode');
		const selectResult = await getMode(pgClient);
		if (selectResult) {
			console.log('... used mode:', selectResult.rows);
		} else {
			console.error('<3>... a PostgreSQL SDK client not initialized.');
		}
	} catch (err) {
		console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
	try {
		console.log('... getVersion');
		const selectResult = await getVersion(pgClient);
		if (selectResult) {
			console.log('... used version:', selectResult.rows);
		} else {
			console.error('<3>... a PostgreSQL SDK client not initialized.');
		}
	} catch (err) {
		console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}
	try {
		console.log('... insertRecord');
		const insertResult = await insertRecord(pgClient, `Patrik Cain (${Date.now()})`, 155);
		if (insertResult && insertResult.rowCount > 0) {
			console.log('... inserted rows:', insertResult.rows);
		} else {
			if (insertResult) {
				console.log('... no rows inserted');
			} else {
				console.error('<3>... a PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
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
				console.error('<3>... a PostgreSQL SDK client not initialized.');
			}
		}
	} catch (err) {
		console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
	}

	/*
	for (let index = 0; index < pgClients.length; index++) {
		const pgClientElement = pgClients[index];
		try {
			console.log('... selectRecordById for index:', pgClientElement.index);
			const selectResult = await selectRecordById(pgClientElement.pgClient, pgClientElement.index);
			if (selectResult && selectResult.rowCount > 0) {
				console.log('... selected rows:', selectResult.rows);
			} else {
				if (selectResult) {
					console.log('... no rows found');
				} else {
					console.error('<3>... a PostgreSQL SDK client not initialized.');
				}
			}
		} catch (err) {
			console.error(`<3>... a request to PostgreSQL database failed: ${err.code} - ${err.message}`);
		}
	}
	*/
});

const server = app.listen(port, () => {
	console.log(`... listening on port ${port}, the web server started.`);
});

const {timeout, keepAliveTimeout, headersTimeout, requestTimeout} = server;

// setInterval(() => checkPoolConnections(pgPool, 'checking'), 1000);

const handleShutdownGracefully = () => {
	console.info('... closing the server gracefully.');
	server.close(() => {
		console.log('... the server closed.');
		if (pgClient) {
			pgClient.end();
		}
		if (pgPool) {
			pgPool.end();
		}
		process.exit(0);
	});
}

process.on('SIGINT', handleShutdownGracefully);

process.on('SIGTERM', handleShutdownGracefully);

process.on('SIGHUP', handleShutdownGracefully);
