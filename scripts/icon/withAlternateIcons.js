const fs = require('node:fs');
const path = require('node:path');
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');

const names = ['NoorCrescent', 'NoorArch', 'NoorOlive'];

module.exports = function withAlternateIcons(config) {
  return withXcodeProject(config, async config => {
    const { modResults: project, modRequest } = config;
    const catalog = path.join(modRequest.platformProjectRoot, modRequest.projectName, 'Images.xcassets');
    for (const name of names) {
      const directory = path.join(catalog, `${name}.appiconset`);
      await fs.promises.mkdir(directory, { recursive: true });
      await fs.promises.copyFile(path.join(modRequest.projectRoot, 'assets', `${name}.png`),
        path.join(directory, 'Icon.png'));
      await fs.promises.writeFile(path.join(directory, 'Contents.json'), JSON.stringify({
        images: [{ filename: 'Icon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'xcode', version: 1 },
      }, null, 2));
    }

    const { target } = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName: modRequest.projectName });
    const configurationList = project.pbxXCConfigurationList()[target.buildConfigurationList];
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const { value } of configurationList.buildConfigurations) {
      configurations[value].buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = `"${names.join(' ')}"`;
    }
    return config;
  });
};
