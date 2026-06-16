import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distManifestPath = resolve(__dirname, 'dist/manifest.json');
const srcManifestPath = resolve(__dirname, 'public/manifest.json');
const packageJsonPath = resolve(__dirname, 'package.json');

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const manifest = JSON.parse(readFileSync(srcManifestPath, 'utf-8'));
  
  // Increment patch version
  const parts = manifest.version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  manifest.version = parts.join('.');
  
  // Also update package.json
  packageJson.version = manifest.version;
  
  // Update both source and dist manifests so they stay in sync
  writeFileSync(srcManifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log(`Version bumped to ${manifest.version}`);
} catch (error) {
  console.error('Error updating version:', error);
}
