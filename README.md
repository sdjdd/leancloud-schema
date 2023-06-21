# LeanCloud Schema

## Install

```sh
npm i -g leancloud-schema
```

## Usage

### Pull

```sh
leancloud-schema pull \
  --console https://console.example.com \
  --token access_token \
  --app app_id \
  --dir schemas
```

### Push

```sh
leancloud-schema push 'schemas/*.json' \
  --console https://console.example.com \
  --token access_token \
  --app app_id
```
