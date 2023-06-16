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

test('getClassInfo', async () => {
  const httpGet = jest.spyOn(http, 'get').mockResolvedValue({
    data: {
      name: 'Test',
      'class-type': 'normal',
      permissions: {
        add_fields: { roles: [], users: [] },
        create: { onlySignInUsers: true },
        delete: { '*': true },
        update: { '*': true },
        find: { '*': true },
        get: { '*': true },
      },
      schema: {
        objectId: {
          type: 'String',
        },
        ACL: {
          type: 'ACL',
          default: {
            '*': { read: true },
            _owner: { write: true },
          },
        },
        name: {
          type: 'String',
          hidden: false,
          read_only: true,
          required: true,
        },
        enabled: {
          type: 'Boolean',
          hidden: true,
          read_only: false,
          required: false,
          default: true,
          comment: 'Is enabled',
        },
        createdAt: {
          type: 'Date',
        },
        updatedAt: {
          type: 'Date',
        },
      },
    },
  });
  const { classSchema, columnSchemas } = await LC.getClassInfo('Test');
  expect(httpGet).toBeCalledWith(`/1.1/data/${LC.appId}/classes/Test`);
  expect(classSchema).toStrictEqual({
    name: 'Test',
    type: 'normal',
    defaultACL: {
      '*': { read: true },
      _owner: { write: true },
    },
    permissions: {
      add_fields: { roles: [], users: [] },
      create: { onlySignInUsers: true },
      delete: { '*': true },
      update: { '*': true },
      find: { '*': true },
      get: { '*': true },
    },
  });
  expect(columnSchemas).toEqual({
    objectId: {
      name: 'objectId',
      type: 'String',
      hidden: false,
      readonly: false,
      required: false,
    },
    ACL: {
      name: 'ACL',
      type: 'ACL',
      hidden: false,
      readonly: false,
      required: false,
      default: {
        '*': { read: true },
        _owner: { write: true },
      },
    },
    name: {
      name: 'name',
      type: 'String',
      hidden: false,
      readonly: true,
      required: true,
    },
    enabled: {
      name: 'enabled',
      type: 'Boolean',
      hidden: true,
      readonly: false,
      required: false,
      default: true,
      comment: 'Is enabled',
    },
    createdAt: {
      name: 'createdAt',
      type: 'Date',
      hidden: false,
      readonly: false,
      required: false,
    },
    updatedAt: {
      name: 'updatedAt',
      type: 'Date',
      hidden: false,
      readonly: false,
      required: false,
    },
  });
});

test('createClass', async () => {
  const httpPost = jest.spyOn(http, 'post').mockResolvedValue({});
  await LC.createClass({
    name: 'Test',
    type: 'normal',
    defaultACL: {
      '*': { read: true },
      _owner: { write: true },
    },
    permissions: {
      add_fields: { roles: [], users: [] },
      create: { onlySignInUsers: true },
      delete: { '*': true },
      update: { '*': true },
      find: { '*': true },
      get: { '*': true },
    },
  });
  expect(httpPost).toBeCalledWith(`/1.1/data/${LC.appId}/classes`, {
    class_name: 'Test',
    class_type: 'normal',
    acl_template: {
      '*': { read: true },
      _owner: { write: true },
    },
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
