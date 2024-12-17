const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Initialize express
const app = express();

// Configure CORS for Vercel deployment
app.use(cors({
    origin: [
        'https://cs-letters.vercel.app',
        'https://cs-letters-git-main.vercel.app',
        'https://cs-letters-*.vercel.app',
        'http://localhost:5173'  // for local development
    ],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// OpenAI Prompts Configuration
const OPENAI_PROMPTS = {
    system: {
        base: "Je bent een professionele klantenservice medewerker die expert is in het behandelen van klachtenbrieven in het Nederlands. " +
             "Je communiceert altijd beleefd, empathisch en oplossingsgericht. " +
             "Je gebruikt een professionele maar toegankelijke schrijfstijl.",
        rewrite: (text, additionalInfo) => 
            `Herschrijf deze klachtenbrief of bericht professioneel en duidelijk. 
             
             BELANGRIJKE CONTEXT (MOET VERWERKT WORDEN IN DE BRIEF):
             ${additionalInfo ? additionalInfo : 'Geen aanvullende informatie beschikbaar.'}
             
             Instructies:
             - VERWERK DE BOVENSTAANDE CONTEXT ACTIEF IN DE BRIEF WAAR RELEVANT
             - Behoud de kernboodschap en belangrijke feiten.
             - Verbeter de toon naar professioneel en respectvol.
             - Structureer de brief logisch met een inleiding, kern en afsluiting.
             - Zorg voor een duidelijke structuur: begin met achtergrondinformatie/feiten.
             - Behandel elke klacht afzonderlijk in de brief; een brief kan meerdere klachten bevatten, en elk punt moet specifiek en duidelijk worden beantwoord.
             - Gebruik geen toezeggingen over compensatie of herstel. Maak geen beloften die niet bevestigd kunnen worden.
             - Vermijd het suggereren dat werkwijzen of regels worden aangepast of gesprekken worden gehouden zonder concrete details of bewijs.
             - Gebruik geen automatische of onpersoonlijke toon. De brief moet oprecht, empathisch en betrokken overkomen.
             - Gebruik correcte spelling en grammatica.
             - Maak de tekst beknopt maar volledig.
             - Geen informatie uitvinden. Als de benodigde informatie ontbreekt, plaats dan [xx] voor de gegevens die door de gebruiker moeten worden aangevuld.
             - Eindig altijd de brief met: "Met Vriendelijke Groeten."
             
             De brief:
             ${text}`,
        response: (text, additionalInfo) => 
            `Schrijf een professioneel antwoord op deze klachtenbrief van een klant.
             
             BELANGRIJKE CONTEXT (MOET VERWERKT WORDEN IN HET ANTWOORD):
             ${additionalInfo ? additionalInfo : 'Geen aanvullende informatie beschikbaar.'}
             
             Instructies:
             - VERWERK DE BOVENSTAANDE CONTEXT ACTIEF IN HET ANTWOORD WAAR RELEVANT
             - Begin met het tonen van begrip voor de situatie en erken de bezorgdheid van de klant.
             - Behandel elk genoemd punt serieus, zelfverzekerd en professioneel.
             - Gebruik een empathische maar zakelijke toon.
             - Bied waar mogelijk concrete oplossingen aan.
             - Vermijd het maken van beloftes die niet nagekomen kunnen worden.
             - Eindig met een positieve noot en een duidelijke volgende stap.
             - Gebruik correcte spelling en grammatica.
             - Maak de tekst beknopt maar volledig.
             - Geen informatie uitvinden. Als de benodigde informatie ontbreekt, plaats dan [xx] voor de gegevens die door de gebruiker moeten worden aangevuld.
             - Eindig Enkele met: "Met Vriendelijke Groeten."
             
             De brief:
             ${text}`
    }
};

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
            OPENAI_PROMPTS.system.rewrite(text, additionalInfo) : 
            OPENAI_PROMPTS.system.response(text, additionalInfo);

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
