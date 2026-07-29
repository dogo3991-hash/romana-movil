import * as Application from 'expo-application'
import { UPDATE_REPO_NAME, UPDATE_REPO_OWNER } from './updateConfig'

interface GithubAsset {
  name: string
  browser_download_url: string
}

interface GithubRelease {
  tag_name: string
  name: string
  body: string
  assets: GithubAsset[]
}

export interface UpdateInfo {
  version: string
  notes: string
  apkUrl: string
}

function parseVersion(tag: string): number[] {
  return tag
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
}

function isNewer(remote: string, current: string): boolean {
  const r = parseVersion(remote)
  const c = parseVersion(current)
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] ?? 0
    const cv = c[i] ?? 0
    if (rv > cv) return true
    if (rv < cv) return false
  }
  return false
}

// Igual que electron-updater en la app de escritorio, pero a mano: consulta
// el último Release público en GitHub y ofrece el .apk si hay una versión
// más nueva que la instalada.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const response = await fetch(
    `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`
  )
  if (!response.ok) return null

  const release = (await response.json()) as GithubRelease
  const currentVersion = Application.nativeApplicationVersion ?? '0.0.0'

  if (!isNewer(release.tag_name, currentVersion)) return null

  const apkAsset = release.assets.find((a) => a.name.endsWith('.apk'))
  if (!apkAsset) return null

  return {
    version: release.tag_name.replace(/^v/, ''),
    notes: release.body,
    apkUrl: apkAsset.browser_download_url
  }
}
