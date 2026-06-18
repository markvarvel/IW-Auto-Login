import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import RestartAlt from '@mui/icons-material/RestartAlt';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Upload from '@mui/icons-material/Upload';
import Delete from '@mui/icons-material/Delete';
import History from '@mui/icons-material/History';
import { LoginData, ProgressState, getTimestampColor, isRecentlyLoaded, type RecentFile, type SchemaValidation } from '../utils';

interface LoginTabProps {
  loginCredentials: LoginData[];
  rangeFilter: string;
  onRangeFilterChange: (value: string) => void;
  isReloading: boolean;
  lastLoaded: string;
  loginProgress: ProgressState;
  needsSetup: boolean;
  schemaWarning: SchemaValidation | null;
  recentFiles: RecentFile[];
  activeFileName: string;
  onChooseFile: () => void;
  onSelectRecentFile: (file: RecentFile) => void;
  onRemoveRecentFile: (name: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReload: () => void;
  onStartLogin: () => void;
  onStopLogin: () => void;
}

export default function LoginTab({
  loginCredentials,
  rangeFilter,
  onRangeFilterChange,
  isReloading,
  lastLoaded,
  loginProgress,
  needsSetup,
  schemaWarning,
  recentFiles,
  activeFileName,
  onChooseFile,
  onSelectRecentFile,
  onRemoveRecentFile,
  onFileUpload,
  onReload,
  onStartLogin,
  onStopLogin,
}: LoginTabProps) {
  return (
    <Box>
      {/* Setup prompt — shown when no file has been chosen yet */}
      {needsSetup && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            First time setup
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Choose your InstantWar login Excel file (`.xlsx`) to get started.
            You only need to do this once — the extension will remember your file.
          </Typography>
          <Button
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={onChooseFile}
            fullWidth
            size="small"
          >
            Choose XLSX File
          </Button>
        </Alert>
      )}

      {/* File management buttons — shown once data is loaded */}
      {!needsSetup && (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: getTimestampColor(lastLoaded),
                  flexShrink: 0,
                  ...(isRecentlyLoaded(lastLoaded) && {
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.5)' },
                      '70%': { boxShadow: '0 0 0 6px rgba(76, 175, 80, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
                    },
                    animation: 'pulse 2s ease-in-out infinite',
                  }),
                }}
              />
              <Typography variant="body2">
                Loaded {loginCredentials.length} accounts
                {lastLoaded && (
                  <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                    — {lastLoaded}
                  </Typography>
                )}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Click <strong>Reload</strong> to refresh from your file.
            </Typography>
          </Alert>

          <Button
            variant="outlined"
            onClick={onReload}
            fullWidth
            sx={{ mb: 1 }}
            startIcon={<RestartAlt />}
            disabled={isReloading}
          >
            {isReloading ? 'Reloading...' : 'Reload File'}
          </Button>

          <Button
            variant="outlined"
            onClick={onChooseFile}
            fullWidth
            sx={{ mb: 1 }}
            startIcon={<FolderOpen />}
          >
            Choose Different File
          </Button>
        </>
      )}

      {/* Recent Files dropdown */}
      {recentFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} sx={{ mb: 0.5, alignItems: 'center' }}>
            <History sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Recent Files
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Typography
                component="label"
                htmlFor="recent-files-select"
                variant="caption"
                sx={{ position: 'absolute', top: -8, left: 12, zIndex: 1, bgcolor: 'background.paper', px: 0.5, color: 'text.secondary' }}
              >
                Switch file
              </Typography>
              <select
                id="recent-files-select"
                value={activeFileName}
                onChange={(e) => {
                  const selected = recentFiles.find((f) => f.name === e.target.value);
                  if (selected) onSelectRecentFile(selected);
                }}
                style={{
                  width: '100%',
                  padding: '16.5px 14px',
                  fontSize: 14,
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.23)',
                  borderRadius: 4,
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'inherit',
                  appearance: 'auto',
                }}
              >
                {recentFiles.map((file) => (
                  <option key={file.name} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                const selected = recentFiles.find((f) => f.name === activeFileName);
                if (selected) onRemoveRecentFile(selected.name);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Schema validation warning */}
      {schemaWarning && (
        <Alert severity="warning" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Your file may be outdated
          </Typography>
          {schemaWarning.missingColumns.length > 0 && (
            <Typography variant="body2">
              Missing columns: <strong>{schemaWarning.missingColumns.join(', ')}</strong>
            </Typography>
          )}
          {schemaWarning.extraColumns.length > 0 && (
            <Typography variant="body2">
              Unrecognized columns: {schemaWarning.extraColumns.join(', ')}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Download the latest template and re-save your file to fix this.
          </Typography>
        </Alert>
      )}

      {/* Fallback: manual file input */}
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button variant="text" component="span" fullWidth sx={{ mb: 2 }} startIcon={<Upload />} size="small">
          Upload Manually (no auto-reload)
        </Button>
      </label>

      <Divider sx={{ mb: 2 }} />



      {/* Range filter */}
      <TextField
        label="Range Filter (e.g., 1-5, 8, 10-12)"
        variant="outlined"
        fullWidth
        value={rangeFilter}
        onChange={(e) => onRangeFilterChange(e.target.value)}
        margin="normal"
        size="small"
      />

      {/* Action buttons */}
      <Button variant="contained" onClick={onStartLogin} fullWidth sx={{ mt: 2 }}>
        Start Login Automation
      </Button>

      <Button variant="contained" color="error" onClick={onStopLogin} fullWidth sx={{ mt: 1 }}>
        Stop Login
      </Button>

      {loginProgress.active && loginProgress.total > 0 && (
        <Typography variant="body1" align="center" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
          #{loginProgress.current} of {loginProgress.total}
        </Typography>
      )}
    </Box>
  );
}
