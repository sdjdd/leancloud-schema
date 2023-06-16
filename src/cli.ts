import fs from 'node:fs/promises';
import { program } from 'commander';
import { glob } from 'glob';
import { create as createAxiosInstance } from 'axios';
import 'dotenv/config';
import { LocalSchema } from './schema';
import { parseJsonSchema } from './json-schema';
import { LeanCloudClient } from './leancloud-client';
import { diff } from './diff';

program
  .command('push')
  .argument('<schema_files...>', 'schema files')
  .requiredOption('--console <string>', 'leancloud console url')
  .requiredOption('--app <string>', 'app id')
  .option('--token <string>', 'access token')
  .option('--dry-run')
  .action(push);

program.parse();

async function push(schemaFiles: string[], options: Record<string, string>) {
  const accessToken = options.token || process.env.LEANCLOUD_ACCESS_TOKEN;
  if (!accessToken) {
    exit('no access token provided');
  }

  const paths = await glob(schemaFiles, {
    nodir: true,
    withFileTypes: true,
  });

  if (paths.length === 0) {
    console.error('no file matched');
    process.exit(1);
  }

  const schemas: LocalSchema[] = [];
  for (const path of paths) {
    const content = await fs.readFile(path.fullpath(), 'utf-8');
    try {
      const json = JSON.parse(content);
      schemas.push(parseJsonSchema(json, removeExt(path.name)));
    } catch (e) {
      console.error(`read ${path.fullpath()} failed`);
      console.error(e);
      process.exit(1);
    }
  }

  // TODO: validate url
  const httpClient = createHttpClient(options.console, accessToken);
  const lcClient = new LeanCloudClient(httpClient, options.app);

  schemas.forEach((schema) => console.dir(schema, { depth: 10 }));

  const tasks = await diff(schemas, lcClient);
  console.log(tasks);
}

function exit(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function removeExt(name: string) {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex) {
    return name.slice(0, dotIndex);
  }
  return name;
}

export function createHttpClient(consoleUrl: string, accessToken: string) {
  return createAxiosInstance({
    baseURL: consoleUrl,
    headers: {
      Authorization: `Token ${accessToken}`,
      Cookie: 'XSRF-TOKEN=None',
      'X-XSRF-Token': 'None',
    },
  });
}