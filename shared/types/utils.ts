type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export const asWriteable = <T>(obj: T): DeepWriteable<T> => obj