import _ from 'lodash';
import { ZodSchema, z } from 'zod';
import { ColumnSchema, LocalSchema } from './schema';

const zodColumn = z.object({
  type: z.enum([
    'String',
    'Number',
    'Boolean',
    'Date',
    'File',
    'Array',
    'Object',
    'GeoPoint',
    'Pointer',
    'Any',
    'ACL',
  ]),
  hidden: z.boolean().optional(),
  read_only: z.boolean().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
  comment: z.string().optional(),
  auto_increment: z.boolean().optional(),
  className: z.string().optional(),
});

// from strict to loose
const zodPermission = z.union([
  z.object({
    roles: z.array(z.string()),
    users: z.array(z.string()),
  }),
  z.object({
    onlySignInUsers: z.literal(true),
  }),
  z.object({
    '*': z.literal(true),
  }),
]);

const zodACL = z.record(
  z.union([
    z.object({
      read: z.literal(true),
    }),
    z.object({
      write: z.literal(true),
    }),
    z.object({
      read: z.literal(true),
      write: z.literal(true),
    }),
  ])
);

const zodJsonSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['normal', 'log']).optional(),
  schema: z.record(zodColumn),
  permissions: z.object({
    add_fields: zodPermission,
    create: zodPermission,
    delete: zodPermission,
    update: zodPermission,
    find: zodPermission,
    get: zodPermission,
  }),
});

const ZOD_DEFAULT_SCHEMAS: Record<ColumnSchema['type'], ZodSchema> = {
  String: z.string(),
  Number: z.number(),
  Boolean: z.boolean(),
  Date: z.object({
    __type: z.literal('Date'),
    iso: z.string(),
  }),
  File: z.object({
    __type: z.literal('Pointer'),
    className: z.literal('_File'),
    objectId: z.string(),
  }),
  Array: z.array(z.any()),
  Object: z.record(z.any()),
  GeoPoint: z.object({
    __type: z.literal('GeoPoint'),
    latitude: z.number(),
    longitude: z.number(),
  }),
  Pointer: z.object({
    __type: z.literal('Pointer'),
    className: z.string(),
    objectId: z.string(),
  }),
  Any: z.any(),
  ACL: zodACL,
};

export function parseJsonSchema(rawJson: any, className: string) {
  const json = zodJsonSchema.parse(rawJson);
  const localSchema: LocalSchema = {
    classSchema: {
      name: json.name || className,
      type: json.type || 'normal',
      permissions: json.permissions,
    },
    columnSchemas: {},
  };

  Object.entries(json.schema).forEach(([name, jsonSchema]) => {
    const columnSchema: ColumnSchema = {
      name,
      type: jsonSchema.type,
      hidden: jsonSchema.hidden || false,
      readonly: jsonSchema.read_only || false,
      required: jsonSchema.required || false,
      comment: jsonSchema.comment,
    };
    if (columnSchema.type === 'Number') {
      columnSchema.autoIncrement = jsonSchema.auto_increment;
    }
    if (columnSchema.type === 'Pointer') {
      columnSchema.className = jsonSchema.className;
    }
    if (jsonSchema.default !== undefined) {
      const zodDefault = ZOD_DEFAULT_SCHEMAS[jsonSchema.type];
      const parsedDefault = zodDefault.parse(jsonSchema.default);
      columnSchema.default = parsedDefault;
    }
    localSchema.columnSchemas[name] = columnSchema;
  });

  return localSchema;
}

export async function encode(schema: LocalSchema) {
  const result = {
    type: schema.classSchema.type,
    schema: {} as any,
    permissions: {} as any,
  };

  const setSchema = (schema: ColumnSchema) => {
    const json: any = {
      type: schema.type,
      hidden: schema.hidden || undefined,
      read_only: schema.readonly || undefined,
      comment: schema.comment || undefined,
      default: schema.default,
    };
    if (schema.type === 'Number') {
      json.auto_increment = schema.autoIncrement || undefined;
    } else if (schema.type === 'Pointer') {
      json.className = schema.className;
    }
    result.schema[schema.name] = json;
  };

  const { objectId, ACL, createdAt, updatedAt, ...columnSchemas } =
    schema.columnSchemas;

  const columns = Object.values(columnSchemas).sort((a, b) =>
    a.name > b.name ? 1 : -1
  );

  setSchema(objectId);
  setSchema(ACL);
  columns.forEach(setSchema);
  setSchema(createdAt);
  setSchema(updatedAt);

  (
    ['add_fields', 'create', 'delete', 'update', 'find', 'get'] as const
  ).forEach((action) => {
    result.permissions[action] = schema.classSchema.permissions[action];
  });

  return result;
}
