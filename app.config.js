// Config dinâmica do Expo. O `app.json` continua sendo a fonte da verdade (é
// carregado e entregue aqui em `config`); este arquivo só ajusta UMA coisa por
// plataforma de build.
//
// Ícones dinâmicos (recurso de "trocar o ícone do app"): valem só no iOS, que
// permite ícones alternativos. No Android o plugin `expo-dynamic-app-icon` cria
// activity-aliases com intent-filter de LAUNCHER para cada ícone — e o scanner do
// Google Play interpreta isso como "ícone instalado diferente do da loja"
// (política de declarações enganosas). Por isso, REMOVEMOS o plugin apenas quando
// o EAS está compilando o binário Android. iOS, OTA (`eas update`) e dev local
// mantêm o recurso intacto.
module.exports = ({ config }) => {
  const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === 'android';
  if (isAndroidBuild) {
    config.plugins = (config.plugins || []).filter((plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return name !== 'expo-dynamic-app-icon';
    });
  }
  return config;
};
