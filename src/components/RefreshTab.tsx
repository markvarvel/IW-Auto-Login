import { Button, Typography, Box, TextField, Alert } from '@mui/material';
import { ProgressState } from '../utils';

interface RefreshTabProps {
  refreshRangeFilter: string;
  onRefreshRangeFilterChange: (value: string) => void;
  isRefreshing: boolean;
  refreshProgress: ProgressState;
  onStartRefresh: () => void;
  onStopRefresh: () => void;
}

export default function RefreshTab({
  refreshRangeFilter,
  onRefreshRangeFilterChange,
  isRefreshing,
  refreshProgress,
  onStartRefresh,
  onStopRefresh,
}: RefreshTabProps) {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Refresh all InstantWar tabs to ensure they're up to date
      </Alert>

      <TextField
        label="Tab Range (e.g., 1-5, 8, 10-12)"
        variant="outlined"
        fullWidth
        value={refreshRangeFilter}
        onChange={(e) => onRefreshRangeFilterChange(e.target.value)}
        margin="normal"
        size="small"
        disabled={isRefreshing}
        placeholder="Leave blank for all tabs"
      />

      <Button
        variant="contained"
        onClick={onStartRefresh}
        fullWidth
        sx={{ mt: 2 }}
        disabled={isRefreshing}
      >
        {isRefreshing ? 'Refreshing...' : 'Start Refresh'}
      </Button>

      <Button
        variant="contained"
        color="error"
        onClick={onStopRefresh}
        fullWidth
        sx={{ mt: 1 }}
      >
        Stop Refresh
      </Button>

      {refreshProgress.active && refreshProgress.total > 0 && (
        <Typography variant="body1" align="center" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
          #{refreshProgress.current} of {refreshProgress.total}
        </Typography>
      )}
    </Box>
  );
}
