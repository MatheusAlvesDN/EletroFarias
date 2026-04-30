const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3005;
const STORAGE_PATH = 'D:/CRM_Anexos';
const API_KEY = 'integra_secret_key_123'; // Troque por uma chave forte

// Garante que a pasta existe
if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Middleware de Autenticação
const auth = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) return res.status(401).send('Não autorizado');
    next();
};

const storage = multer.diskStorage({
    destination: STORAGE_PATH,
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 } // Limite de 1GB
});

// Upload de arquivo
app.post('/upload', auth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('Nenhum arquivo enviado');
    res.json({
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/files/${req.file.filename}`
    });
});

// Servir arquivos para download
app.use('/files', express.static(STORAGE_PATH));

// Deletar arquivo
app.delete('/files/:filename', auth, (req, res) => {
    const filePath = path.join(STORAGE_PATH, req.params.filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            return res.send('Excluído com sucesso');
        } catch (e) {
            return res.status(500).send('Erro ao excluir arquivo');
        }
    }
    res.status(404).send('Arquivo não encontrado');
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`INTEGRA FILE SERVER`);
    console.log(`Rodando em http://localhost:${PORT}`);
    console.log(`Armazenando em: ${STORAGE_PATH}`);
    console.log(`=================================`);
});
