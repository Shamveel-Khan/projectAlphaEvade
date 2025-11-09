declare module 'leaflet' {
  export interface MapOptions {
    center?: [number, number] | { lat: number; lng: number };
    zoom?: number;
    scrollWheelZoom?: boolean | 'center';
    [key: string]: any;
  }
  
  export interface TileLayerOptions {
    attribution?: string;
    url?: string;
    [key: string]: any;
  }
  
  export class Icon {
    static Default: {
      prototype: Icon;
      mergeOptions(options: any): void;
    };
    constructor(options?: any);
  }
  
  export namespace Icon {
    interface Default {
      prototype: Icon;
      mergeOptions(options: any): void;
    }
  }
  
  export const Icon: {
    Default: {
      prototype: Icon;
      mergeOptions(options: any): void;
    };
  };
}

