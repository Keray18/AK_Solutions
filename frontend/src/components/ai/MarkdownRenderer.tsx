'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (keyPrefix: string) => {
    if (!currentList) return;
    const items = [...currentList.items];
    const isOrdered = currentList.type === 'ol';
    currentList = null;

    elements.push(
      <Box
        component={isOrdered ? 'ol' : 'ul'}
        key={`${keyPrefix}-list-${elements.length}`}
        sx={{
          my: 1,
          pl: 3,
          m: 0,
          '& li': {
            mb: 0.75,
            lineHeight: 1.6,
            fontSize: '0.95rem',
            color: 'text.primary',
          },
        }}
      >
        {items.map((it, idx) => (
          <li key={idx}>{renderInline(it)}</li>
        ))}
      </Box>
    );
  };

  const renderInline = (text: string): React.ReactNode => {
    // Replace **bold** and `code`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match[2]) {
        // Bold
        parts.push(
          <strong key={match.index} style={{ fontWeight: 700, color: 'inherit' }}>
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Inline code
        parts.push(
          <code
            key={match.index}
            style={{
              backgroundColor: 'rgba(13, 148, 136, 0.08)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace',
              color: '#0D9488',
            }}
          >
            {match[3]}
          </code>
        );
      } else if (match[4]) {
        // Italic
        parts.push(<em key={match.index}>{match[4]}</em>);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (currentList) {
        flushList(`line-${i}`);
      }
      continue;
    }

    // Check for Headers
    if (line.startsWith('#### ')) {
      if (currentList) flushList(`line-${i}`);
      elements.push(
        <Typography
          key={`h4-${i}`}
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'text.primary', mt: 1.5, mb: 0.5 }}
        >
          {renderInline(line.replace('#### ', ''))}
        </Typography>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      if (currentList) flushList(`line-${i}`);
      elements.push(
        <Typography
          key={`h3-${i}`}
          variant="h6"
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontWeight: 600,
            color: 'primary.dark',
            mt: 2,
            mb: 0.75,
            fontSize: '1.15rem',
          }}
        >
          {renderInline(line.replace('### ', ''))}
        </Typography>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentList) flushList(`line-${i}`);
      elements.push(
        <Typography
          key={`h2-${i}`}
          variant="h5"
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontWeight: 600,
            color: 'primary.main',
            mt: 2.5,
            mb: 1,
            fontSize: '1.3rem',
          }}
        >
          {renderInline(line.replace('## ', ''))}
        </Typography>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      if (currentList) flushList(`line-${i}`);
      elements.push(
        <Typography
          key={`h1-${i}`}
          variant="h4"
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontWeight: 600,
            color: 'primary.main',
            mt: 3,
            mb: 1,
            fontSize: '1.45rem',
          }}
        >
          {renderInline(line.replace('# ', ''))}
        </Typography>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (currentList) flushList(`line-${i}`);
      elements.push(
        <Box
          key={`quote-${i}`}
          sx={{
            pl: 2,
            my: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            color: 'text.secondary',
            fontStyle: 'italic',
            bgcolor: 'action.hover',
            py: 0.5,
            borderRadius: '0 8px 8px 0',
          }}
        >
          <Typography variant="body2">{renderInline(line.replace(/^>\s*/, ''))}</Typography>
        </Box>
      );
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.substring(2);
      if (!currentList || currentList.type !== 'ul') {
        if (currentList) flushList(`line-${i}`);
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Ordered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const itemText = numMatch[2];
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) flushList(`line-${i}`);
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Normal paragraph
    if (currentList) flushList(`line-${i}`);
    elements.push(
      <Typography
        key={`p-${i}`}
        variant="body1"
        sx={{
          mb: 1,
          lineHeight: 1.65,
          color: 'text.primary',
          fontSize: '0.95rem',
        }}
      >
        {renderInline(line)}
      </Typography>
    );
  }

  if (currentList) {
    flushList('final');
  }

  return <Box sx={{ display: 'flex', flexDirection: 'column' }}>{elements}</Box>;
}
