const express = require('express');
const axios = require('axios');
const cors = require('cors');
const OPENAI_PROMPTS = require('../config/prompts');

// Initialize express
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Input validation middleware
const validateTextInput = (req, res, next) => {
    const { text, type, additionalInfo } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ 
            error: 'Tekst is verplicht en mag niet leeg zijn.',
            success: false
        });
    }

    if (text.length > 4000) {
        return res.status(400).json({ 
            error: 'Tekst is te lang. Maximum lengte is 4000 karakters.',
            success: false
        });
    }

    if (!type || !['rewrite', 'response'].includes(type)) {
        return res.status(400).json({ 
            error: 'Type moet "rewrite" of "response" zijn.',
            success: false
        });
    }
    
    next();
};

// Validate OpenAI API key middleware
const validateOpenAIKey = (req, res, next) => {
    if (!process.env.OPENAI_API_KEY) {
        console.error('OpenAI API key is not configured');
        return res.status(500).json({
            success: false,
            error: 'OpenAI API key is not configured. Please check server configuration.'
        });
    }
    next();
};

// Configure OpenAI API
const openaiAxios = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Process text endpoint
app.post('/api/process-text', validateTextInput, async (req, res) => {
    try {
        if (!openaiAxios) {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.'
            });
        }
        console.log('Received request:', req.body);
        
        const { text, type, additionalInfo } = req.body;
        const prompt = type === 'rewrite' ? 
            OPENAI_PROMPTS.system.rewrite(text, additionalInfo || '') : 
            OPENAI_PROMPTS.system.response(text, additionalInfo || '');

        console.log('Using prompt with additional info:', additionalInfo || 'No additional info provided');

        const response = await openaiAxios.post('/chat/completions', {
            model: "gpt-4",
            messages: [
                { role: "system", content: OPENAI_PROMPTS.system.base },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        console.log('OpenAI response received');
        
        if (response.data.choices && response.data.choices[0]) {
            const processedText = response.data.choices[0].message.content;
            console.log('Processed text:', processedText.substring(0, 100) + '...');
            res.json({ 
                success: true, 
                processedText 
            });
        } else {
            throw new Error('Invalid response from OpenAI API');
        }
    } catch (error) {
        console.error('Error processing text:', error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message || 'Error processing text'
        });
    }
});

// Export the Express API
module.exports = app;
