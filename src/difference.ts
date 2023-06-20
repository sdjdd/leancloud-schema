import _ from 'lodash';
import { Conflict } from './conflict';
import { LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema } from './loose-schema';
import {
  CreateClassTask,
  CreateColumnTask,
  Task,
  UpdateColumnTask,
} from './task';

const AUTO_CREATE_COLUMNS = ['objectId', 'ACL', 'createdAt', 'updatedAt'];

export async function difference(
  lcClient: LeanCloudClient,
  localClasses: ClassSchema[]
) {
  const tasks: Task[] = [];
  const conflicts: Conflict[] = [];

  const classList = await lcClient.getClassList();
  const existClasses: ClassSchema[] = [];

  for (const localClass of localClasses) {
    const remoteClass = classList.find((c) => c.name === localClass.name);
    if (remoteClass) {
      if (localClass.type !== remoteClass.type) {
        conflicts.push({
          type: 'ClassTypeConflict',
          className: localClass.name,
          localType: localClass.type,
          remoteType: remoteClass.type,
        });
      } else {
        existClasses.push(localClass);
      }
    } else {
      tasks.push(new CreateClassTask(localClass));
      Object.values(localClass.schema)
        .sort((a, b) => (a.name > b.name ? 1 : -1))
        .forEach((column) => {
          if (!AUTO_CREATE_COLUMNS.includes(column.name)) {
            tasks.push(new CreateColumnTask(localClass.name, column));
          }
        });
    }
  }

  for (const localClass of existClasses) {
    const remoteClass = await lcClient.getClassSchema(localClass.name);
    checkClass(tasks, conflicts, localClass, remoteClass);
  }

  return { tasks, conflicts };
}

function checkClass(
  tasks: Task[],
  conflicts: Conflict[],
  localClass: ClassSchema,
  remoteClass: ClassSchema
) {
  Object.values(localClass.schema)
    .sort((a, b) => (a.name > b.name ? 1 : -1))
    .forEach((localColumn) => {
      const remoteColumn = remoteClass.schema[localColumn.name];
      if (remoteColumn) {
        checkColumn(
          tasks,
          conflicts,
          localClass.name,
          localColumn,
          remoteColumn
        );
      } else {
        tasks.push(new CreateColumnTask(localClass.name, localColumn));
      }
    });

  return { tasks, conflicts };
}

function checkColumn(
  tasks: Task[],
  conflicts: Conflict[],
  className: string,
  localColumn: ColumnSchema,
  remoteColumn: ColumnSchema
) {
  if (localColumn.type !== remoteColumn.type) {
    conflicts.push({
      type: 'ColumnTypeConflict',
      className,
      column: localColumn.name,
      localType: localColumn.type,
      remoteType: remoteColumn.type,
    });
    return;
  }

  if (
    localColumn.type === 'Number' &&
    (localColumn.auto_increment || false) !==
      (remoteColumn.auto_increment || false)
  ) {
    conflicts.push({
      type: 'NumberColumnAutoIncrementConflict',
      className,
      column: localColumn.name,
      localAutoIncrement: localColumn.auto_increment || false,
      remoteAutoIncrement: remoteColumn.auto_increment || false,
    });
    return;
  }

  if (
    localColumn.type === 'Pointer' &&
    localColumn.className !== remoteColumn.className
  ) {
    conflicts.push({
      type: 'PointerColumnClassNameConflict',
      className,
      column: localColumn.name,
      localClassName: localColumn.className!,
      remoteClassName: remoteColumn.className!,
    });
    return;
  }

  if (!isColumnEqual(localColumn, remoteColumn)) {
    tasks.push(new UpdateColumnTask(className, localColumn));
  }
}

function isColumnEqual(c1: ColumnSchema, c2: ColumnSchema) {
  if (c1.name !== c2.name) {
    return false;
  }
  if (c1.type !== c2.type) {
    return false;
  }
  if ((c1.hidden || false) !== (c2.hidden || false)) {
    return false;
  }
  if ((c1.read_only || false) !== (c2.read_only || false)) {
    return false;
  }
  if ((c1.required || false) !== (c2.required || false)) {
    return false;
  }
  if ((c1.comment || '') !== (c2.comment || '')) {
    return false;
  }
  if ((c1.auto_increment || false) !== (c2.auto_increment || false)) {
    return false;
  }
  if (c1.className !== c2.className) {
    return false;
  }
  if ((c1.user_private || false) !== (c2.user_private || false)) {
    return false;
  }
  return _.isEqual(c1.default, c2.default);
}
