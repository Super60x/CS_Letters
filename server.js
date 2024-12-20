require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const OPENAI_PROMPTS = require('./config/prompts');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is required but not set');
    console.log('Server will start but OpenAI features will be disabled');
}

// Configure axios for OpenAI
const openaiAxios = process.env.OPENAI_API_KEY ? axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
        'Content-Type': 'application/json'
    }
}) : null;

// Test OpenAI connection
const testOpenAIConnection = async () => {
    if (!openaiAxios) {
        console.log('Skipping OpenAI connection test - API key not configured');
        return;
    }
    try {
        console.log('Testing OpenAI connection with model: gpt-4');
        const response = await openaiAxios.post('/chat/completions', {
            model: "gpt-4",
            messages: [{ 
                role: "user", 
                content: "Respond with 'OK' if you can read this." 
            }],
            max_tokens: 5
        });
        
        console.log('OpenAI Response:', response.data.choices[0]?.message?.content);
        console.log('✓ OpenAI connection successful');
    } catch (error) {
        console.error('✗ OpenAI connection failed');
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

// Security middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://cs-letters.onrender.com'] 
        : ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware setup
app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Enhanced logging middleware
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

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

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Input validation middleware
const validateTextInput = (req, res, next) => {
    const { text, type, additionalInfo } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
            error: 'Tekst is verplicht en moet een string zijn.' 
        });
    }

    if (text.length > 7000) {
        return res.status(400).json({ 
            error: 'Tekst mag niet langer zijn dan 7000 karakters.' 
        });
    }

    if (!type || !['rewrite', 'response'].includes(type)) {
        return res.status(400).json({ 
            error: 'Type moet "rewrite" of "response" zijn.' 
        });
    }
    
    next();
};

// Routes
const processTextRouter = require('./api/process-text');
app.use('/', processTextRouter);

// File upload endpoint
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let text = '';
        const fileBuffer = req.file.buffer;
        const fileType = path.extname(req.file.originalname).toLowerCase();

        // Extract text based on file type
        if (fileType === '.pdf') {
            const pdfData = await pdfParse(fileBuffer);
            text = pdfData.text;
        } else if (fileType === '.docx') {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            text = result.value;
        } else if (fileType === '.doc') {
            return res.status(400).json({ error: 'DOC files are not supported. Please convert to DOCX.' });
        }

        if (!text) {
            return res.status(400).json({ error: 'Could not extract text from file' });
        }

        res.json({ text });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// Test endpoint for verifying prompts
app.get('/api/test-prompts', async (req, res) => {
    const testLetter = `
    Beste,

    Ik schrijf deze brief omdat ik erg ontevreden ben over de levering van mijn nieuwe windsurfplank. 
    De plank die ik op 15 november heb besteld, zou binnen 5 werkdagen geleverd worden, maar na 2 weken 
    heb ik nog steeds niks ontvangen! Ik heb al 3x gebeld maar krijg steeds andere verhalen te horen. 
    Dit is echt belachelijk! Ik heb wel 899 euro betaald en dan verwacht ik ook gewoon goede service.
    
    Ik wil nu eindelijk weten waar mijn plank blijft en wanneer ik hem krijg. Als dit nog langer duurt 
    wil ik mijn geld terug! En ik ga zeker een slechte review achterlaten op alle websites.

    gr,
    Jan Jansen`;

    try {
        // Test rewrite
        const rewriteResponse = await openaiAxios.post('/chat/completions', {
            model: "gpt-4",
            messages: [
                { role: "system", content: OPENAI_PROMPTS.system.base },
                { role: "user", content: OPENAI_PROMPTS.system.rewrite(testLetter) }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        // Test response
        const responseResponse = await openaiAxios.post('/chat/completions', {
            model: "gpt-4",
            messages: [
                { role: "system", content: OPENAI_PROMPTS.system.base },
                { role: "user", content: OPENAI_PROMPTS.system.response(testLetter) }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        res.json({
            rewrite: rewriteResponse.data.choices[0]?.message?.content,
            response: responseResponse.data.choices[0]?.message?.content
        });
    } catch (error) {
        console.error('Test prompts error:', error.message);
        res.status(500).json({ error: 'Error testing prompts', details: error.message });
    }
});

// Add root route handler
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(err.status || 500).json({
        error: 'An internal error occurred',
        message: err.message
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('API endpoints:');
    console.log('- POST /api/process-text');
    testOpenAIConnection();
});
