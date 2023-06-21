#!/usr/bin/env node

import fs from 'node:fs';
import pfs from 'node:fs/promises';
import path from 'node:path';
import { program } from 'commander';
import { glob } from 'glob';
import axios from 'axios';
import 'dotenv/config';

import { format, parseJsonSchema } from './schema-file';
import { LeanCloudClient } from './leancloud-client';
import { ClassSchema } from './schema';
import { difference } from './difference';
import { createTask } from './task';

program
  .option('--console <string>', 'leancloud console url')
  .option('--app <string>', 'app id')
  .option('--token <string>', 'access token');

program
  .command('pull')
  .argument('[class_names...]')
  .requiredOption('--dir <string>', 'output directory')
  .action(pull);

program
  .command('push')
  .argument('<schema_files...>', 'schema files')
  .option('--dry-run')
  .action(push);

program.parse();

interface ProgramOptions {
  consoleUrl: string;
  appId: string;
  accessToken: string;
}

function getProgramOptions(): ProgramOptions {
  const options = program.optsWithGlobals();
  const { LEANCLOUD_CONSOLE_URL, LEANCLOUD_APP_ID, LEANCLOUD_ACCESS_TOKEN } =
    process.env;

  const consoleUrl = options.console || LEANCLOUD_CONSOLE_URL;
  if (!consoleUrl) {
    exit('no console url provided');
  }
  const appId = options.app || LEANCLOUD_APP_ID;
  if (!consoleUrl) {
    exit('no app id provided');
  }
  const accessToken = options.token || LEANCLOUD_ACCESS_TOKEN;
  if (!accessToken) {
    exit('no access token provided');
  }

  return { consoleUrl, appId, accessToken };
}

async function pull(classNames: string[], options: any) {
  const { consoleUrl, appId, accessToken } = getProgramOptions();
  const dir = options.dir;

  const httpClient = createHttpClient(consoleUrl, accessToken);
  const lcClient = new LeanCloudClient(httpClient, appId);

  if (classNames.length === 0) {
    const classList = await lcClient.getClassList();
    classNames = classList.map((item) => item.name);
  }

  const classSchemas: ClassSchema[] = [];

  for (const className of classNames) {
    try {
      const localSchema = await lcClient.getClassSchema(className);
      classSchemas.push(localSchema);
    } catch (e) {
      console.error(`Fetch class ${className} failed.`);
      if (axios.isAxiosError(e) && e.response?.data) {
        console.error(e.response.data);
      } else {
        console.error(e);
      }
      process.exit(1);
    }
  }

  createDir(dir);

  for (const schema of classSchemas) {
    const json = format(schema);
    const content = JSON.stringify(json, null, '  ');
    const filePath = path.resolve(dir, `${schema.name}.json`);
    await pfs.writeFile(filePath, content);
  }
}

async function push(schemaFiles: string[], options: any) {
  const { consoleUrl, appId, accessToken } = getProgramOptions();

  let paths = await glob(schemaFiles, {
    nodir: true,
    withFileTypes: true,
  });

  if (paths.length === 0) {
    console.error('no file matched');
    process.exit(1);
  }

  paths = paths.filter((path) => {
    const isInternalClass = path.name.startsWith('_');
    if (isInternalClass && path.name !== '_User.json') {
      console.error(`${path.fullpath()}: internal class not supported yet`);
      return false;
    }
    return true;
  });

  const schemas: ClassSchema[] = [];
  for (const path of paths) {
    const content = await pfs.readFile(path.fullpath(), 'utf-8');
    try {
      const json = JSON.parse(content);
      schemas.push(parseJsonSchema(json, removeExt(path.name)));
    } catch (e) {
      console.error(`read ${path.fullpath()} failed`);
      console.error(e);
      process.exit(1);
    }
  }

  schemas.sort((a, b) => (a.name > b.name ? 1 : -1));

  const httpClient = createHttpClient(consoleUrl, accessToken);
  const lcClient = new LeanCloudClient(httpClient, appId);

  const { conflicts, differences } = await difference(lcClient, schemas);

  if (conflicts.length) {
    console.error('has conflicts:');
    conflicts.forEach((conflict) => console.log(conflict));
    process.exit(1);
  }

  for (const difference of differences) {
    console.dir(difference, { depth: 5 });

    if (options.dryRun) {
      continue;
    }

    const task = createTask(difference);
    try {
      await task.run(lcClient);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error(e.response?.data);
      } else {
        console.error(e);
      }
    }
  }
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
  return axios.create({
    baseURL: consoleUrl,
    headers: {
      Authorization: `Token ${accessToken}`,
      Cookie: 'XSRF-TOKEN=None',
      'X-XSRF-Token': 'None',
    },
  });
}

function createDir(path: string) {
  if (fs.existsSync(path)) {
    if (fs.statSync(path).isFile()) {
      exit(`${path} is file`);
    }
  } else {
    fs.mkdirSync(path, { recursive: true });
  }
}
