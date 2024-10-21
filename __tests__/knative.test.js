const fs = require('node:fs/promises')
const { expect } = require('@jest/globals')
const {
  readManifest,
  updateContainer,
  addEnvToContainer
} = require('../src/knative')

describe('readManifest()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const readFileMock = jest.spyOn(fs, 'readFile').mockImplementation()

  it('replaces the env vars and parses YAML', async () => {
    const fakeEnv = {
      MY_NAME: 'my-test-app',
      MY_LOCATION_ENV: 'eu-west4'
    }
    readFileMock.mockImplementation(() => {
      return `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: \${MY_NAME}
  labels:
    cloud.googleapis.com/location: \${MY_LOCATION_ENV}
spec:
  template:
    spec:
      containers:
        - name: \${MY_NAME}
          image: my-image
`
    })

    expect(await readManifest('my-file.yaml', fakeEnv)).toEqual({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      metadata: {
        name: fakeEnv.MY_NAME,
        labels: {
          'cloud.googleapis.com/location': fakeEnv.MY_LOCATION_ENV
        }
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: fakeEnv.MY_NAME,
                image: 'my-image'
              }
            ]
          }
        }
      }
    })
  })
})

describe('addEnvToContainer()', () => {
  it('keeps existing env intact', () => {
    const container = {
      name: 'my-test-app',
      image: 'my-test-image',
      env: [
        { name: 'MY_TEST_ENV', value: 'foo' },
        {
          name: 'MY_SUPER_SECRET',
          valueFrom: {
            secretKeyRef: {
              key: 'latest',
              name: 'MY_SUPER_SECRET'
            }
          }
        }
      ]
    }

    const envVars = {
      FOO: 'bar'
    }

    const result = addEnvToContainer(container, envVars)

    expect(result.env).toContainEqual({ name: 'MY_TEST_ENV', value: 'foo' })
    expect(result.env).toContainEqual({
      name: 'MY_SUPER_SECRET',
      valueFrom: {
        secretKeyRef: {
          key: 'latest',
          name: 'MY_SUPER_SECRET'
        }
      }
    })
    expect(result.env).toContainEqual({ name: 'FOO', value: 'bar' })
  })

  it('handles non existant env', () => {
    const container = {
      name: 'my-test-app',
      image: 'my-test-image'
    }

    const envVars = {
      FOO: 'bar'
    }

    const result = addEnvToContainer(container, envVars)

    expect(result.env).toContainEqual({ name: 'FOO', value: 'bar' })
  })
})

describe('updateContainer()', () => {
  describe('kind: Service', () => {
    it('throws when incomplete manifest', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service'
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.containers'`
      )
    })

    it('throws when there are no containers', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        spec: {
          template: {
            spec: {
              containers: []
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.containers'`
      )
    })

    it('throws when the given container cannot be found', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `Could not find 'foo' in 'spec.template.spec.containers'`
      )
    })

    it('creates a new manifest with the updated container', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      const newManifest = updateContainer(manifest, 'my-app', container => ({
        ...container,
        name: 'foo'
      }))

      expect(newManifest.spec.template.spec.containers[0].name).toEqual('foo')
    })
  })

  describe('kind: Job', () => {
    it('throws when incomplete manifest', () => {
      const manifest = {
        apiVersion: 'run.googleapis.com/v1',
        kind: 'Job'
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.template.spec.containers'`
      )
    })

    it('throws when there are no containers', () => {
      const manifest = {
        apiVersion: 'run.googleapis.com/v1',
        kind: 'Job',
        spec: {
          template: {
            spec: {
              taskCount: 1,
              template: {
                spec: {
                  containers: []
                }
              }
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `No containers found in 'spec.template.spec.template.spec.containers'`
      )
    })

    it('throws when the given container cannot be found', () => {
      const manifest = {
        apiVersion: 'run.googleapis.com/v1',
        kind: 'Job',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              taskCount: 1,
              template: {
                spec: {
                  containers: [
                    {
                      name: 'my-test-job',
                      image: 'my-image',
                      resources: {
                        limits: {
                          cpu: '1000m',
                          memory: '512Mi'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }

      expect(() => updateContainer(manifest, 'foo', () => {})).toThrow(
        `Could not find 'foo' in 'spec.template.spec.template.spec.containers'`
      )
    })

    it('creates a new manifest with the updated container', () => {
      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'my-app',
          labels: {
            'cloud.googleapis.com/location': 'us-east1'
          }
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'my-app',
                  image: 'my-image',
                  ports: [{ name: 'http1', containerPort: 8080 }]
                }
              ]
            }
          }
        }
      }

      const newManifest = updateContainer(manifest, 'my-app', container => ({
        ...container,
        name: 'foo'
      }))

      expect(newManifest.spec.template.spec.containers[0].name).toEqual('foo')
    })
  })

  it('throws when unknown manifest', () => {
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      spec: {
        replicas: 3,
        template: {
          spec: {
            containers: [{ name: 'nginx', image: 'nginx:latest' }]
          }
        }
      }
    }

    expect(() => updateContainer(manifest, '', () => {})).toThrow(
      'Unsupported manifest for apiVersion: apps/v1 and kind: Deployment'
    )
  })
})
