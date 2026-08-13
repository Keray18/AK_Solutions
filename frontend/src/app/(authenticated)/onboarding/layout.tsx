'use client';

import { Box, Typography, Container } from '@mui/material';
import Link from 'next/link';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            color: 'primary.main',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          🧴 SkinAI
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Save & exit
        </Typography>
      </Box>

      {/* Main Content Area */}
      <Container maxWidth="sm" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 4, pb: 8 }}>
        {children}
      </Container>
    </Box>
  );
}
