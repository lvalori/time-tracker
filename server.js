const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage, limits: { fileSize: 1048576 } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        console.error("Nessun file caricato");
        return res.status(400).send("Nessun file caricato");
    }

    console.log("File caricato:", req.file);

    res.send("File caricato con successo");
}, (err, req, res, next) => {
    console.error("Errore durante l'upload:", err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).send("Il file è troppo grande (max 1MB)");
    } else if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).send("Richiesta non valida");
    } else {
        res.status(500).send(`Errore durante l'upload del file: ${err.message}`);
    }
});

app.use('/images', express.static(uploadDir));

app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});