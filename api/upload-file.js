const express = require('express');
const multer = require('multer');

const app = express();

// Adjust multer configuration for serverless environment
const upload = multer({
    storage: multer.memoryStorage(), // Use memory storage to handle file uploads in serverless
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});

app.post('/upload-file', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Process the uploaded file
    res.status(200).json({ message: 'File uploaded successfully' });
});

module.exports = app;
