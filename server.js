require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const port = 3000;

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is required but not set');
    process.exit(1);
}

// Configure axios for OpenAI
const openaiAxios = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
        'Content-Type': 'application/json'
    }
});

// Test OpenAI connection
const testOpenAIConnection = async () => {
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

// Middleware setup
app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'frontend/build')));

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
    const { text, type } = req.body;

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

// OpenAI Prompts Configuration
const OPENAI_PROMPTS = {
    system: {
        base: "Je bent een professionele klantenservice medewerker die expert is in het behandelen van klachtenbrieven in het Nederlands. " +
              "Je communiceert altijd beleefd, empathisch en oplossingsgericht. " +
              "Je gebruikt een professionele maar toegankelijke schrijfstijl.",
        rewrite: (text) => 
            `Herschrijf deze klachtenbrief of bericht professioneel en duidelijk. Instructies:
             - Behoud de kernboodschap en belangrijke feiten.
             - Verbeter de toon naar professioneel en respectvol.
             - Structureer de brief logisch met een inleiding, kern en afsluiting.
             - Zorg voor een duidelijke structuur: begin met achtergrondinformatie/feiten, geef de oorzaak van het probleem en beschrijf de getroffen maatregelen om herhaling te voorkomen.
             - Behandel elke klacht afzonderlijk in de brief; een brief kan meerdere klachten bevatten, en elk punt moet specifiek en duidelijk worden beantwoord.
             - Gebruik geen toezeggingen over compensatie of herstel. Maak geen beloften die niet bevestigd kunnen worden.
             - Vermijd het suggereren dat werkwijzen of regels worden aangepast of gesprekken worden gehouden zonder concrete details of bewijs.
             - Gebruik geen automatische of onpersoonlijke toon. De brief moet oprecht, empathisch en betrokken overkomen.
             - Gebruik correcte spelling en grammatica.
             - Maak de tekst beknopt maar volledig.
             - Geen informatie uitvinden. Als de benodigde informatie ontbreekt, plaats dan [xx] voor de gegevens die door de gebruiker moeten worden aangevuld.
             - Eindig altijd de brief met: “Met Vriendelijke Groeten.”
             
             De brief:
             ${text}`,
        
        response: (text) => 
            `Schrijf een professioneel antwoord op deze klachtenbrief van een klant. Instructies:
            - Begin met het tonen van begrip voor de situatie en erken de bezorgdheid van de klant.
            - Behandel elk genoemd punt serieus, zelfs als er meerdere klachten in de brief staan. Zorg ervoor dat elk punt afzonderlijk wordt behandeld en beantwoord.
            - Structureer het antwoord duidelijk met achtergrondinformatie/feiten, de oorzaak van het probleem, en de maatregelen die genomen zijn of zullen worden om herhaling te voorkomen.
            
            Belangrijk:
            - Vermijd absoluut toezeggingen over compensatie of herstel of verandering in interne processen. Maak geen beloften die niet bevestigd kunnen worden. Maak geen beloften over processen en interne gesprekken.
            - Geef aan dat er naar een oplossing wordt gezocht, maar vermijd vage uitspraken zoals “dit zal de volgende keer opgelost zijn”. Geef geen commitment.
            - Vermijd het suggereren dat werkwijzen, regels, of processen worden aangepast zonder een specifiek plan of bewijs van verandering.
            - Gebruik een empathische, maar professionele schrijfstijl. Zorg ervoor dat het antwoord oprecht en persoonlijk aanvoelt en geen automatische afhandeling of robotachtige toon bevat.
            - Sluit af met een constructieve toon die aangeeft dat de situatie serieus is genomen. Ga niet in detail over welke stappen.
            - Gebruik een empathische maar professionele schrijfstijl, zonder te veel emotionele betuigingen.
            - Voeg een passende aanhef toe, afhankelijk van de relatie en het onderwerp.
            - Schrijf vanuit de Wij-vorm.
            - Eindig altijd de brief met: “Met Vriendelijke Groeten.”
            
            Vermijd Zinnen:
            - Ik hoop dat we ondanks deze onaangename ervaring de kans krijgen om u in de toekomst opnieuw van dienst te zijn.
            - We zullen er alles aan doen om ervoor te zorgen dat uw volgende ervaring met ons een positieve zal zijn.             
             
             De klachtenbrief:
             ${text}`
    }
};

// Routes
const processTextRouter = require('./api/process-text');
app.use('/', processTextRouter);

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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
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
