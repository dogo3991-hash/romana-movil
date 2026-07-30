const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins')

// La app no soporta tema oscuro en ninguna pantalla (todo el UI usa
// colores claros fijos). El tema nativo de Android por defecto es
// DayNight, lo que hace que dialogos nativos (ej. el popup del Picker
// de "Seleccionar") se pinten oscuros cuando el sistema está en modo
// oscuro, quedando ilegibles junto al texto oscuro fijo del JS.
module.exports = function withAndroidLightTheme(config) {
  return withAndroidStyles(config, (config) => {
    const appTheme = AndroidConfig.Styles.getStyleParent(
      config.modResults,
      AndroidConfig.Styles.getAppThemeGroup()
    )
    if (appTheme) {
      appTheme.$.parent = 'Theme.AppCompat.Light.NoActionBar'
    }
    return config
  })
}
