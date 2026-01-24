import type { DotType, CornerSquareType, CornerDotType } from './types';

export const DOT_TYPES: Readonly<{ value: DotType; label: string }[]> = [
    { value: 'rounded', label: 'Rounded' },
    { value: 'dots', label: 'Dots' },
    { value: 'classy', label: 'Classy' },
    { value: 'classy-rounded', label: 'Classy Rounded' },
    { value: 'square', label: 'Square' },
    { value: 'extra-rounded', label: 'Extra Rounded' },
];

export const CORNER_SQUARE_TYPES: Readonly<{ value: CornerSquareType; label: string }[]> = [
    { value: 'extra-rounded', label: 'Extra Rounded' },
    { value: 'dots', label: 'Dots' },
    { value: 'square', label: 'Square' },
];

// FIX: Changed 'dot' to 'dots' to match the CornerDotType definition in types.ts.
export const CORNER_DOT_TYPES: Readonly<{ value: CornerDotType; label: string }[]> = [
    { value: 'dots', label: 'Dots' },
    { value: 'square', label: 'Square' },
];