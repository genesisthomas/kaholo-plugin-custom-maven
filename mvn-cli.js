const { docker } = require("@kaholo/plugin-library");
const { join: joinPaths } = require("path");
const { homedir: getHomeDirectory } = require("os");
const {
  exec,
  assertPathExistence,
} = require("./helpers");
const {
  MAVEN_CLI_NAME,
  MAVEN_CACHE_DIRECTORY_NAME,
} = require("./consts.json");

async function execute({ customImage, command, workingDirectory }) {
  const dockerCommandBuildOptions = {
    command: docker.sanitizeCommand(command, MAVEN_CLI_NAME),
    image: customImage,
  };

  const mavenAgentCachePath = joinPaths(getHomeDirectory(), MAVEN_CACHE_DIRECTORY_NAME);
  const mavenCacheVolumeDefinition = docker.createVolumeDefinition(mavenAgentCachePath);
  // Change mount point to maven cache path
  mavenCacheVolumeDefinition.mountPoint.value = joinPaths("/root", MAVEN_CACHE_DIRECTORY_NAME);

  const dockerEnvironmentalVariables = {
    [mavenCacheVolumeDefinition.mountPoint.name]: mavenCacheVolumeDefinition.mountPoint.value,
  };
  let shellEnvironmentalVariables = {
    ...dockerEnvironmentalVariables,
    [mavenCacheVolumeDefinition.path.name]: mavenCacheVolumeDefinition.path.value,
  };

  const volumeDefinitionsArray = [mavenCacheVolumeDefinition];

  if (workingDirectory) {
    await assertPathExistence(workingDirectory);
    const workingDirectoryVolumeDefinition = docker.createVolumeDefinition(workingDirectory);

    dockerEnvironmentalVariables[workingDirectoryVolumeDefinition.mountPoint.name] = (
      workingDirectoryVolumeDefinition.mountPoint.value
    );

    shellEnvironmentalVariables = {
      ...shellEnvironmentalVariables,
      ...dockerEnvironmentalVariables,
      [workingDirectoryVolumeDefinition.path.name]: workingDirectoryVolumeDefinition.path.value,
    };

    volumeDefinitionsArray.push(workingDirectoryVolumeDefinition);
    dockerCommandBuildOptions.workingDirectory = workingDirectoryVolumeDefinition.mountPoint.value;
  }

  dockerCommandBuildOptions.volumeDefinitionsArray = volumeDefinitionsArray;
  dockerCommandBuildOptions.environmentVariables = dockerEnvironmentalVariables;

  const dockerCommand = docker.buildDockerCommand(dockerCommandBuildOptions);

  const { stdout, stderr } = await exec(dockerCommand, { env: shellEnvironmentalVariables });
  if (stderr) {
    console.error(stderr);
  }

  return stdout;
}


module.exports = {
  execute,
};
