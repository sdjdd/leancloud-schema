import _ from 'lodash';
import { AxiosInstance } from 'axios';
import {
  ACL,
  BasicColumnSchema,
  ClassSchema,
  ColumnSchema,
  NumberColumnSchema,
  PointerColumnSchema,
} from './schema';

export interface ClassListItem {
  name: string;
  type: ClassSchema['type'];
}

export interface CreateClassData {
  name: string;
  type: ClassSchema['type'];
  defaultACL: ACL;
  permissions: ClassSchema['permissions'];
}

export interface CreateColumnData {
  name: string;
  type: ColumnSchema['type'];
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  default?: string; // JSON
  comment?: string;
  autoIncrement?: boolean; // Number
  className?: string; // Pointer
}

export interface UpdateColumnData {
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  default?: string | null; // JSON string
  comment?: string;
}

export class LeanCloudClient {
  constructor(private client: AxiosInstance, readonly appId: string) {}

  async getClassList() {
    const { data } = await this.client.get<
      {
        name: string;
        'class-type': ClassSchema['type'];
      }[]
    >(`/1.1/data/${this.appId}/classes`);

    return data.map<ClassListItem>((item) => ({
      name: item.name,
      type: item['class-type'],
    }));
  }

  async getClassInfo(name: string) {
    const { data } = await this.client.get<{
      name: string;
      'class-type': ClassSchema['type'];
      at: ACL;
      permissions: ClassSchema['permissions'];
      schema: Record<
        string,
        {
          type: string;
          hidden?: boolean;
          read_only?: boolean;
          required?: boolean;
          default?: any;
          comment?: string;
          auto_increment?: boolean;
          className?: string;
        }
      >;
    }>(`/1.1/data/${this.appId}/classes/${name}`);

    const classSchema: ClassSchema = {
      name: data.name,
      type: data['class-type'],
      permissions: data.permissions,
    };

    const columnSchemas = _.mapValues<typeof data.schema, ColumnSchema>(
      data.schema,
      (schema, name) => {
        const columnSchema: BasicColumnSchema = {
          name,
          type: schema.type,
          hidden: schema.hidden || false,
          readonly: schema.read_only || false,
          required: schema.required || false,
          default: schema.default,
          comment: schema.comment || '',
        };

        if (schema.type === 'Number') {
          (columnSchema as NumberColumnSchema).autoIncrement =
            schema.auto_increment || false;
        }
        if (schema.type === 'Pointer') {
          (columnSchema as PointerColumnSchema).className = schema.className!;
        }

        return columnSchema as ColumnSchema;
      }
    );

    if (columnSchemas.ACL && !columnSchemas.ACL.default && data.at) {
      columnSchemas.ACL.default = data.at;
    }

    return { classSchema, columnSchemas };
  }

  async createClass(data: CreateClassData) {
    await this.client.post(`/1.1/data/${this.appId}/classes`, {
      class_name: data.name,
      class_type: data.type,
      acl_template: data.defaultACL,
      permissions: data.permissions,
    });
  }

  async updateClassPermissions(
    name: string,
    permissions: ClassSchema['permissions']
  ) {
    await this.client.put(
      `/1.1/data/${this.appId}/classes/${name}/permissions`,
      {
        permissions,
      }
    );
  }

  async updateClassDefaultACL(name: string, defaultACL: ACL) {
    await this.client.put(
      `/1.1/data/${this.appId}/classes/${name}/columns/ACL`,
      {
        claid: name,
        id: 'ACL',
        default: JSON.stringify(defaultACL),
      }
    );
  }

  async createColumn(className: string, data: CreateColumnData) {
    await this.client.post(`/1.1/data/${this.appId}/classes/${data}/columns`, {
      claid: className,
      column: data.name,
      type: data.type,
      hidden: data.hidden,
      read_only: data.readonly,
      required: data.required,
      default: data.default,
      comment: data.comment,
      auto_increment: data.autoIncrement,
      incrementValue: data.autoIncrement ? 1 : undefined,
      class_name: data.className,
    });
  }

  async updateColumn(
    className: string,
    column: string,
    data: UpdateColumnData
  ) {
    await this.client.put(
      `/1.1/data/${this.appId}/classes/${className}/columns/${column}`,
      {
        claid: className,
        hidden: data.hidden,
        read_only: data.readonly,
        required: data.required,
        default: data.default,
        comment: data.comment,
      }
    );
  }
}
