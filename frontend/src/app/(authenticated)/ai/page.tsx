'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AiIcon,
  AutoAwesome as SparklesIcon,
  MenuBook as BookIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as ContextIcon,
  HealthAndSafety as HealthIcon,
  History as HistoryIcon,
  ArrowForward as ArrowIcon,
  Spa as AyurvedaIcon,
  LocalHospital as ClinicalIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import api from '@/services/api';
import MarkdownRenderer from '@/components/ai/MarkdownRenderer';
import HealthContextModal from '@/components/ai/HealthContextModal';
import MemoryModal from '@/components/ai/MemoryModal';
import PersonalContextModal from '@/components/ai/PersonalContextModal';

interface Source {
  title: string;
  content: string;
  sourceType?: string;
  sourceId?: string;
  domain?: string;
  evidenceCategory?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  status?: string;
  provider?: string;
  intent?: string;
  timestamp?: string;
}

interface ConversationItem {
  id: string;
  title?: string;
  lastMessageSnippet?: string;
  messageCount: number;
  updatedAt: string;
}

interface UserRoutine {
  id: string;
  routineType: string;
}

/**
 * Format provider provenance using clear customer-facing product language.
 * Never exposes raw internal labels like "Grounded knowledge fallback" or implies a live LLM was used.
 */
function getDisplayProvider(provider?: string): { label: string; color: 'primary' | 'secondary' | 'default'; isLive: boolean } | null {
  if (!provider) return null;
  if (provider.includes('OpenAI')) {
    return {
      label: 'SkinAI Advisor (OpenAI)',
      color: 'primary',
      isLive: true,
    };
  }
  if (provider.includes('Gemini')) {
    return {
      label: 'SkinAI Advisor (Gemini)',
      color: 'secondary',
      isLive: true,
    };
  }
  if (provider.includes('Groq') || provider.includes('groq')) {
    return {
      label: 'SkinAI Advisor (Groq)',
      color: 'secondary',
      isLive: true,
    };
  }
  return {
    label: 'SkinAI Knowledge Engine',
    color: 'default',
    isLive: false,
  };
}

/**
 * Render clinical domain badge for sources
 */
function renderSourceBadge(src: Source) {
  const isAyurveda =
    src.domain === 'ayurveda' ||
    src.sourceType?.toLowerCase().includes('ayurveda') ||
    src.title?.toLowerCase().includes('ayurvedic') ||
    src.content?.toLowerCase().includes('ayurved');

  if (isAyurveda) {
    return (
      <Chip
        icon={<AyurvedaIcon sx={{ fontSize: 13 }} />}
        label="Ayurvedic Evidence"
        size="small"
        sx={{
          bgcolor: 'rgba(217, 119, 6, 0.1)',
          color: '#B45309',
          fontWeight: 600,
          fontSize: '0.7rem',
          height: 20,
        }}
      />
    );
  }

  return (
    <Chip
      icon={<ClinicalIcon sx={{ fontSize: 13 }} />}
      label="Clinical Dermatology"
      size="small"
      sx={{
        bgcolor: 'rgba(13, 148, 136, 0.1)',
        color: '#0F766E',
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 20,
      }}
    />
  );
}

/**
 * Collapsible Sources & Citations Component
 * Keeps source attribution readable and unobtrusive without overwhelming the conversation bubble.
 */
function SourcesSection({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
      <Button
        size="small"
        variant="text"
        onClick={() => setExpanded((prev) => !prev)}
        startIcon={<BookIcon sx={{ fontSize: 15, color: 'text.secondary' }} />}
        endIcon={
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        }
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.75rem',
          color: 'text.secondary',
          p: 0.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        Supporting Clinical Sources ({sources.length})
      </Button>

      {expanded && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sources.map((src, idx) => (
            <Card
              key={idx}
              variant="outlined"
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {src.title}
                  </Typography>
                  {renderSourceBadge(src)}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5, fontSize: '0.78rem' }}>
                  {src.content}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function AiAssistantPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your SkinAI Skincare Advisor. I combine evidence-based dermatology, authentic Ayurvedic wisdom, and your personal skin profile & routines to give you tailored recommendations.\n\nHow can I help you today?',
      provider: 'SkinAI Knowledge Engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRoutines, setUserRoutines] = useState<UserRoutine[]>([]);
  const [explainingRoutine, setExplainingRoutine] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Modals state
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  // Consultation Deletion Dialog State
  const [conversationToDelete, setConversationToDelete] = useState<ConversationItem | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/ai/conversations');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const loadRoutines = useCallback(async () => {
    try {
      const { data } = await api.get('/routines');
      if (Array.isArray(data.data)) {
        setUserRoutines(data.data);
      }
    } catch (err) {
      console.error('Failed to load routines:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadRoutines();
  }, [loadConversations, loadRoutines]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectConversation = useCallback(async (convId: string) => {
    setActiveConversationId(convId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('skinai_active_conv', convId);
    }
    if (isMobile) setHistoryDrawerOpen(false);
    setIsLoading(true);

    try {
      const res = await api.get(`/ai/conversations/${convId}`);
      const rawMessages = res.data?.data?.messages || [];
      const formatted: Message[] = rawMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
        sources: m.metadata?.sources || [],
        status: m.metadata?.status,
        provider: m.metadata?.provider || m.metadata?.model || 'SkinAI Knowledge Engine',
        intent: m.metadata?.intent,
        timestamp: m.createdAt,
      }));

      if (formatted.length > 0) {
        setMessages(formatted);
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Conversation resumed. What would you like to discuss next?',
            provider: 'SkinAI Knowledge Engine',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !activeConversationId && conversations.length > 0) {
      const savedId = sessionStorage.getItem('skinai_active_conv');
      if (savedId && conversations.some((c) => c.id === savedId)) {
        handleSelectConversation(savedId);
      }
    }
  }, [conversations, activeConversationId, handleSelectConversation]);

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('skinai_active_conv');
    }
    setMessages([
      {
        role: 'assistant',
        content:
          'Starting a fresh consultation! I have your skin profile and active routines ready. What would you like to explore today?',
        provider: 'SkinAI Knowledge Engine',
      },
    ]);
    if (isMobile) setHistoryDrawerOpen(false);
  };

  const handleOpenDeleteDialog = (e: React.MouseEvent, conv: ConversationItem) => {
    e.stopPropagation();
    setDeleteDialogError(null);
    setConversationToDelete(conv);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeletingConversation) return;
    setConversationToDelete(null);
    setDeleteDialogError(null);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete || isDeletingConversation) return;

    const convId = conversationToDelete.id;
    setIsDeletingConversation(true);
    setDeleteDialogError(null);

    try {
      await api.delete(`/ai/conversations/${convId}`);

      // Server confirmed success: remove from conversation list
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      // If the deleted conversation was active, show the empty/new-consultation state
      // If it was not active, preserve current conversation
      if (activeConversationId === convId) {
        handleNewConversation();
      }

      setNotification({
        severity: 'success',
        message: 'Consultation deleted successfully.',
      });

      setConversationToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to delete consultation. Please try again.';
      setDeleteDialogError(errMsg);
      setNotification({
        severity: 'error',
        message: errMsg,
      });
      // Conversation remains in list on error
    } finally {
      setIsDeletingConversation(false);
    }
  };

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
        conversationId: activeConversationId,
      });

      const data = res.data.data;
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('skinai_active_conv', data.conversationId);
        }
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        status: data.status,
        provider: data.provider,
        intent: data.intent,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations();
    } catch (err: any) {
      console.error('AI request error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the AI service at this time. Please ensure the backend is running.',
          provider: 'SkinAI Knowledge Engine',
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
          provider: 'SkinAI Knowledge Engine',
        },
      ]);
    } catch (err: any) {
      console.error('Routine explanation error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Routine must be analyzed before requesting an AI explanation. Please open your routine and click "Analyze".',
          provider: 'SkinAI Knowledge Engine',
        },
      ]);
    } finally {
      setExplainingRoutine(false);
    }
  };

  const sampleQuestions = [
    'How can I improve my skin health?',
    'How can I deal with dry skin in winter?',
    'Is my current routine suitable for my skin?',
    'Can I use retinol with salicylic acid?',
    'Recommend a moisturizer under ₹1,000',
  ];

  // Conversation Sidebar Component (Used in Desktop & Mobile Drawer)
  const conversationSidebar = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" fontSize="small" /> Consultations
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewConversation}
            sx={{ borderRadius: 2, textTransform: 'none', px: 1.5 }}
          >
            New
          </Button>
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setHistoryDrawerOpen(false)}
              aria-label="Close consultations list"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {conversations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="caption">No past consultations yet.</Typography>
          </Box>
        ) : (
          conversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            return (
              <ListItem
                key={conv.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    data-testid={`delete-consultation-btn-${conv.id}`}
                    aria-label={`Delete consultation ${conv.title || conv.lastMessageSnippet || 'history'}`}
                    onClick={(e) => handleOpenDeleteDialog(e, conv)}
                    sx={{
                      opacity: isSelected ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        opacity: 1,
                        color: 'error.main',
                        bgcolor: 'rgba(220, 38, 38, 0.08)',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  data-testid="consultation-history-item"
                  data-conv-id={conv.id}
                  selected={isSelected}
                  onClick={() => handleSelectConversation(conv.id)}
                  sx={{
                    borderRadius: 2,
                    pr: 5,
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&.Mui-selected': { bgcolor: 'rgba(13, 148, 136, 0.08)' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 700 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.title || conv.lastMessageSnippet || 'Consultation'}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                        {conv.messageCount} msgs
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        )}
      </List>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<ContextIcon />}
          onClick={() => {
            if (isMobile) setHistoryDrawerOpen(false);
            setContextModalOpen(true);
          }}
          sx={{ borderRadius: 2, textTransform: 'none', justifyContent: 'flex-start' }}
        >
          My Skincare Context
        </Button>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<HealthIcon />}
          onClick={() => {
            if (isMobile) setHistoryDrawerOpen(false);
            setHealthModalOpen(true);
          }}
          sx={{ borderRadius: 2, textTransform: 'none', justifyContent: 'flex-start' }}
        >
          Health Context & Consent
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: { xs: 'calc(100dvh - 88px)', sm: 'calc(100dvh - 112px)' },
        maxHeight: { xs: 'calc(100dvh - 88px)', sm: 'calc(100dvh - 112px)' },
        width: '100%',
        maxWidth: '100%',
        gap: { xs: 0, md: 2 },
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Desktop Sidebar: Usable, stable width (280px), flexShrink: 0, no compression */}
      {!isMobile && (
        <Paper
          elevation={0}
          data-testid="desktop-conversations-sidebar"
          sx={{
            width: 280,
            minWidth: 280,
            maxWidth: 280,
            flexShrink: 0,
            height: '100%',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {conversationSidebar}
        </Paper>
      )}

      {/* Mobile Sidebar Drawer: Accessible drawer on mobile widths */}
      <Drawer
        anchor="left"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        {conversationSidebar}
      </Drawer>

      {/* Main Chat Pane: Flex 1, minWidth 0 to prevent overflow */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.25, sm: 2 },
            mb: { xs: 1, sm: 1.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            flexShrink: 0,
            gap: 1,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {isMobile && (
              <IconButton
                aria-label="Open consultations list"
                onClick={() => setHistoryDrawerOpen(true)}
                size="small"
                color="primary"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            )}
            <AiIcon color="primary" sx={{ fontSize: { xs: 24, sm: 28 }, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Skincare AI Advisor
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Personalized dermatology & Ayurvedic intelligence with profile grounding
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Tooltip title="View what SkinAI knows about your profile and routines">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContextIcon fontSize="small" />}
                onClick={() => setContextModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', px: { xs: 0.75, sm: 1.5 }, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}
              >
                Context
              </Button>
            </Tooltip>
            <Tooltip title="Manage sensitive medical conditions, allergies, or medications">
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<HealthIcon fontSize="small" />}
                onClick={() => setHealthModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', px: { xs: 0.75, sm: 1.5 }, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}
              >
                Health
              </Button>
            </Tooltip>
            <Tooltip title="View or clear long-term conversational memory">
              <Button
                size="small"
                variant="text"
                onClick={() => setMemoryModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary', px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}
              >
                Memory
              </Button>
            </Tooltip>
          </Box>
        </Paper>

        {/* Routine Quick Analysis Explainer (if available) */}
        {userRoutines.length > 0 && (
          <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SparklesIcon sx={{ fontSize: 14, color: 'primary.main' }} /> EXPLAIN ROUTINES:
            </Typography>
            {userRoutines.map((r) => (
              <Chip
                key={r.id}
                label={`Explain ${r.routineType} Analysis`}
                size="small"
                clickable
                disabled={explainingRoutine}
                onClick={() => handleExplainRoutine(r.id, r.routineType)}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'capitalize', fontWeight: 500 }}
              />
            ))}
          </Box>
        )}

        {/* Messages Scroll Area: flex 1, minHeight 0 to scroll independently */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minHeight: 0,
            p: { xs: 1.5, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mb: { xs: 1, sm: 1.5 },
            bgcolor: 'background.paper',
          }}
        >
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.75, sm: 2.25 },
                  maxWidth: { xs: '96%', sm: '88%', md: '84%' },
                  borderRadius: 3,
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.default',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  border: msg.role === 'assistant' ? '1px solid' : 'none',
                  borderColor: 'divider',
                  boxShadow: msg.role === 'user' ? '0 2px 8px rgba(13,148,136,0.15)' : 'none',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {/* Assistant Metadata: Clear Product Provenance without Raw Debug Labels */}
                {msg.role === 'assistant' && (
                  <Box sx={{ mb: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {(() => {
                      const prov = getDisplayProvider(msg.provider);
                      if (!prov) return null;
                      return (
                        <Chip
                          label={prov.label}
                          size="small"
                          color={prov.color}
                          variant="outlined"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            height: 22,
                            borderColor: prov.isLive ? undefined : 'divider',
                            color: prov.isLive ? undefined : 'text.secondary',
                          }}
                        />
                      );
                    })()}
                  </Box>
                )}

                {/* Message Content with Markdown Formatting */}
                {msg.role === 'user' ? (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 500, fontSize: '0.95rem' }}>
                    {msg.content}
                  </Typography>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}

                {/* Retrieved Sources Section: Collapsible, Clean & Unobtrusive */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesSection sources={msg.sources} />
                )}

                {/* Contextual Action Links */}
                {msg.role === 'assistant' && (
                  <Box sx={{ mt: 1.5, pt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Button
                      component={Link}
                      href="/routines"
                      size="small"
                      variant="text"
                      endIcon={<ArrowIcon fontSize="small" />}
                      sx={{ fontSize: '0.75rem', p: 0.5, textTransform: 'none', color: 'primary.main' }}
                    >
                      View Routines
                    </Button>
                    <Button
                      component={Link}
                      href="/recommendations"
                      size="small"
                      variant="text"
                      endIcon={<ArrowIcon fontSize="small" />}
                      sx={{ fontSize: '0.75rem', p: 0.5, textTransform: 'none', color: 'primary.main' }}
                    >
                      Recommendations
                    </Button>
                    <Button
                      component={Link}
                      href="/products"
                      size="small"
                      variant="text"
                      endIcon={<ArrowIcon fontSize="small" />}
                      sx={{ fontSize: '0.75rem', p: 0.5, textTransform: 'none', color: 'primary.main' }}
                    >
                      Products
                    </Button>
                  </Box>
                )}
              </Paper>
            </Box>
          ))}

          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', py: 1.5, pl: 1 }}>
              <CircularProgress size={18} color="primary" />
              <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.9rem' }}>
                SkinAI is analyzing your profile, evaluating routines & synthesizing evidence...
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Frequent Starter Questions */}
        <Box sx={{ mb: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              SUGGESTED:
            </Typography>
            {sampleQuestions.map((q, idx) => (
              <Chip
                key={idx}
                label={q}
                onClick={() => handleSend(q)}
                variant="outlined"
                size="small"
                clickable
                sx={{ borderRadius: 2, fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Input Bar / Composer: Pinned at bottom, always visible */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask about active ingredients, routines, dry winter skin, Ayurveda traditions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            size="small"
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
            sx={{ borderRadius: 3, px: { xs: 2, sm: 3 }, py: 1, minWidth: { xs: 80, sm: 100 } }}
            endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          >
            Send
          </Button>
        </Box>
      </Box>

      {/* Modals */}
      <HealthContextModal
        open={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
      <MemoryModal
        open={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
      />
      <PersonalContextModal
        open={contextModalOpen}
        onClose={() => setContextModalOpen(false)}
        onOpenHealth={() => {
          setContextModalOpen(false);
          setHealthModalOpen(true);
        }}
        onOpenMemory={() => {
          setContextModalOpen(false);
          setMemoryModalOpen(true);
        }}
      />

      {/* Accessible Consultation Deletion Confirmation Dialog */}
      <Dialog
        open={Boolean(conversationToDelete)}
        onClose={() => {
          if (!isDeletingConversation) {
            handleCloseDeleteDialog();
          }
        }}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-consultation-dialog-title"
        aria-describedby="delete-consultation-dialog-description"
        slotProps={{
          transition: {
            onEntered: () => {
              cancelDeleteBtnRef.current?.focus();
            },
          },
          paper: {
            sx: {
              borderRadius: 3,
              p: 1,
              boxShadow: '0px 20px 25px rgba(0, 0, 0, 0.1)',
            },
          },
        }}
      >
        <DialogTitle
          id="delete-consultation-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 1,
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(220, 38, 38, 0.1)',
              color: 'error.main',
              flexShrink: 0,
            }}
          >
            <DeleteIcon fontSize="small" />
          </Box>
          Delete consultation?
        </DialogTitle>

        <DialogContent sx={{ pt: 1, pb: 2 }}>
          <Typography
            id="delete-consultation-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.6 }}
          >
            Are you sure you want to delete this consultation? This action permanently removes its conversation history, clinical reasoning records, and recommendations. This cannot be undone.
          </Typography>

          {conversationToDelete && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="subtitle2"
                data-testid="delete-dialog-consultation-title"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conversationToDelete.title || conversationToDelete.lastMessageSnippet || 'Consultation'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(conversationToDelete.updatedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                • {conversationToDelete.messageCount}{' '}
                {conversationToDelete.messageCount === 1 ? 'message' : 'messages'}
              </Typography>
            </Box>
          )}

          {deleteDialogError && (
            <Alert
              severity="error"
              data-testid="delete-dialog-error"
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {deleteDialogError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            ref={cancelDeleteBtnRef}
            autoFocus
            data-testid="cancel-delete-consultation-btn"
            onClick={handleCloseDeleteDialog}
            variant="outlined"
            color="inherit"
            disabled={isDeletingConversation}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              borderColor: 'divider',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            data-testid="confirm-delete-consultation-btn"
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeletingConversation}
            startIcon={
              isDeletingConversation ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteIcon fontSize="small" />
              )
            }
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              fontWeight: 600,
              boxShadow: 'none',
              bgcolor: 'error.main',
              '&:hover': {
                bgcolor: 'error.dark',
                boxShadow: '0px 4px 12px rgba(220, 38, 38, 0.3)',
              },
            }}
          >
            {isDeletingConversation ? 'Deleting...' : 'Delete consultation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Notification Snackbar */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={5000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
