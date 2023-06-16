import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ClassSchema, ColumnSchema } from './schema';

export interface ClassListItem {
  id: string;
  name: string;
  type: ClassSchema['type'];
  rowCount: number;
}

export interface CreateClassData {
  name: string;
  type: ClassSchema['type'];
  defaultACL: ClassSchema['defaultACL'];
  permissions: ClassSchema['permissions'];
}

export interface UpdateClassPermissionsData {
  className: string;
  permissions: ClassSchema['permissions'];
}

export interface UpdateClassDefaultAclData {
  className: string;
  defaultACL: ClassSchema['defaultACL'];
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
        _id: string;
        name: string;
        'class-type': ClassSchema['type'];
        rows_count: number;
      }[]
    >(`/1.1/data/${this.appId}/classes`);

    return data.map<ClassListItem>((item) => ({
      id: item._id,
      name: item.name,
      type: item['class-type'],
      rowCount: item.rows_count,
    }));
  }

  async getClassInfo(name: string) {
    const { data } = await this.client.get<{
      _id: string;
      name: string;
      'class-type': ClassSchema['type'];
      at: ClassSchema['defaultACL'];
      permissions: ClassSchema['permissions'];
      schema: Record<string, ColumnSchema>;
    }>(`/1.1/data/${this.appId}/classes/${name}`);

    const classSchema: ClassSchema = {
      name: data.name,
      type: data['class-type'],
      defaultACL: data.at,
      permissions: data.permissions,
    };

    return { classSchema, columnSchemas: data.schema };
  }

  async createClass(data: CreateClassData) {
    const req = this._makeCreateClassRequest(data);
    await this.client.request(req);
  }

  async updateClassPermissions(data: UpdateClassPermissionsData) {
    const req = this._makeUpdateClassPermissionsRequest(data);
    await this.client.request(req);
  }

  async updateClassDefaultAcl(data: UpdateClassDefaultAclData) {
    const req = this._makeUpdateClassDefaultAclRequest(data);
    await this.client.request(req);
  }

  async createColumn(data: CreateColumnData) {
    const req = this._makeCreateColumnRequest(data);
    await this.client.request(req);
  }

  async updateColumn(data: UpdateColumnData) {
    const req = this._makeUpdateColumnRequest(data);
    await this.client.request(req);
  }

  _makeCreateClassRequest(data: CreateClassData) {
    const req: AxiosRequestConfig = {
      method: 'POST',
      url: `/1.1/data/${this.appId}/classes`,
      data: {
        class_name: data.name,
        class_type: data.type,
        acl_template: data.defaultACL,
        permissions: data.permissions,
      },
    };
    return req;
  }

  _makeUpdateClassPermissionsRequest(data: UpdateClassPermissionsData) {
    const req: AxiosRequestConfig = {
      method: 'PUT',
      url: `/1.1/data/${this.appId}/classes/${data.className}/permissions`,
      data: {
        permissions: data.permissions,
      },
    };
    return req;
  }

  _makeUpdateClassDefaultAclRequest(data: UpdateClassDefaultAclData) {
    const req: AxiosRequestConfig = {
      method: 'PUT',
      url: `/1.1/data/${this.appId}/classes/${data.className}/columns/ACL`,
      data: {
        claid: data.className,
        id: 'ACL',
        default: JSON.stringify(data.defaultACL),
      },
    };
    return req;
  }

  _makeCreateColumnRequest(data: CreateColumnData) {
    const req: AxiosRequestConfig = {
      method: 'POST',
      url: `/1.1/data/${this.appId}/classes/${data.className}/columns`,
      data: {
        claid: data.className,
        column: data.name,
        type: data.type,
        hidden: data.hidden,
        read_only: data.readonly,
        required: data.required,
        default: data.default,
        comment: data.comment,
      },
    };
    return req;
  }

  _makeUpdateColumnRequest(data: UpdateColumnData) {
    const req: AxiosRequestConfig = {
      method: 'PUT',
      url: `/1.1/data/${this.appId}/classes/${data.className}/columns/${data.name}`,
      data: {
        claid: data.className,
        hidden: data.hidden,
        read_only: data.readonly,
        required: data.required,
        default: data.default,
        comment: data.comment,
      },
    };
    return req;
  }
}
