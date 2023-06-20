import _ from 'lodash';
import { z } from 'zod';
import {
  BasicColumn,
  Column,
  LocalSchema,
  NumberColumn,
  PointerColumn,
} from './schema';

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
    columns: {},
  };

  Object.entries(json.schema).forEach(([name, jsonSchema]) => {
    localSchema.columns[name] = convertZodColumnSchema(jsonSchema, name);
  });

  return localSchema;
}

export async function encode(schema: LocalSchema) {
  const result: any = {
    type: schema.classSchema.type,
    schema: {},
    permissions: schema.classSchema.permissions,
  };

  if (result.type === 'normal') {
    delete result.type;
  }

  const setColumn = (col: Column) => {
    const json: any = {
      type: col.type,
      hidden: col.hidden || undefined,
      read_only: col.readonly || undefined,
      required: col.required || undefined,
      comment: col.comment || undefined,
      default: col.default,
    };
    if (col.type === 'Number') {
      json.auto_increment = col.autoIncrement || undefined;
    } else if (col.type === 'Pointer') {
      json.className = col.className;
    }
    result.schema[col.name] = json;
  };

  const { objectId, ACL, createdAt, updatedAt, ...columns } = schema.columns;

  setColumn(objectId);
  setColumn(ACL);
  Object.values(columns)
    .sort((a, b) => (a.name > b.name ? 1 : -1))
    .forEach(setColumn);
  setColumn(createdAt);
  setColumn(updatedAt);

  return result;
}

function convertZodColumnSchema(
  zodData: z.infer<typeof zodColumn>,
  name: string
): Column {
  const column: BasicColumn = {
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
      (column as NumberColumn).autoIncrement = zodData.auto_increment;
      break;
    case 'Pointer':
      (column as PointerColumn).className = zodData.className;
      break;
  }

  return column as Column;
}
