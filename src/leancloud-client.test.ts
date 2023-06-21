import axios from 'axios';
import { LeanCloudClient } from './leancloud-client';

const http = axios.create();
const LC = new LeanCloudClient(http, 'APP_ID');

afterEach(() => {
  jest.restoreAllMocks();
});

test('getClassList', async () => {
  const httpGet = jest.spyOn(http, 'get').mockResolvedValue({
    data: [
      {
        name: 'Test',
        'class-type': 'normal',
      },
      {
        name: 'TestLog',
        'class-type': 'log',
      },
    ],
  });
  const classList = await LC.getClassList();
  expect(httpGet).toBeCalledWith(`/1.1/data/${LC.appId}/classes`);
  expect(classList).toStrictEqual([
    {
      name: 'Test',
      type: 'normal',
    },
    {
      name: 'TestLog',
      type: 'log',
    },
  ]);
});

test('createClass', async () => {
  const httpPost = jest.spyOn(http, 'post').mockResolvedValue({});
  await LC.createClass({
    name: 'Test',
    type: 'normal',
    schema: {},
    permissions: {
      add_fields: { roles: [], users: [] },
      create: { onlySignInUsers: true },
      delete: { '*': true },
      update: { '*': true },
      find: { '*': true },
      get: { '*': true },
    },
    indexes: [],
  });
  expect(httpPost).toBeCalledWith(`/1.1/data/${LC.appId}/classes`, {
    class_name: 'Test',
    class_type: 'normal',
    permissions: {
      add_fields: { roles: [], users: [] },
      create: { onlySignInUsers: true },
      delete: { '*': true },
      update: { '*': true },
      find: { '*': true },
      get: { '*': true },
    },
  });
});

test('updateClassPermissions', async () => {
  const httpPut = jest.spyOn(http, 'put').mockResolvedValue({});
  await LC.updateClassPermissions('Test', {
    add_fields: { roles: [], users: [] },
    create: { onlySignInUsers: true },
    delete: { roles: ['admin'], users: [] },
    update: { '*': true },
    find: { '*': true },
    get: { '*': true },
  });
  expect(httpPut).toBeCalledWith(
    `/1.1/data/${LC.appId}/classes/Test/permissions`,
    {
      permissions: {
        add_fields: { roles: [], users: [] },
        create: { onlySignInUsers: true },
        delete: { roles: ['admin'], users: [] },
        update: { '*': true },
        find: { '*': true },
        get: { '*': true },
      },
    }
  );
});

test('updateClassDefaultACL', async () => {
  const httpPut = jest.spyOn(http, 'put').mockResolvedValue({});
  await LC.updateClassDefaultACL('Test', {
    _owner: { read: true, write: true },
  });
  expect(httpPut).toBeCalledWith(
    `/1.1/data/${LC.appId}/classes/Test/columns/ACL`,
    {
      claid: 'Test',
      id: 'ACL',
      default: '{"_owner":{"read":true,"write":true}}',
    }
  );
});

test('updateColumn', async () => {
  const httpPut = jest.spyOn(http, 'put').mockResolvedValue({});
  await LC.updateColumn('Test', {
    name: 'COLUMN',
    type: 'String',
    hidden: true,
    read_only: true,
    required: true,
    comment: 'COMMENT',
    default: 'DEFAULT',
  });
  expect(httpPut).toBeCalledWith(
    `/1.1/data/${LC.appId}/classes/Test/columns/COLUMN`,
    {
      claid: 'Test',
      hidden: true,
      read_only: true,
      required: true,
      comment: 'COMMENT',
      default: 'DEFAULT',
    }
  );
});
