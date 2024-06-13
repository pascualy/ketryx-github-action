import * as core from '@actions/core';
import glob from 'glob-promise';
import { readActionInput, ActionInput } from './input';
import { ArtifactData, uploadBuild, uploadBuildArtifact } from './upload';

async function _run(): Promise<void> {
  try {
    const input = readActionInput();

    // debug is only output if the secret `ACTIONS_STEP_DEBUG` is set to true.
    core.debug(`Input: ${JSON.stringify(input)}`);

    const artifacts: ArtifactData[] = [];
    for (const pattern of input.artifactPath) {
      for (const filePath of await glob(pattern)) {
        const fileId = await uploadBuildArtifact(
          input,
          filePath,
          'application/octet-stream'
        );
        artifacts.push({ id: fileId, type: 'artifact' });
      }
    }
    for (const pattern of input.testCucumberPath) {
      for (const filePath of await glob(pattern)) {
        const fileId = await uploadBuildArtifact(input, filePath);
        artifacts.push({ id: fileId, type: 'cucumber-json' });
      }
    }
    for (const pattern of input.testJunitPath) {
      for (const filePath of await glob(pattern)) {
        const fileId = await uploadBuildArtifact(
          input,
          filePath,
          'application/xml'
        );
        artifacts.push({ id: fileId, type: 'junit-xml' });
      }
    }
    for (const pattern of input.spdxJsonPath) {
      for (const filePath of await glob(pattern)) {
        const fileId = await uploadBuildArtifact(input, filePath);
        artifacts.push({ id: fileId, type: 'spdx-json' });
      }
    }

    const buildData = await uploadBuild(input, artifacts);

    if (buildData.ok) {
      core.info(`Reported build to Ketryx: ${buildData.buildId}`);
    } else {
      core.setFailed(`Failure reporting build to Ketryx: ${buildData.error}`);
    }

    core.setOutput('ok', buildData.ok);
    core.setOutput('error', buildData.error);
    core.setOutput('build-id', buildData.buildId);
  } catch (error) {
    core.debug(`Encountered error ${error}`);
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

async function run(): Promise<void> {
  try {
    const apiKeys = core.getInput('api-key').split(',');
    const projects = core.getInput('project').split(',');
    core.debug(`Projects: ${JSON.stringify(projects)}`);
    
    if (apiKeys.length !== projects.length) {
      throw new Error('The number of api-keys must match the number of projects');
    }

    for (let i = 0; i < apiKeys.length; i++) {
      process.env['INPUT_API_KEY'] = apiKeys[i];
      process.env['INPUT_PROJECT'] = projects[i];

      await _run();
    }
  } catch (error) {
    core.debug(`Encountered error ${error}`);
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
