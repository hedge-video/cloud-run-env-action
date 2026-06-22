import os from 'node:os'
import path from 'node:path'
import * as core from '@actions/core'
import * as knative from './knative.js'
import * as environment from './env.js'

/**
 * @param {string} outputFile
 * @param {string} inputFile
 * @returns {string}
 */
function generateOutputFilePath(inputFile) {
  return path.join(os.tmpdir(), path.basename(inputFile))
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    const inputFile = core.getInput('input', { required: true })
    const envFile = core.getInput('env_file', { required: true })
    const outputFile =
      core.getInput('output') || generateOutputFilePath(inputFile)
    const containerName = core.getInput('container_name')

    const [manifest, env] = await Promise.all([
      knative.readManifest(inputFile),
      environment.parse(envFile)
    ])

    const updatedManifest = knative.updateContainer(
      manifest,
      containerName,
      container => knative.addEnvToContainer(container, env)
    )

    core.info(`Writing updated manifest to ${outputFile}`)

    await knative.writeManifest(outputFile, updatedManifest)

    // Set outputs for other workflow steps to use
    core.setOutput('output', outputFile)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}
