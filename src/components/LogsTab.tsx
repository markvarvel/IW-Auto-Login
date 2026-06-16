import { Button, Typography, Box, List, ListItem, ListItemText } from '@mui/material';

interface LogsTabProps {
  logs: string[];
  onClearLogs: () => void;
}

export default function LogsTab({ logs, onClearLogs }: LogsTabProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button onClick={onClearLogs} size="small" variant="outlined" color="error">
          Clear Logs
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover', p: 1, overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
            No logs yet.
          </Typography>
        ) : (
          <List dense sx={{ p: 0 }}>
            {logs.map((log, i) => (
              <ListItem key={i} sx={{ p: 0, minHeight: 0 }}>
                <ListItemText
                  primary={<Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>{log}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
