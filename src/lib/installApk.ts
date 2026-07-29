import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'

const FLAG_GRANT_READ_URI_PERMISSION = 1

// Descarga el .apk del release e invoca el instalador de paquetes de Android.
// Requiere que el usuario haya habilitado "Instalar apps desconocidas" para
// esta app (Android lo pide solo la primera vez).
export async function downloadAndInstallApk(
  apkUrl: string,
  onProgress?: (fraction: number) => void
): Promise<void> {
  const destination = `${FileSystem.cacheDirectory}update.apk`

  const downloadResumable = FileSystem.createDownloadResumable(
    apkUrl,
    destination,
    {},
    (progress) => {
      if (onProgress && progress.totalBytesExpectedToWrite > 0) {
        onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite)
      }
    }
  )

  const result = await downloadResumable.downloadAsync()
  if (!result) throw new Error('No se pudo descargar la actualización')

  const contentUri = await FileSystem.getContentUriAsync(result.uri)

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: 'application/vnd.android.package-archive'
  })
}
