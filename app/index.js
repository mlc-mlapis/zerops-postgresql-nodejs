const fs = require('fs');
const path = require('path');
const express = require('express');
const pg = require('pg');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
	/*
	(async () => {
		

	})();
	*/
	res.send(`... PostgreSQL access from Node.js`);
	console.log('... root access.');
});

app.listen(port, () => {
	console.log(`... listening on port ${port}, the application started.`);
});
