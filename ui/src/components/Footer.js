import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        py: 2,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
        SIC Capstone Project • Team 013 • Developed by{' '}
        <Box component="span" sx={{ fontWeight: 500, color: 'primary.main' }}>
          Bala Swamy, Eswar, Durgaa Reddy, Devesh, Sakshi
        </Box>
      </Typography>
    </Box>
  );
};

export default Footer;