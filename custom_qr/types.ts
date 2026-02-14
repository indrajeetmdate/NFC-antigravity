
export type DotType =
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";

export type CornerSquareType = "dots" | "square" | "extra-rounded";

export type CornerDotType = "dots" | "square";

export type FileExtension = "png" | "jpeg" | "svg";

export interface DotOptions {
    type: DotType;
    color: string;
}

export interface BackgroundOptions {
    color: string;
}

export interface CornerSquareOptions {
    type: CornerSquareType | null;
    color?: string | null;
}

export interface CornerDotOptions {
    type: CornerDotType | null;
    color?: string | null;
}

export interface ImageOptions {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
}

export interface Options {
    width: number;
    height: number;
    data: string;
    margin: number;
    image: string;
    dotsOptions: DotOptions;
    backgroundOptions: BackgroundOptions;
    cornersSquareOptions: CornerSquareOptions;
    cornersDotOptions: CornerDotOptions;
    imageOptions?: ImageOptions;
}
