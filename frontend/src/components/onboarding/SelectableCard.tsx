'use client';

import { Card, CardActionArea, Typography } from '@mui/material';

interface SelectableCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export function SelectableCard({ title, description, selected, onClick }: SelectableCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'grey.200',
        bgcolor: selected ? 'primary.50' : 'background.paper',
        borderRadius: 3,
        transition: 'all 0.2s',
        mb: 2,
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: selected ? 'primary.50' : 'grey.50',
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} color={selected ? 'primary.main' : 'text.primary'}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </CardActionArea>
    </Card>
  );
}
