'use client';

import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Chip,
  Link as MuiLink,
} from '@mui/material';
import {
  AutoAwesome,
  Science,
  Shield,
  TrendingUp,
} from '@mui/icons-material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* ---- Navigation ---- */}
      <Box
        component="header"
        sx={{
          height: { xs: 64, md: 72 },
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(250, 250, 249, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: Logo */}
            <Typography
              variant="h5"
              component={Link}
              href="/"
              sx={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
              }}
            >
              🧴 SkinAI
            </Typography>

            {/* Center: Nav links */}
            <Stack
              direction="row"
              spacing={4}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              <MuiLink component={Link} href="#how-it-works" color="text.primary" sx={{ typography: 'body2', fontWeight: 500, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                How It Works
              </MuiLink>
              <MuiLink component={Link} href="/ingredients" color="text.primary" sx={{ typography: 'body2', fontWeight: 500, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Ingredients
              </MuiLink>
              <MuiLink component={Link} href="/articles" color="text.primary" sx={{ typography: 'body2', fontWeight: 500, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Learn
              </MuiLink>
            </Stack>

            {/* Right: Actions */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Button
                component={Link}
                href="/login"
                color="inherit"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 500 }}
              >
                Log In
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="primary"
                disableElevation
              >
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        
        {/* ---- Hero Section ---- */}
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          {/* Subtle background gradient layer */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #FAFAF9 0%, #F0FDFA 40%, #FAFAF9 100%)',
              zIndex: -1,
            }}
          />
          <Container
            maxWidth="md"
            sx={{
              pt: { xs: 8, md: 14 },
              pb: { xs: 8, md: 12 },
              textAlign: 'center',
            }}
          >
            <Chip
              label="✦ AI-Powered Skincare Intelligence"
              sx={{
                mb: 4,
                bgcolor: 'transparent',
                color: 'primary.dark',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: '1px solid',
                borderColor: 'primary.light',
              }}
            />

            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4rem' },
                mb: 3,
                lineHeight: 1.1,
                color: 'text.primary',
                maxWidth: '800px',
                mx: 'auto',
              }}
            >
              Understand Your Skin.
              <br />
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Make Better Decisions.
              </Box>
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 400,
                maxWidth: 680,
                mx: 'auto',
                mb: 5,
                lineHeight: 1.6,
                fontSize: { xs: '1.125rem', md: '1.25rem' },
              }}
            >
              Evaluate your skincare routine, understand ingredients,
              detect conflicts, and get evidence-aware recommendations
              personalized to you.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'center', mb: 5 }}
            >
              <Button
                component={Link}
                variant="contained"
                size="large"
                href="/register"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.0625rem',
                }}
              >
                Build My Skin Profile
              </Button>
              <Button
                component={Link}
                variant="outlined"
                size="large"
                href="/ingredients"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.0625rem',
                  bgcolor: 'background.paper',
                }}
              >
                Explore Ingredients
              </Button>
            </Stack>

            <Stack
              direction="row"
              spacing={2}
              divider={<Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'divider' }} />}
              sx={{ justifyContent: 'center', alignItems: 'center', color: 'text.secondary', typography: 'body2', fontWeight: 500 }}
            >
              <Box>Trust-first</Box>
              <Box>Evidence-aware</Box>
              <Box>Personalized</Box>
            </Stack>
          </Container>
        </Box>

        {/* ---- Feature Section ---- */}
        <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 }, maxWidth: 800, mx: 'auto' }}>
              <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>
                Your skincare routine deserves better logic.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 3,
              }}
            >
              {[
                {
                  icon: <Science sx={{ fontSize: 32, color: 'primary.main' }} />,
                  title: 'Ingredient Intelligence',
                  description:
                    'Understand what ingredients do, why they are used, and how they fit your skin and routine.',
                },
                {
                  icon: <Shield sx={{ fontSize: 32, color: 'primary.main' }} />,
                  title: 'Conflict Detection',
                  description:
                    'Identify potentially problematic combinations and receive practical usage guidance.',
                },
                {
                  icon: <TrendingUp sx={{ fontSize: 32, color: 'primary.main' }} />,
                  title: 'Routine Optimization',
                  description:
                    'Evaluate your current routine and understand what to keep, remove, change, or reconsider.',
                },
                {
                  icon: <AutoAwesome sx={{ fontSize: 32, color: 'primary.main' }} />,
                  title: 'AI Skincare Assistant',
                  description:
                    'Ask questions using the context of your skin profile, routine, products, and skincare knowledge.',
                },
              ].map((item) => (
                <Box
                  key={item.title}
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 220,
                  }}
                >
                  <Box sx={{ mb: 2, p: 1.5, display: 'inline-flex', borderRadius: 2, bgcolor: 'info.light', alignSelf: 'flex-start' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1.5, fontSize: '1.25rem', fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                    {item.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

      </Box>
    </Box>
  );
}
