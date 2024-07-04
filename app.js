const express = require('express');
const fs = require('fs');
const { Client } = require('pg');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

client.connect()
    .then(() => {
        console.log("Connected to the database");
    })
    .catch(err => {
        console.error("Failed to connect to the database", err);
        process.exit(1);
    });

app.get('/upload', async (req, res) => {
    try {
        const filePath = process.env.CSV_FILE_PATH;
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV file not found at path: ${filePath}`);
        }

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let headers = [];
        let users = [];

        for await (const line of rl) {
            const values = line.split(',');

            if (headers.length === 0) {
                headers = values;
                continue;
            }

            let user = {};
            headers.forEach((header, index) => {
                const keys = header.split('.');
                let temp = user;

                keys.forEach((key, idx) => {
                    if (idx === keys.length - 1) {
                        temp[key] = values[index];
                    } else {
                        if (!temp[key]) temp[key] = {};
                        temp = temp[key];
                    }
                });
            });

            users.push(user);
        }

        for (const user of users) {
            const { name, age, ...rest } = user;
            await client.query(
                'INSERT INTO users (name, age, address, additional_info) VALUES ($1, $2, $3, $4)',
                [`${name.firstName} ${name.lastName}`, age, JSON.stringify(rest.address), JSON.stringify(rest)]
            );
        }

        res.send('CSV data has been uploaded to the database!');
    } catch (error) {
        console.error("Error processing CSV data:", error);
        res.status(500).send('Error processing CSV data.');
    }
});

app.get('/age-distribution', async (req, res) => {
    try {
        const result = await client.query('SELECT age FROM users');
        const ages = result.rows.map(row => parseInt(row.age));

        const distribution = {
            '< 20': 0,
            '20 to 40': 0,
            '40 to 60': 0,
            '> 60': 0
        };

        ages.forEach(age => {
            if (age < 20) {
                distribution['< 20']++;
            } else if (age < 40) {
                distribution['20 to 40']++;
            } else if (age < 60) {
                distribution['40 to 60']++;
            } else {
                distribution['> 60']++;
            }
        });

        const total = ages.length;
        for (const key in distribution) {
            distribution[key] = (distribution[key] / total) * 100;
        }

        res.json(distribution);
    } catch (error) {
        console.error("Error fetching age distribution:", error);
        res.status(500).send('Error fetching age distribution.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});