# ✨ Cloud Run .env Action

Deploying multiple apps with shared environment variables can be tedious to
manage. This GitHub Action should help relieve some of the pains by:

- Easily managing env variables using `.env` files
- Substitutes environment variables used within the manifest

---

- [Usage](#usage)
- [Examples](#examples)
- [Customizing](#customizing)
  - [inputs](#inputs)
  - [outputs](#outputs)
- [Contributing](#contributing)

## Usage

```yml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate service declaration
        id: app_manifest
        uses: hedge-video/cloud-run-env-action@v0.1.0
        with:
          input: ./deploy/production-app.yaml
          env_file: ./deploy/production.env

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: ${{ steps.app_manifest.outputs.output }}
```

## Examples

### Deploy multiple apps using same env file

<details>
  <summary>`app.yaml`</summary>

```yaml
# app.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-test-app
  labels:
    cloud.googleapis.com/location: us-east1
spec:
  template:
    spec:
      containers:
        - name: my-test-app
          image: my-image
          ports:
            - name: http1
              containerPort: 8080
```

</details>

<details>
  <summary>`scheduler.yaml`</summary>

```yaml
# scheduler.yaml
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: my-test-schedulder
  labels:
    cloud.googleapis.com/location: us-east1
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
    spec:
      taskCount: 1
      template:
        spec:
          containers:
            - name: my-test-schedulder
              image: my-image
              command: ./scheduler --limit 50
```

</details>

<details>
  <summary>`production.env`</summary>

```env
APP_URL=https://localhost
LOG_LEVEL=info

MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=sendgrid_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_NAME="John Smith"
MAIL_FROM_ADDRESS=from@example.com
```

</details>

```yml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate app declaration
        id: app_manifest
        uses: hedge-video/cloud-run-env-action@v0.1.0
        with:
          input: ./app.yaml
          env_file: ./production.env

      - name: Generate job declaration
        id: scheduler_manifest
        uses: hedge-video/cloud-run-env-action@v0.1.0
        with:
          input: ./scheduler.yaml
          env_file: ./production.env

      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: ${{ steps.app_manifest.outputs.output }}

      - name: Deploy scheduler to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: ${{ steps.scheduler_manifest.outputs.output }}
```

### Using env var substitution

<details>
  <summary>`app.yaml`</summary>

```yaml
# app.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${APP_NAME}
  labels:
    cloud.googleapis.com/location: ${APP_LOCATION}
spec:
  template:
    spec:
      containers:
        - name: ${APP_NAME}
          image: ${APP_IMAGE}
          ports:
            - name: http1
              containerPort: 8080
```

</details>

```yml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate app declaration
        id: app-manifest
        uses: hedge-video/cloud-run-env-action@v0.1.0
        env:
          APP_NAME: ${{ vars.APP_NAME }}
          APP_LOCATION: ${{ vars.APP_LOCATION }}
          # Could be the output from the image build step
          APP_IMAGE: ${{ vars.APP_IMAGE }}
        with:
          input: ./app.yaml
          env_file: ./production.env

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: ${{ vars.APP_LOCATION }}
          metadata: ${{ steps.app_manifest.outputs.output }}
```

### Multi container apps

<details>
  <summary>`app.yaml`</summary>

```yaml
# app.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-test-app
  labels:
    cloud.googleapis.com/location: ${APP_LOCATION}
spec:
  template:
    spec:
      containers:
        # Nginx container
        - name: nginx
          image: nginx
          ports:
            - name: http1
              containerPort: 8080

        # Application container
        - name: my-test-app
          image: my-image
          env:
            - name: PORT
              value: '8888'
```

</details>

```yml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate app declaration
        id: app_manifest
        uses: hedge-video/cloud-run-env-action@v0.1.0
        with:
          input: ./app.yaml
          container_name: my-test-app
          env_file: ./production.env

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: ${{ vars.APP_LOCATION }}
          metadata: ${{ steps.app_manifest.outputs.output }}
```

## Customizing

### inputs

The following inputs can be used as `step.with` keys:

| Name             | Type     | Required? | Description                                                                 |
| ---------------- | -------- | --------- | --------------------------------------------------------------------------- |
| `input`          | `String` | Yes       | The input path of the Cloud Run YAML file (e.g. `./app.yaml`)               |
| `env_file`       | `String` | Yes       | The path to the `.env` file                                                 |
| `output`         | `String` | No        | The output path of the generated Cloud Run YAML file (e.g. `/tmp/app.yaml`) |
| `container_name` | `String` | No        | The name of the target container, by default we take the first container    |

### outputs

| Name     | Type     | Description                                                                      |
| -------- | -------- | -------------------------------------------------------------------------------- |
| `output` | `String` | The output path to the newly generated manifest YAML file (e.g. `/tmp/app.yaml`) |

## Contributing

Want to contribute? Awesome! You can find information about contributing to this
project in the [CONTRIBUTING.md](/.github/CONTRIBUTING.md)
