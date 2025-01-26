const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const OPENAI_PROMPTS = require('../config/prompts');

// Initialize router instead of app
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());
router.use(cors());

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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        console.error('OpenAI API key is not configured');
        return res.status(500).json({
            success: false,
            error: 'OpenAI API key is niet geconfigureerd. Neem contact op met de beheerder.'
        });
    }
    next();
};

// Configure OpenAI API with timeout
const getOpenAIAxios = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        throw new Error('OpenAI API key is not configured');
    }
    
    return axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
    });
};

// Retry logic for OpenAI requests
const makeOpenAIRequest = async (payload, maxRetries = 2) => {
    const openaiAxios = getOpenAIAxios();
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await openaiAxios.post('/chat/completions', payload);
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error.message);
            
            if (error.response?.status === 401 || error.response?.data?.error?.type === 'invalid_request_error') {
                throw new Error('Invalid API key or authentication error');
            }
            
            if (i === maxRetries) throw error;
            
            // Only retry on timeout or rate limit
            if (error.code === 'ECONNABORTED' || error.response?.status === 429) {
                const delay = Math.pow(2, i) * 1000;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

// Process text endpoint
router.post('/process-text', validateTextInput, validateOpenAIKey, async (req, res) => {
    try {
        console.log('Environment check:', {
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            nodeEnv: process.env.NODE_ENV
        });

        const { text, type, additionalInfo } = req.body;
        console.log('Processing request:', { type, textLength: text.length });
        
        const prompt = type === 'rewrite' ? 
            OPENAI_PROMPTS.system.rewrite(text, additionalInfo || '') : 
            OPENAI_PROMPTS.system.response(text, additionalInfo || '');

        const payload = {
            model: "gpt-4",
            messages: [
                { role: "system", content: OPENAI_PROMPTS.system.base },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        };

        console.log('Making OpenAI request with payload:', {
            model: payload.model,
            messageCount: payload.messages.length
        });

        const response = await makeOpenAIRequest(payload);
        
        if (response.data.choices?.[0]?.message?.content) {
            res.json({ 
                success: true, 
                processedText: response.data.choices[0].message.content 
            });
        } else {
            throw new Error('Invalid response format from OpenAI');
        }
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            stack: error.stack
        });
        
        if (error.message === 'Invalid API key or authentication error') {
            return res.status(401).json({
                success: false,
                error: 'Authenticatiefout. Neem contact op met de beheerder.'
            });
        }
        
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                error: 'De verwerking duurde te lang. Probeer het opnieuw met een kortere tekst.'
            });
        }
        
        if (error.response?.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'Te veel verzoeken. Wacht even en probeer het opnieuw.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Er is een fout opgetreden bij het verwerken van uw tekst. Probeer het later opnieuw.',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
