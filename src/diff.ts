import _ from 'lodash';
import { LeanCloudClient } from './leancloud-client';
import { LocalSchema } from './schema';
import { CreateClassTask, Task } from './task';

export async function diff(
  localSchemas: LocalSchema[],
  lcClient: LeanCloudClient
) {
  const tasks: Task[] = [];
  await checkMissingClass(tasks, localSchemas, lcClient);
  return tasks;
}

async function checkMissingClass(
  tasks: Task[],
  localSchemas: LocalSchema[],
  lcClient: LeanCloudClient
) {
  const remoteClassList = await lcClient.getClassList();
  const remoteClassByName = _.keyBy(remoteClassList, (c) => c.name);
  for (const { classSchema } of localSchemas) {
    const remoteSchema = remoteClassByName[classSchema.name];
    if (remoteSchema) {
      // TODO: check class type conflict
    } else {
      tasks.push(new CreateClassTask(lcClient, classSchema));
    }
  }
}
