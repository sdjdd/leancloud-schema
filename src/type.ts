export interface LCDate {
  __type: 'Date';
  iso: string;
}

export interface Pointer<T extends string = string> {
  __type: 'Pointer';
  className: T;
  objectId: string;
}

export interface GeoPoint {
  __type: 'GeoPoint';
  latitude: number;
  longitude: number;
}

export interface ACL {
  [subject: string]:
    | { read: true }
    | { write: true }
    | { read: true; write: true };
}
