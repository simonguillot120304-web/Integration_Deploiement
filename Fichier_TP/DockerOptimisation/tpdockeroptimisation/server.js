const express = require('express');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

const app = express();

app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
        }));
    });

    next();
});

app.get('/', (req, res) => {
    res.send('Hello world — serveur volontairement non optimisé mais fonctionnel');
});

app.get('/big', async (req, res, next) => {
    const filePath = path.join(__dirname, 'maybe-big-file.txt');

    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).send('Fichier introuvable');
            return;
        }

        next(error);
        return;
    }

    res.type('html');

    try {
        await pipeline(
            fs.createReadStream(filePath, { encoding: 'utf8' }),
            new Transform({
                decodeStrings: false,
                transform(chunk, encoding, callback) {
                    callback(null, chunk.replace(/\n/g, '<br/>'));
                },
            }),
            res
        );
    } catch (error) {
        next(error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});