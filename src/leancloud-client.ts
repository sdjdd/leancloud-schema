import _ from 'lodash';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ClassSchema, ColumnSchema } from './schema';

export interface ClassListItem {
  name: string;
  type: ClassSchema['type'];
}

export interface CreateClassData {
  name: string;
  type: ClassSchema['type'];
  defaultACL: ClassSchema['defaultACL'];
  permissions: ClassSchema['permissions'];
}

export interface CreateColumnData {
  className: string;
  name: string;
  type: ColumnSchema['type'];
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  default?: any;
  comment?: string;
  autoIncrement?: boolean; // Number
  pointerClass?: string; // Pointer
}

export interface UpdateColumnData {
  className: string;
  name: string;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  default?: any; // nullable
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
      permissions: ClassSchema['permissions'];
      schema: Record<
        string,
        {
          type: ColumnSchema['type'];
          hidden?: boolean;
          read_only?: boolean;
          required?: boolean;
          default?: any;
          comment?: string;
        }
      >;
    }>(`/1.1/data/${this.appId}/classes/${name}`);

    const classSchema: ClassSchema = {
      name: data.name,
      type: data['class-type'],
      defaultACL: data.schema.ACL.default,
      permissions: data.permissions,
    };

    const columnSchemas = _.mapValues<typeof data.schema, ColumnSchema>(
      data.schema,
      (schema, name) => ({
        name,
        type: schema.type,
        hidden: schema.hidden || false,
        readonly: schema.read_only || false,
        required: schema.required || false,
        default: schema.default,
        comment: schema.comment,
      })
    );

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

  async updateClassDefaultACL(
    name: string,
    defaultACL: ClassSchema['defaultACL']
  ) {
    await this.client.put(
      `/1.1/data/${this.appId}/classes/${name}/columns/ACL`,
      {
        claid: name,
        id: 'ACL',
        default: JSON.stringify(defaultACL),
      }
    );
  }

  async createColumn(data: CreateColumnData) {
    await this.client.post(
      `/1.1/data/${this.appId}/classes/${data.className}/columns`,
      {
        claid: data.className,
        column: data.name,
        type: data.type,
        hidden: data.hidden,
        read_only: data.readonly,
        required: data.required,
        default: data.default,
        comment: data.comment,
        auto_increment: data.autoIncrement,
        class_name: data.pointerClass,
      }
    );
  }

  async updateColumn(data: UpdateColumnData) {
    await this.client.put(
      `/1.1/data/${this.appId}/classes/${data.className}/columns/${data.name}`,
      {
        claid: data.className,
        hidden: data.hidden,
        read_only: data.readonly,
        required: data.required,
        default: data.default,
        comment: data.comment,
      }
    );
  }
}
