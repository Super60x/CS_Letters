import React, { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Upload as UploadIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import axios from 'axios';
import './App.css';

// API URL configuration
const API_URL = process.env.NODE_ENV === 'production' 
  ? '' // Empty for production since we use relative paths with Vercel
  : 'http://localhost:3001'; // For local development

console.log('API URL:', API_URL, 'Environment:', process.env.NODE_ENV);

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [type, setType] = useState('rewrite');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleTypeChange = useCallback((event) => {
    setType(event.target.value);
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Bestand is te groot. Maximum grootte is 5MB.');
        setSnackbarOpen(true);
        return;
      }
      setSelectedFile(file);
      const formData = new FormData();
      formData.append('file', file);
      
      setProcessing(true);
      axios.post(`${API_URL}/api/upload-file`, formData)
        .then(response => {
          if (response.data.text) {
            setInputText(response.data.text);
            setSuccess('Bestand succesvol geüpload en verwerkt.');
            setSnackbarOpen(true);
          } else {
            throw new Error('Kon de tekst niet uit het bestand halen.');
          }
        })
        .catch(err => {
          setError(err.response?.data?.error || err.message || 'Er is een fout opgetreden bij het uploaden van het bestand.');
          setSnackbarOpen(true);
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Voer eerst een tekst in.');
      setSnackbarOpen(true);
      return;
    }

    setProcessing(true);
    setError('');
    setOutputText('');
    
    try {
      console.log('Sending request to:', `${API_URL}/api/process-text`);
      const response = await axios.post(`${API_URL}/api/process-text`, {
        text: inputText,
        type,
        additionalInfo: additionalInfo.trim()
      });
      
      console.log('Response received:', response.data);
      
      if (response.data.success && response.data.processedText) {
        setOutputText(response.data.processedText);
        setSuccess('Tekst succesvol verwerkt!');
        setSnackbarOpen(true);
      } else {
        throw new Error(response.data.error || 'Geen verwerkte tekst ontvangen van de server.');
      }
    } catch (err) {
      console.error('Error details:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Er is een fout opgetreden bij het verwerken van de tekst.';
      console.error('Error message:', errorMessage);
      setError(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setProcessing(false);
    }
  }, [inputText, type, additionalInfo]);

  const copyToClipboard = useCallback(() => {
    if (!outputText) return;
    
    navigator.clipboard.writeText(outputText)
      .then(() => {
        setSuccess('Tekst gekopieerd naar klembord!');
        setSnackbarOpen(true);
      })
      .catch(() => {
        setError('Kon tekst niet kopiëren naar klembord.');
        setSnackbarOpen(true);
      });
  }, [outputText]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Typography variant="h4" component="h1">
            Klachtenbrief Verwerker
          </Typography>
          <IconButton 
            onClick={handleRefresh}
            color="primary"
            size="large"
            sx={{ 
              border: '1px solid',
              borderColor: 'primary.main',
              padding: '8px',
              '&:hover': {
                backgroundColor: 'primary.main',
                color: 'white'
              }
            }}
          >
            <RefreshIcon fontSize="medium" />
          </IconButton>
        </Box>

        <Grid container spacing={3} component="div">
          {/* Left Column - Input */}
          <Grid item xs={12} md={4} component="div">
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Invoer
              </Typography>
              
              <Box component="div" sx={{ mb: 3 }}>
                <input
                  accept=".doc,.docx,.pdf"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                    disabled={processing}
                  >
                    Document Uploaden
                  </Button>
                </label>
                {selectedFile && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Geselecteerd bestand: {selectedFile.name}
                  </Typography>
                )}
              </Box>

              <TextField
                fullWidth
                multiline
                rows={10}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                variant="outlined"
                placeholder="Voer hier de klachtenbrief in"
                disabled={processing}
                sx={{ mb: 3 }}
              />
              
              <TextField
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Aanvullende informatie (bijv.: We zijn gesloten op Kerst)"
                disabled={processing}
                sx={{ mb: 3 }}
              />
            </Paper>
          </Grid>

          {/* Middle Column - Type Selection */}
          <Grid item xs={12} md={2} component="div">
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Kies een optie
              </Typography>
              
              <Box component="div" sx={{ mb: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Verwerkingsoptie</FormLabel>
                  <RadioGroup
                    value={type}
                    onChange={handleTypeChange}
                    sx={{ '& .MuiFormControlLabel-root': { my: 1 } }}
                  >
                    <FormControlLabel 
                      value="rewrite" 
                      control={<Radio />} 
                      label="Brief Herschrijven"
                      disabled={processing}
                    />
                    <FormControlLabel 
                      value="response" 
                      control={<Radio />} 
                      label="Antwoord Genereren"
                      disabled={processing}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={processing || !inputText.trim()}
                sx={{ mt: 2 }}
              >
                {processing ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Verwerken'
                )}
              </Button>
            </Paper>
          </Grid>

          {/* Right Column - Output */}
          <Grid item xs={12} md={6} component="div">
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Box component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Resultaat
                </Typography>
                {outputText && (
                  <IconButton
                    onClick={copyToClipboard}
                    color="primary"
                    disabled={processing}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                )}
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={18}
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                variant="outlined"
                placeholder="Hier verschijnt de verwerkte tekst..."
                disabled={processing}
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-root': {
                    color: 'black'
                  }
                }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Snackbar 
          open={snackbarOpen} 
          autoHideDuration={6000} 
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={error ? 'error' : 'success'} 
            sx={{ width: '100%' }}
          >
            {error || success}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App;
