import React, { memo } from 'react';
import { Box, Button, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { MenuSection } from '@/config/menu';

type SidebarSectionProps = {
  section: MenuSection;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onNavigate: (path: string) => void;
};

const commonButtonSx = {
  borderColor: 'rgba(255,255,255,0.35)',
  color: '#fff',
  maxWidth: 240,
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

const SidebarSection = memo(({ section, isOpen, onToggle, onNavigate }: SidebarSectionProps) => {
  return (
    <Box sx={{ px: 2, mt: 1 }}>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => onToggle(section.id)}
        startIcon={section.icon ?? <ChevronRightIcon />}
        endIcon={isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        sx={{
          ...commonButtonSx,
          maxWidth: '100%',
          justifyContent: 'space-between',
          textTransform: 'none',
        }}
      >
        <span style={{ fontWeight: 700 }}>{section.title}</span>
      </Button>

      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
          {section.items.map((item) => (
            <Button
              key={item.path}
              variant="contained"
              onClick={() => onNavigate(item.path)}
              startIcon={item.icon}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});

SidebarSection.displayName = 'SidebarSection';

export default SidebarSection;
