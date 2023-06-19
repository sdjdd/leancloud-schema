import _ from 'lodash';
import { z } from 'zod';
import { BasicColumnSchema, ColumnSchema, LocalSchema } from './schema';

const zodACL = z.record(
  z.union([
    z.object({
      read: z.literal(true),
      write: z.literal(true),
    }),
    z.object({
      read: z.literal(true),
    }),
    z.object({
      write: z.literal(true),
    }),
  ])
);

const zodBasicColumn = z.object({
  hidden: z.boolean().default(false),
  read_only: z.boolean().default(false),
  required: z.boolean().default(false),
  comment: z.string().default(''),
});

const zodStringColumn = zodBasicColumn.extend({
  type: z.literal('String'),
  default: z.string().optional(),
});

const zodNumberColumn = zodBasicColumn.extend({
  type: z.literal('Number'),
  auto_increment: z.boolean().default(false),
  default: z.number().optional(),
});

const zodBooleanColumn = zodBasicColumn.extend({
  type: z.literal('Boolean'),
  default: z.boolean().optional(),
});

const zodDateColumn = zodBasicColumn.extend({
  type: z.literal('Date'),
  default: z
    .object({
      __type: z.literal('Date'),
      iso: z.string(),
    })
    .optional(),
});

const zodFileColumn = zodBasicColumn.extend({
  type: z.literal('File'),
  default: z
    .object({
      __type: z.literal('Pointer'),
      className: z.literal('_File'),
      objectId: z.string(),
    })
    .optional(),
});

const zodArrayColumn = zodBasicColumn.extend({
  type: z.literal('Array'),
  default: z.array(z.any()).optional(),
});

const zodObjectColumn = zodBasicColumn.extend({
  type: z.literal('Object'),
  default: z.record(z.any()).optional(),
});

const zodGeoPointColumn = zodBasicColumn.extend({
  type: z.literal('GeoPoint'),
  default: z
    .object({
      __type: z.literal('GeoPoint'),
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

const zodPointerColumn = zodBasicColumn.extend({
  type: z.literal('Pointer'),
  className: z.string(),
  default: z
    .object({
      __type: z.literal('Pointer'),
      className: z.string(),
      objectId: z.string(),
    })
    .optional(),
});

const zodAnyColumn = zodBasicColumn.extend({
  type: z.literal('Any'),
  default: z.any(),
});

const zodACLColumn = zodBasicColumn.extend({
  type: z.literal('ACL'),
  default: zodACL,
});

const zodColumn = z.discriminatedUnion('type', [
  zodStringColumn,
  zodNumberColumn,
  zodBooleanColumn,
  zodDateColumn,
  zodFileColumn,
  zodArrayColumn,
  zodObjectColumn,
  zodGeoPointColumn,
  zodPointerColumn,
  zodAnyColumn,
  zodACLColumn,
]);

const zodPermission = z.union([
  z
    .object({
      roles: z.array(z.string()),
      users: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      onlySignInUsers: z.literal(true),
    })
    .strict(),
  z
    .object({
      '*': z.literal(true),
    })
    .strict(),
]);

const zodJsonSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['normal', 'log']).default('normal'),
  schema: z.record(zodColumn),
  permissions: z
    .object({
      add_fields: zodPermission,
      create: zodPermission,
      delete: zodPermission,
      update: zodPermission,
      find: zodPermission,
      get: zodPermission,
    })
    .strict(),
});

export function parseJsonSchema(rawJson: any, className: string) {
  const json = zodJsonSchema.parse(rawJson);
  const localSchema: LocalSchema = {
    classSchema: {
      name: json.name || className,
      type: json.type,
      permissions: json.permissions,
    },
    columnSchemas: {},
  };

  Object.entries(json.schema).forEach(([name, jsonSchema]) => {
    localSchema.columnSchemas[name] = convertZodColumnSchema(jsonSchema, name);
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

function convertZodColumnSchema(
  zodData: z.infer<typeof zodColumn>,
  name: string
): ColumnSchema {
  const basicColumnSchema: BasicColumnSchema = {
    name,
    type: zodData.type,
    hidden: zodData.hidden,
    readonly: zodData.read_only,
    required: zodData.required,
    comment: zodData.comment,
    default: zodData.default,
  };

  switch (zodData.type) {
    case 'Number':
      return {
        ...basicColumnSchema,
        type: zodData.type,
        autoIncrement: zodData.auto_increment,
      };
    case 'Pointer':
      return {
        ...basicColumnSchema,
        type: zodData.type,
        className: zodData.className,
      };
    default:
      return {
        ...basicColumnSchema,
        type: zodData.type,
      };
  }
}
