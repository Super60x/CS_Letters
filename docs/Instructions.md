# Customer Service Complaint Letter Processor - Instructions

## Project Overview
This project is a specialized customer service agent that processes documents in Dutch. The application can analyze complaint letters, rewrite them, and automatically generate empathetic responses.

## Architecture

### Backend (server.js)
- **Technology**: Node.js with Express
- **Key Endpoints**:
  - `/api/process-text`: Processes input text
  - `/api/upload-file`: Handles document uploads
- **File Processing**: Supports PDF and DOC formats
- **AI Integration**: Uses OpenAI GPT-4 for text processing

### Frontend (React)
- **Location**: `/frontend` directory
- **Structure**:
  - `src/`: Source code components
  - `public/`: Static files
  - `build/`: Compiled production files

## Core Features

1. **Document Upload**
   - Accepts PDF and DOC files
   - Automatic text extraction
   - File size validation

2. **Text Processing**
   - Direct text input available
   - Dutch language processing
   - Automatic text analysis

3. **AI Assistance**
   - Professional text rewriting
   - Generation of empathetic responses
   - Context-aware processing

## Technical Requirements

### Environment
- Node.js (v14 or higher)
- OpenAI API key
- `.env` configuration

### API Keys
- OpenAI API key must be configured in `.env`
- Example configuration available in `.env.example`

## Security Measures
- Rate limiting implemented
- File type validation
- Input sanitization
- Error handling

## Deployment
- Configured for Vercel deployment
- Production build via `npm run build`
- Environment variables must be configured in deployment platform

## Maintenance and Development
- Use version control (Git)
- Test new features in development environment
- Follow existing coding style and patterns
- Document important changes

## Troubleshooting

### Common Issues
1. **API Connection Errors**
   - Check API key configuration
   - Verify network connectivity
   - Check rate limits

2. **Upload Issues**
   - Verify file format
   - Check file size
   - Verify upload directory permissions

3. **Processing Errors**
   - Monitor server logs
   - Check API responses
   - Verify input validation

## Best Practices
1. Maintain Dutch language for all user-facing content
2. Follow existing error handling patterns
3. Document significant code changes
4. Test thoroughly before deployment
