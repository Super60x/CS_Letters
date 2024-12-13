import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
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
  IconButton,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Upload as UploadIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import axios from 'axios';
import './App.css';

const API_URL = 'https://cs-letters.vercel.app/api';

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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [type, setType] = useState('rewrite');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleTypeChange = (event) => {
    setType(event.target.value);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Bestand is te groot. Maximum grootte is 5MB.');
        return;
      }
      setSelectedFile(file);
      const formData = new FormData();
      formData.append('file', file);
      
      setProcessing(true);
      axios.post(`${API_URL}/upload-file`, formData)
        .then(response => {
          setInputText(response.data.text);
        })
        .catch(err => {
          setError(err.response?.data?.error || 'Er is een fout opgetreden bij het uploaden van het bestand.');
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('Voer eerst een tekst in.');
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/process-text`, {
        text: inputText,
        type
      });
      
      setOutputText(response.data.processedText);
      setSuccess('Tekst succesvol verwerkt!');
    } catch (err) {
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Er is een fout opgetreden bij het verwerken van de tekst.');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText)
      .then(() => setSuccess('Tekst gekopieerd naar klembord!'))
      .catch(() => setError('Kon tekst niet kopiëren naar klembord.'));
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Typography variant="h4" component="h1">
            Klachtenbrief Verwerker
          </Typography>
          <IconButton 
            onClick={() => window.location.reload()}
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

        <Grid container spacing={3}>
          {/* Left Column - Input */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Invoer
              </Typography>
              
              <Box sx={{ mb: 3 }}>
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
                rows={20}
                variant="outlined"
                label="Voer hier de klachtenbrief in"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
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
                      sx={{ 
                        backgroundColor: type === 'rewrite' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        borderRadius: 1,
                        p: 1
                      }}
                    />
                    <FormControlLabel 
                      value="response" 
                      control={<Radio />} 
                      label="Antwoord Genereren"
                      sx={{ 
                        backgroundColor: type === 'response' ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        borderRadius: 1,
                        p: 1
                      }}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmit}
                disabled={processing || !inputText.trim()}
                sx={{ py: 2 }}
              >
                {processing ? <CircularProgress size={24} /> : 'Verwerken'}
              </Button>
            </Paper>
          </Grid>

          {/* Right Column - Output */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h3">
                  Uitvoer
                </Typography>
                <IconButton
                  onClick={copyToClipboard}
                  disabled={!outputText}
                  color="primary"
                  sx={{ ml: 1 }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
              <TextField
                multiline
                rows={20}
                fullWidth
                value={outputText}
                variant="outlined"
                disabled
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    height: '100%',
                    '& textarea': {
                      height: '100% !important',
                      fontSize: '1.1rem',
                      lineHeight: '1.5'
                    }
                  }
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
