const express = require('express');
const multer = require('multer');
const path = require('path');
const pdfParse = require('pdf-parse');

// Initialize express
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

// Enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Handle file upload
const handler = async (req, res) => {
    try {
        upload.single('file')(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ error: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            // Use pdf-parse to extract text from PDF
            try {
                const data = await pdfParse(req.file.buffer);
                const text = data.text;
                console.log('File uploaded and parsed successfully:', req.file.originalname);
                res.status(200).json({ 
                    message: 'File uploaded successfully',
                    filename: req.file.originalname,
                    text: text // Include the extracted text
                });
            } catch (parseError) {
                console.error('Error parsing PDF:', parseError);
                res.status(500).json({ error: 'Failed to parse PDF file' });
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = handler;
