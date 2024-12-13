import React, { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Box,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import './App.css';

// API URL configuration for Vercel deployment
const API_URL = import.meta.env.VITE_API_URL || 'https://cs-letters.vercel.app/api';

console.log('Using API URL:', API_URL); // Debug logging

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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleTypeChange = useCallback((event) => {
    setType(event.target.value);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
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
      console.log('Sending request to:', `${API_URL}/process-text`);
      const response = await axios.post(`${API_URL}/process-text`, {
        text: inputText,
        type
      });
      
      console.log('Response received:', response.data);
      
      if (response.data.processedText) {
        setOutputText(response.data.processedText);
        setSuccess('Tekst succesvol verwerkt!');
        setSnackbarOpen(true);
      } else {
        throw new Error('Geen verwerkte tekst ontvangen van de server.');
      }
    } catch (err) {
      console.error('Error details:', err);
      console.error('Response data:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Er is een fout opgetreden bij het verwerken van de tekst.');
      setSnackbarOpen(true);
    } finally {
      setProcessing(false);
    }
  }, [inputText, type]);

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

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column - Input */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Input
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={20}
                variant="outlined"
                label="Voer hier de klachtenbrief in"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={processing}
                sx={{ mb: 3 }}
              />
            </Paper>
          </Grid>

          {/* Middle Column - Type Selection */}
          <Grid item xs={12} md={2}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Kies een optie
              </Typography>
              
              <Box sx={{ mb: 3 }}>
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
                fullWidth
                variant="contained"
                color="primary"
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
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                rows={20}
                variant="outlined"
                value={outputText}
                disabled
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
