'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AiIcon,
  AutoAwesome as SparklesIcon,
  MenuBook as BookIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import api from '@/services/api';

interface Source {
  title: string;
  content: string;
  sourceType: string;
  sourceId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  status?: string;
  timestamp?: string;
}

interface UserRoutine {
  id: string;
  routineType: string;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your SkinAI Skincare Advisor. You can ask me any question about skincare ingredients, safety rules, conflict detection, or request an explanation of your routine analysis.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [userRoutines, setUserRoutines] = useState<UserRoutine[]>([]);
  const [explainingRoutine, setExplainingRoutine] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user's routines so they can ask for routine explanations
    const loadRoutines = async () => {
      try {
        const { data } = await api.get('/routines');
        if (Array.isArray(data.data)) {
          setUserRoutines(data.data);
        }
      } catch (err) {
        console.error('Failed to load routines:', err);
      }
    };
    loadRoutines();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/ask', {
        question: q,
        conversationId,
      });

      const data = res.data.data;
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        status: data.status,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('AI request error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the AI service at this time. Please ensure the backend is running and database is seeded.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainRoutine = async (routineId: string, routineType: string) => {
    if (explainingRoutine) return;
    setExplainingRoutine(true);

    const userMsg: Message = { role: 'user', content: `Explain my ${routineType} routine analysis in plain language.` };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.post(`/ai/explain-routine/${routineId}`);
      const data = res.data.data;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.explanation || 'No analysis explanation available. Please run routine analysis first.',
        },
      ]);
    } catch (err: any) {
      console.error('Routine explanation error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Routine must be analyzed before requesting an AI explanation. Please open your routine and click "Analyze".',
        },
      ]);
    } finally {
      setExplainingRoutine(false);
    }
  };

  const sampleQuestions = [
    'Can I use retinol and salicylic acid together?',
    'How do I repair a damaged skin barrier?',
    'What does niacinamide do and who should use it?',
    'What is the difference between AHA and BHA?',
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <AiIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 600 }}>
            Skincare AI Advisor
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Evidence-grounded explanations, active ingredient compatibility, and routine insights.
        </Typography>
      </Box>

      {/* Routine Quick Explanations */}
      {userRoutines.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'primary.50' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark', display: 'block', mb: 1 }}>
            EXPLAIN MY ROUTINE
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {userRoutines.map((r) => (
              <Button
                key={r.id}
                size="small"
                variant="outlined"
                color="primary"
                disabled={explainingRoutine}
                startIcon={<SparklesIcon />}
                onClick={() => handleExplainRoutine(r.id, r.routineType)}
                sx={{ borderRadius: 2, bgcolor: 'background.paper', textTransform: 'capitalize' }}
              >
                Explain {r.routineType} Analysis
              </Button>
            ))}
          </Box>
        </Paper>
      )}

      {/* Chat Messages Container */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          minHeight: 480,
          maxHeight: 600,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          mb: 3,
        }}
      >
        {messages.map((msg, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                maxWidth: '85%',
                borderRadius: 3,
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.default',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                border: msg.role === 'assistant' ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {msg.status === 'QUOTA_EXHAUSTED' && (
                <Alert severity="info" icon={<WarningIcon />} sx={{ mb: 1.5, py: 0.5, borderRadius: 2 }}>
                  Live LLM generation requires OpenAI billing credits. Displaying retrieved database knowledge below:
                </Alert>
              )}

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {msg.content}
              </Typography>

              {/* Retrieved Sources Chips / Box */}
              {msg.sources && msg.sources.length > 0 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <BookIcon sx={{ fontSize: 14 }} /> RETRIEVED KNOWLEDGE SOURCES:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {msg.sources.map((src, idx) => (
                      <Card key={idx} variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {src.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {src.content}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        ))}

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Searching skincare knowledge base...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Suggested Questions */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
          FREQUENT QUESTIONS:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {sampleQuestions.map((q, idx) => (
            <Chip
              key={idx}
              label={q}
              onClick={() => handleSend(q)}
              variant="outlined"
              size="small"
              clickable
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Box>

      {/* Input Box */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <TextField
          fullWidth
          placeholder="Ask about active ingredients, routines, or combinations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
          size="medium"
          sx={{
            bgcolor: 'background.paper',
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          sx={{ borderRadius: 3, px: 3 }}
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </Box>
    </Container>
  );
}
