import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Checkbox,
  Avatar,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Send,
  Clear,
  ContentCopy,
  Description,
  Folder,
  Delete,
  Person,
  SmartToy,
  Refresh,
  CloudUpload,
  CheckCircle,
  Error,
  ThumbUp,
  ThumbDown,
  AccessTime,
  Feedback,
  FilterList,
  History,
  Summarize,
  FolderOpen,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { queryAPI } from '../services/api';
import { useAppContext } from '../contexts/AppContext';
import Footer from '../components/Footer';
import AdvancedSearchFilters from '../components/AdvancedSearchFilters';
import ConversationHistorySearch from '../components/ConversationHistorySearch';
import SmartSuggestions from '../components/SmartSuggestions';
import DocumentSummarization from '../components/DocumentSummarization';
import CollectionsManager from '../components/CollectionsManager';

const QueryInterface = () => {
  const {
    conversations,
    setConversations,
    loading,
    setLoading,
    documents,
    setDocuments,
    selectedDocuments,
    setSelectedDocuments,
    documentsLoaded,
    setDocumentsLoaded,
    searchFilters,
    setSearchFilters,
    smartSuggestions,
    setSmartSuggestions,
  } = useAppContext();
  
  const [query, setQuery] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [responseTime, setResponseTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(() => 
    !documentsLoaded
  );

  const loadingMessages = [
    'Activating quantum retrieval systems...',
    'Engaging neuromorphic memory networks...',
    'Scanning holographic information patterns...',
    'Deploying swarm intelligence agents...',
    'Analyzing temporal causality chains...',
    'Running speculative RAG processes...',
    'Optimizing adaptive generation models...',
    'Retrieving relevant document fragments...',
    'Processing quantum interference patterns...',
    'Strengthening synaptic connections...',
  ];
  const [deleteDialog, setDeleteDialog] = useState({ open: false, document: null });
  const [clearDialog, setClearDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState({ open: false, files: [], results: [] });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [summarizeDialog, setSummarizeDialog] = useState({ open: false, document: null });
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [noSourcesDialog, setNoSourcesDialog] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const conversationEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!documentsLoaded) {
      fetchDocuments();
    } else {
      setLoadingDocs(false);
    }
  }, [documentsLoaded]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, loading]);

  // Generate smart suggestions based on context
  useEffect(() => {
    if (conversations.length > 0 && !loading) {
      const lastMessage = conversations[conversations.length - 1];
      if (lastMessage.type === 'ai' && lastMessage.sources && lastMessage.sources.length > 0) {
        // Generate document-based suggestions
        const suggestions = [
          'What are the main findings in these documents?',
          'Can you summarize the key points from the sources?',
          'What methodology was used in these documents?',
          'Are there any limitations mentioned in the sources?',
          'What conclusions are drawn in these documents?',
        ];
        setSmartSuggestions(suggestions);
      }
    }
  }, [conversations, loading]);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const result = await queryAPI.getDocuments();
      setDocuments(result.documents || []);
      setDocumentsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    setDeleteDialog({ open: true, document: { id: documentId, filename } });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.document) return;
    
    try {
      setDeleting(true);
      await queryAPI.deleteDocument(deleteDialog.document.id);
      // Remove deleted document from selected documents
      setSelectedDocuments(prev => prev.filter(id => id !== deleteDialog.document.id));
      await fetchDocuments();
      setDeleteDialog({ open: false, document: null });
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ open: false, document: null });
  };

  const handleDocumentSelect = (documentId) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    // Warn if no documents selected
    if (selectedDocuments.length === 0) {
      setNoSourcesDialog(true);
      return;
    }

    executeQuery();
  };

  const executeQuery = async () => {

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date(),
      selectedDocCount: selectedDocuments.length,
    };

    setConversations(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    setStartTime(Date.now());

    // Cycle through loading messages
    let messageIndex = 0;
    setLoadingMessage(loadingMessages[messageIndex]);
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2000);

    try {
      // Pass selected document IDs or empty array (backend will use all docs if empty)
      const result = await queryAPI.query(
        query, 
        'balanced', 
        selectedDocuments.length > 0 ? selectedDocuments : null
      );
      const responseTimeMs = Date.now() - startTime;
      setResponseTime(responseTimeMs);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: result.answer,
        confidence: result.confidence,
        sources: result.sources || [],
        timestamp: new Date(),
        responseTime: responseTimeMs,
        feedback: null,
        queriedDocCount: selectedDocuments.length,
      };
      setConversations(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Query failed:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your query. Please try again.',
        confidence: 0,
        sources: [],
        timestamp: new Date(),
        error: true,
        responseTime: Date.now() - startTime,
      };
      setConversations(prev => [...prev, errorMessage]);
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingMessage('');
      setStartTime(null);
    }
  };

  const handleNoSourcesContinue = () => {
    setNoSourcesDialog(false);
    executeQuery();
  };

  const handleNoSourcesCancel = () => {
    setNoSourcesDialog(false);
  };

  const handleClear = () => {
    setClearDialog(true);
  };

  const confirmClear = () => {
    setQuery('');
    setConversations([]);
    setClearDialog(false);
    textareaRef.current?.focus();
  };

  const cancelClear = () => {
    setClearDialog(false);
  };

  const handleFeedback = async (messageId, feedbackType, comment = '') => {
    try {
      await queryAPI.submitFeedback(messageId, feedbackType, comment);
      setConversations(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback: { type: feedbackType, comment, timestamp: new Date() } }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleCopyResponse = (content) => {
    if (content) {
      navigator.clipboard.writeText(content);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadDialog({ open: true, files, results: [] });
    setUploading(true);
    
    const results = [];
    try {
      for (const file of files) {
        try {
          const result = await queryAPI.uploadDocument(file);
          results.push({
            filename: file.name,
            status: 'success',
            message: result.message || 'Document processed successfully',
          });
        } catch (error) {
          results.push({
            filename: file.name,
            status: 'error',
            message: error.response?.data?.detail || error.message || 'Upload failed',
          });
        }
      }
      setUploadDialog(prev => ({ ...prev, results }));
      await fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.type === 'user';
    
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 3,
          alignItems: 'flex-start',
        }}
      >
        {!isUser && (
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 32,
              height: 32,
              mr: 2,
              mt: 0.5,
            }}
          >
            <SmartToy fontSize="small" />
          </Avatar>
        )}
        
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            backgroundColor: isUser ? theme.palette.mode === 'dark' ? '#ffffff' : '#000000' : 'background.paper',
            color: isUser ? theme.palette.mode === 'dark' ? '#000000' : '#ffffff' : 'text.primary',
            borderRadius: 2,
            border: isUser ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          {isUser ? (
            <Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {message.content}
              </Typography>
              
              {/* Show selected document count */}
              {message.selectedDocCount !== undefined && (
                <Chip
                  size="small"
                  label={message.selectedDocCount === 0 ? 'All sources' : `${message.selectedDocCount} source${message.selectedDocCount !== 1 ? 's' : ''}`}
                  sx={{ 
                    mt: 1, 
                    height: 20, 
                    fontSize: '0.7rem',
                    backgroundColor: message.selectedDocCount === 0 ? 'warning.light' : 'primary.light',
                  }}
                />
              )}
              
              {/* Timestamp at bottom for user messages */}
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.65rem',
                  opacity: 0.7,
                  mt: 1,
                  display: 'block',
                  color: theme.palette.mode === 'dark' ? '#000000' : '#ffffff',
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          ) : (
            <Box>
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.6 }}>
                      {children}
                    </Typography>
                  ),
                  h1: ({ children }) => (
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {children}
                    </Typography>
                  ),
                  h2: ({ children }) => (
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {children}
                    </Typography>
                  ),
                  ul: ({ children }) => (
                    <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                      {children}
                    </Box>
                  ),
                  li: ({ children }) => (
                    <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                      {children}
                    </Typography>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.65rem',
                    opacity: 0.7
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  onClick={() => handleCopyResponse(message.content)}
                  title="Copy response"
                  sx={{ color: 'text.secondary' }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleFeedback(message.id, 'positive')}
                  title="Good response"
                  sx={{ 
                    color: message.feedback?.type === 'positive' ? 'success.main' : 'text.secondary',
                  }}
                >
                  <ThumbUp fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleFeedback(message.id, 'negative')}
                  title="Poor response"
                  sx={{ 
                    color: message.feedback?.type === 'negative' ? 'error.main' : 'text.secondary',
                  }}
                >
                  <ThumbDown fontSize="small" />
                </IconButton>
              </Box>
              
              {message.sources && message.sources.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Sources ({message.sources.length})
                  </Typography>
                  <Stack spacing={1}>
                    {message.sources.slice(0, 3).map((source, idx) => (
                      <Paper
                        key={idx}
                        sx={{
                          p: 1.5,
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                          Source {source.chunk_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                          {source.content_preview}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Paper>
        
        {isUser && (
          <Avatar
            sx={{
              bgcolor: 'grey.300',
              width: 32,
              height: 32,
              ml: 2,
              mt: 0.5,
            }}
          >
            <Person fontSize="small" />
          </Avatar>
        )}
      </Box>
    );
  };

  return (
    <>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Main Content Area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sources Sidebar */}
        <Box
          sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            backgroundColor: 'background.paper',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Fixed Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Sources
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                />
                <Tooltip title="Upload files">
                  <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <CloudUpload fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Collections">
                  <IconButton size="small" onClick={() => setCollectionsOpen(true)}>
                    <FolderOpen fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={fetchDocuments}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {documents.length > 0 && (
              <Button
                size="small"
                onClick={handleSelectAll}
                variant="text"
                fullWidth
                sx={{ mb: 1, fontSize: '0.8rem', textTransform: 'none' }}
              >
                {selectedDocuments.length === documents.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </Box>
          
          {/* Scrollable Documents List */}
          <Box 
            sx={{ 
              flex: 1, 
              overflow: 'auto', 
              p: 1.5, 
              minHeight: 0,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                },
              },
            }}
          >
            {loadingDocs ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <LinearProgress sx={{ mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  Loading sources...
                </Typography>
              </Box>
            ) : documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CloudUpload sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                  No sources uploaded
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Upload documents to start
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.5}>
                {documents.map((doc) => (
                  <Box
                    key={doc.id}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      p: 1.5,
                      backgroundColor: selectedDocuments.includes(doc.id) 
                        ? theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      },
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => handleDocumentSelect(doc.id)}
                  >
                    <Checkbox
                      checked={selectedDocuments.includes(doc.id)}
                      size="small"
                      sx={{ p: 0 }}
                    />
                    <Description sx={{ color: 'primary.main', fontSize: 18, flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id, doc.filename);
                      }}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main' },
                        p: 0.5,
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Fixed Chat Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                AI Research Assistant
              </Typography>
            </Box>
            
            {conversations.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => setHistorySearchOpen(true)}>
                  <History fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setFiltersOpen(true)}>
                  <FilterList fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleClear} disabled={loading} color="error">
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Scrollable Conversation Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              minHeight: 0,
              backgroundColor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                },
              },
            }}
          >
            <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
            {conversations.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                }}
              >
                <SmartToy sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Welcome to AI Research Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                  Start by selecting your sources and asking questions about your documents.
                  I'll provide detailed answers with citations.
                </Typography>
              </Box>
            ) : (
              <Box>
                {conversations.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                
                {/* Smart Suggestions */}
                {smartSuggestions.length > 0 && !loading && (
                  <SmartSuggestions
                    suggestions={smartSuggestions}
                    onSelectSuggestion={(suggestion) => {
                      setQuery(suggestion);
                      setSmartSuggestions([]);
                    }}
                    onDismiss={() => setSmartSuggestions([])}
                  />
                )}
                
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 32,
                        height: 32,
                        mr: 2,
                        mt: 0.5,
                      }}
                    >
                      <SmartToy fontSize="small" />
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {loadingMessage}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                )}
                
                <div ref={conversationEndRef} />
              </Box>
            )}
            </Box>
          </Box>

          {/* Fixed Input Area */}
          <Box
            sx={{
              p: 2,
              backgroundColor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <form onSubmit={handleSubmit}>
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    '&:focus-within': {
                      borderColor: 'primary.main',
                      boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'}`,
                    },
                  }}
                >
                  {/* Source Count Badge */}
                  {selectedDocuments.length > 0 && (
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Description sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                        {selectedDocuments.length} {selectedDocuments.length === 1 ? 'source' : 'sources'} selected
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', p: 1.5, gap: 1 }}>
                    <TextField
                      ref={textareaRef}
                      fullWidth
                      multiline
                      maxRows={6}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Ask anything about your documents..."
                      variant="standard"
                      disabled={loading}
                      InputProps={{
                        disableUnderline: true,
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                        },
                      }}
                    />
                    <IconButton
                      type="submit"
                      disabled={loading || !query.trim()}
                      color="primary"
                      sx={{
                        backgroundColor: loading || !query.trim() ? 'action.disabledBackground' : 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'action.disabledBackground',
                          color: 'action.disabled',
                        },
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              </form>
            </Box>
          </Box>
        </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Footer />

      {/* No Sources Dialog */}
      <Dialog
        open={noSourcesDialog}
        onClose={handleNoSourcesCancel}
        aria-labelledby="no-sources-dialog-title"
      >
        <DialogTitle id="no-sources-dialog-title">
          No Sources Selected
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            No sources selected. The AI will search across all uploaded documents. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNoSourcesCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleNoSourcesContinue} 
            color="primary" 
            variant="contained"
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Chat Dialog */}
      <Dialog
        open={clearDialog}
        onClose={cancelClear}
        aria-labelledby="clear-dialog-title"
      >
        <DialogTitle id="clear-dialog-title">
          Clear Chat History
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear the entire chat history?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClear}>
            Cancel
          </Button>
          <Button 
            onClick={confirmClear} 
            color="error" 
            variant="contained"
          >
            Clear Chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Document
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteDialog.document?.filename}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Processing Dialog */}
      <Dialog
        open={uploadDialog.open}
        onClose={() => !uploading && setUploadDialog({ open: false, files: [], results: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {uploading ? 'Processing Documents' : 'Upload Complete'}
        </DialogTitle>
        <DialogContent>
          {uploading ? (
            <Box>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Indexing documents and preparing citations...
              </Typography>
              <Box>
                {uploadDialog.files.map((file, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Description sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">{file.name}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box>
              {uploadDialog.results.map((result, index) => (
                <Alert
                  key={index}
                  severity={result.status === 'success' ? 'success' : 'error'}
                  icon={result.status === 'success' ? <CheckCircle /> : <Error />}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2">{result.filename}</Typography>
                  <Typography variant="body2">{String(result.message)}</Typography>
                </Alert>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUploadDialog({ open: false, files: [], results: [] })}
            disabled={uploading}
          >
            {uploading ? 'Processing...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Feature Dialogs */}
      <AdvancedSearchFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApplyFilters={(filters) => setSearchFilters(filters)}
      />

      <ConversationHistorySearch
        open={historySearchOpen}
        onClose={() => setHistorySearchOpen(false)}
        conversations={conversations}
        onSelectConversation={(conv) => {
          conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <DocumentSummarization
        open={summarizeDialog.open}
        onClose={() => setSummarizeDialog({ open: false, document: null })}
        document={summarizeDialog.document}
      />

      <CollectionsManager
        open={collectionsOpen}
        onClose={() => setCollectionsOpen(false)}
        documents={documents}
        onUpdateDocument={(docId, updates) => {
          setDocuments(docs => docs.map(d => d.id === docId ? { ...d, ...updates } : d));
        }}
      />
    </>
  );
};

export default QueryInterface;