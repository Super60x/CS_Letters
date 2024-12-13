const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// OpenAI Prompts Configuration
const OPENAI_PROMPTS = {
    system: {
        base: "Je bent een professionele klantenservice medewerker die expert is in het behandelen van klachtenbrieven in het Nederlands. " +
               "Je doel is om de tekst te herschrijven en empathische reacties te genereren."
    }
};

// Axios instance for OpenAI
const openaiAxios = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
        'Content-Type': 'application/json'
    }
});

app.post('/process-text', async (req, res) => {
    try {
        const { text, type } = req.body;
        console.log('Processing request:', { type, textLength: text.length });

        const response = await openaiAxios.post('/chat/completions', {
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: OPENAI_PROMPTS.system.base
                },
                { 
                    role: "user", 
                    content: text
                }
            ],
            temperature: 0.5,
            max_tokens: 3000
        });

        if (!response.data.choices?.[0]?.message?.content) {
            throw new Error('Ongeldig antwoord van AI service');
        }

        console.log('Successfully processed text');
        res.json({ 
            processedText: response.data.choices[0].message.content 
        });
    } catch (error) {
        console.error('Error processing text:', error.message);
        if (error.response?.data) {
            console.error('OpenAI API error:', error.response.data);
        }
        res.status(500).json({ 
            error: 'Er is een fout opgetreden bij het verwerken van de tekst',
            details: error.message
        });
    }
});

module.exports = app;
