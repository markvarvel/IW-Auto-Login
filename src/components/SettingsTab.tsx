import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Delete from '@mui/icons-material/Delete';
import { browserAPI } from '../utils';

export interface ExtensionSettings {
  defaultTab: number;
  showNotifications: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultTab: 0,
  showNotifications: true,
};

export { DEFAULT_SETTINGS };

interface SettingsTabProps {
  settings: ExtensionSettings;
  onSettingsChange: (settings: ExtensionSettings) => void;
}

export default function SettingsTab({ settings, onSettingsChange }: SettingsTabProps) {
  const [clearConfirm, setClearConfirm] = useState(false);

  const updateSetting = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
  ) => {
    const updated = { ...settings, [key]: value };
    onSettingsChange(updated);
    browserAPI.storage.local.set({ extensionSettings: updated });
  };

  const handleClearData = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    await browserAPI.storage.local.clear();
    window.location.reload();
  };

  return (
    <Box>
      {/* Default Tab */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Startup
      </Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Default Tab</InputLabel>
        <Select
          value={settings.defaultTab}
          label="Default Tab"
          onChange={(e) => updateSetting('defaultTab', Number(e.target.value))}
        >
          <MenuItem value={0}>Login</MenuItem>
          <MenuItem value={1}>Refresh</MenuItem>
          <MenuItem value={2}>Logs</MenuItem>
          <MenuItem value={3}>Settings</MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Automation */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Automation
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={settings.showNotifications}
            onChange={(e) => updateSetting('showNotifications', e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography variant="body2">Show notifications</Typography>
        }
        sx={{ mb: 1, ml: 0 }}
      />

      <Divider sx={{ my: 2 }} />

      {/* Danger Zone */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'error.main' }}>
        Danger Zone
      </Typography>
      <Alert severity="warning" sx={{ mb: 1 }}>
        This will remove all saved settings, login data, and recent files. You'll need to set up again.
      </Alert>
      {clearConfirm && (
        <Alert severity="error" sx={{ mb: 1 }}>
          Click again to confirm. This action cannot be undone.
        </Alert>
      )}
      <Button
        variant="outlined"
        color="error"
        fullWidth
        startIcon={<Delete />}
        onClick={handleClearData}
      >
        {clearConfirm ? 'Confirm Clear All Data' : 'Clear All Data'}
      </Button>

      <Divider sx={{ my: 2 }} />

      {/* Version Info */}
      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
        {browserAPI.runtime.getManifest().name} v{browserAPI.runtime.getManifest().version}
      </Typography>
    </Box>
  );
}
