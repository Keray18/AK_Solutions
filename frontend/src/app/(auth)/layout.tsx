'use client';

import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'background.default',
      }}
    >
      {/* Left branding panel (hidden on mobile, visible on desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
          color: 'primary.contrastText',
        }}
      >
        <Typography
          variant="h4"
          component={Link}
          href="/"
          sx={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            color: 'inherit',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          🧴 SkinAI
        </Typography>

        <Box sx={{ maxWidth: 480 }}>
          <Typography variant="h2" sx={{ mb: 2, fontSize: '2.5rem', fontWeight: 600 }}>
            Understand your skin.
            <br />
            Make better decisions.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.125rem', lineHeight: 1.6 }}>
            Join SkinAI to evaluate your routine, understand ingredients, and get
            personalized, evidence-aware recommendations.
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          &copy; {new Date().getFullYear()} SkinAI. All rights reserved.
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Mobile Header */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              color: 'primary.main',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            🧴 SkinAI
          </Typography>
        </Box>

        {/* Content area */}
        <Container
          maxWidth="sm"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: { xs: 6, md: 8 },
            px: { xs: 3, sm: 6 },
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
