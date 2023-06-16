import { ZodSchema, z } from 'zod';
import { ColumnType, LocalSchema } from './schema';
import _ from 'lodash';

const zodColumnType = z.enum([
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
]);

const zodColumnSchema = z.object({
  type: zodColumnType,
  hidden: z.boolean().optional(),
  read_only: z.boolean().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
  comment: z.string().optional(),
  auto_increment: z.boolean().optional(),
  increment_value: z.number().positive().optional(),
  class_name: z.string().optional(),
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

const zodACL = z
  .object({
    read: z.literal(true),
    write: z.literal(true),
  })
  .refine((obj) => !_.isEmpty(obj), 'ACL cannot be empty');

const zodJsonSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['normal', 'log']).optional(),
  schema: z.record(zodColumnSchema),
  permissions: z.object({
    add_fields: zodPermission,
    create: zodPermission,
    delete: zodPermission,
    update: zodPermission,
    find: zodPermission,
    get: zodPermission,
  }),
});

const DEFAULT_ZOD_SCHEMAS: Record<ColumnType, ZodSchema> = {
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
  const schema: LocalSchema = {
    classSchema: {
      name: json.name || className,
      type: json.type || 'normal',
      defaultACL: {
        '*': { read: true, write: true },
      },
      permissions: json.permissions,
    },
    columnSchemas: {},
  };

  Object.entries(json.schema).forEach(([colName, colSchema]) => {
    schema.columnSchemas[colName] = {
      name: colName,
      type: colSchema.type,
      hidden: colSchema.hidden || false,
      readonly: colSchema.read_only || false,
      required: colSchema.required || false,
      comment: colSchema.comment,
      autoIncrement: colSchema.auto_increment,
      incrementValue: colSchema.increment_value,
      pointerClass: colSchema.class_name,
    };
    if (colSchema.default !== undefined) {
      const zodSchema = DEFAULT_ZOD_SCHEMAS[colSchema.type];
      const parsedDefaultVal = zodSchema.parse(colSchema.default);
      schema.columnSchemas[colName].default = parsedDefaultVal;
    }
  });

  if (schema.columnSchemas.ACL?.default) {
    schema.classSchema.defaultACL = schema.columnSchemas.ACL.default;
  }

  return schema;
}
