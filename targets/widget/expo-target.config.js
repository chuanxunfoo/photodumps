/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  name: 'PhotodumpsWidget',
  displayName: 'Dumplt',
  deploymentTarget: '17.0',
  icon: '../../app/assets/brand-icon.png',
  colors: {
    $accent: '#3B5BFC',
    $widgetBackground: '#00000000',
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [
        'group.com.yourname.dumpitapp.widgets',
      ],
  },
});
