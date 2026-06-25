/**
 * Unit tests for the action's main functionality, src/main.js
 */
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MOCKS = {
  serviceManifest: path.join(__dirname, '../__fixtures__/inputs/service.yaml'),
  jobManifest: path.join(__dirname, '../__fixtures__/inputs/job.yaml'),
  envFile: path.join(__dirname, '../__fixtures__/inputs/test.env')
}

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('for Service type', () => {
    it('writes a new manifest file as output', async () => {
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'input':
            return MOCKS.serviceManifest
          case 'env_file':
            return MOCKS.envFile
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        'output',
        expect.any(String)
      )

      const outputFile = core.setOutput.mock.calls[0][1]

      const newManifest = YAML.parse(
        await fs.readFile(outputFile, {
          encoding: 'utf8'
        })
      )

      const container = newManifest.spec.template.spec.containers[0]

      // Expect all env vars that already existed to be there
      expect(container.env).toContainEqual({
        name: 'MY_SUPER_SECRET',
        valueFrom: {
          secretKeyRef: {
            key: 'latest',
            name: 'MY_SUPER_SECRET'
          }
        }
      })
      expect(container.env).toContainEqual({
        name: 'MY_APP_SPECIFIC_VARIABLE',
        value: 'foo'
      })

      const expectedEnvVars = [
        'BASIC',
        'AFTER_LINE',
        'EMPTY',
        'SINGLE_QUOTES',
        'SINGLE_QUOTES_SPACED',
        'DOUBLE_QUOTES',
        'DOUBLE_QUOTES_SPACED',
        'EXPAND_NEWLINES',
        'DONT_EXPAND_UNQUOTED',
        'DONT_EXPAND_SQUOTED',
        'EQUAL_SIGNS',
        'RETAIN_INNER_QUOTES',
        'RETAIN_INNER_QUOTES_AS_STRING',
        'TRIM_SPACE_FROM_UNQUOTED',
        'USERNAME',
        'SPACED_KEY',
        'MULTI_DOUBLE_QUOTED',
        'MULTI_SINGLE_QUOTED',
        'MULTI_BACKTICKED',
        'MULTI_PEM_DOUBLE_QUOTED'
      ]

      for (const envVar of expectedEnvVars) {
        expect(container.env).toContainEqual({
          name: envVar,
          value: expect.any(String)
        })
      }
    })

    it('allows for passing `output` input', async () => {
      const outputFile = path.join(os.tmpdir(), `service-${Date.now()}.yaml`)

      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'input':
            return MOCKS.serviceManifest
          case 'env_file':
            return MOCKS.envFile
          case 'output':
            return outputFile
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()

      // Check if the file exists
      expect(await fs.stat(outputFile)).not.toBeNull()
    })
  })

  describe('for Job type', () => {
    it('writes a new manifest file as output', async () => {
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'input':
            return MOCKS.jobManifest
          case 'env_file':
            return MOCKS.envFile
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        'output',
        expect.any(String)
      )

      const outputFile = core.setOutput.mock.calls[0][1]

      const newManifest = YAML.parse(
        await fs.readFile(outputFile, {
          encoding: 'utf8'
        })
      )

      const container =
        newManifest.spec.template.spec.template.spec.containers[0]

      // Expect all env vars that already existed to be there
      expect(container.env).toContainEqual({
        name: 'MY_SUPER_SECRET',
        valueFrom: {
          secretKeyRef: {
            key: 'latest',
            name: 'MY_SUPER_SECRET'
          }
        }
      })
      expect(container.env).toContainEqual({
        name: 'MY_APP_SPECIFIC_VARIABLE',
        value: 'foo'
      })

      const expectedEnvVars = [
        'BASIC',
        'AFTER_LINE',
        'EMPTY',
        'SINGLE_QUOTES',
        'SINGLE_QUOTES_SPACED',
        'DOUBLE_QUOTES',
        'DOUBLE_QUOTES_SPACED',
        'EXPAND_NEWLINES',
        'DONT_EXPAND_UNQUOTED',
        'DONT_EXPAND_SQUOTED',
        'EQUAL_SIGNS',
        'RETAIN_INNER_QUOTES',
        'RETAIN_INNER_QUOTES_AS_STRING',
        'TRIM_SPACE_FROM_UNQUOTED',
        'USERNAME',
        'SPACED_KEY',
        'MULTI_DOUBLE_QUOTED',
        'MULTI_SINGLE_QUOTED',
        'MULTI_BACKTICKED',
        'MULTI_PEM_DOUBLE_QUOTED'
      ]

      for (const envVar of expectedEnvVars) {
        expect(container.env).toContainEqual({
          name: envVar,
          value: expect.any(String)
        })
      }
    })

    it('allows for passing `output` input', async () => {
      const outputFile = path.join(os.tmpdir(), `job-${Date.now()}.yaml`)

      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'input':
            return MOCKS.jobManifest
          case 'env_file':
            return MOCKS.envFile
          case 'output':
            return outputFile
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()

      // Check if the file exists
      expect(() => fs.stat(outputFile)).not.toThrow()
    })
  })

  describe('env vars', () => {
    let envBefore

    beforeEach(() => {
      envBefore = process.env

      process.env.MANIFEST_LOCATION = 'asia-east2'
      process.env.MANIFEST_SERVICE_ACCOUNT = 'service@example.org'
      process.env.MANIFEST_IMAGE = 'my-image:lts'
      process.env.MANIFEST_INJECTED_VARIABLE = 'foobar'
    })

    afterEach(() => {
      process.env = envBefore
    })

    it('should replace all env vars before parsing', async () => {
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'input':
            return MOCKS.serviceManifest
          case 'env_file':
            return path.join(
              __dirname,
              '../__fixtures__/inputs/test-with-env.env'
            )
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        'output',
        expect.any(String)
      )

      const outputFile = core.setOutput.mock.calls[0][1]

      const newManifest = YAML.parse(
        await fs.readFile(outputFile, {
          encoding: 'utf8'
        })
      )

      const container = newManifest.spec.template.spec.containers[0]

      // Location label
      expect(
        newManifest.metadata.labels['cloud.googleapis.com/location']
      ).not.toBe('${MANIFEST_LOCATION}')
      expect(newManifest.metadata.labels['cloud.googleapis.com/location']).toBe(
        'asia-east2'
      )

      // Service account
      expect(newManifest.spec.template.spec.serviceAccountName).not.toBe(
        '${MANIFEST_SERVICE_ACCOUNT}'
      )
      expect(newManifest.spec.template.spec.serviceAccountName).toBe(
        'service@example.org'
      )

      // Env var
      expect(container.env).toContainEqual({
        name: 'MY_APP_INJECTED_VARIABLE',
        value: 'foobar'
      })

      // Leaves env vars from env_file intact
      expect(container.env).toContainEqual({
        name: 'ANOTHER_ENV',
        value: 'foobar'
      })
      expect(container.env).toContainEqual({
        name: 'ENV_WITH_BRACKETS',
        value: '${ANOTHER_ENV}'
      })
      expect(container.env).toContainEqual({
        name: 'ENV_WITH_DOLLAR_SIGN',
        value: '$ANOTHER_ENV'
      })
    })
  })

  it('sets a failed status when manifest reading fails', async () => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'input':
          return 'unknown-file.yaml'
        case 'env_file':
          return MOCKS.envFile
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      `ENOENT: no such file or directory, open 'unknown-file.yaml'`
    )
  })

  it('sets a failed status when env file does not exist', async () => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'input':
          return MOCKS.serviceManifest
        case 'env_file':
          return 'unknown.env'
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      `ENOENT: no such file or directory, open 'unknown.env'`
    )
  })

  it('sets a failed status when no matching container exists', async () => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'input':
          return MOCKS.serviceManifest
        case 'container_name':
          return 'unknown'
        case 'env_file':
          return MOCKS.envFile
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      `Could not find 'unknown' in 'spec.template.spec.containers'`
    )
  })

  const requiredFields = ['input', 'env_file', 'output']

  for (const field of requiredFields) {
    it(`fails if no '${field}' is provided`, async () => {
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case field:
            throw new Error(`Input required and not supplied: ${field}`)
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenNthCalledWith(
        1,
        `Input required and not supplied: ${field}`
      )
    })
  }
})
