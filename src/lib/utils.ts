export type ParsedJson =
  | boolean
  | number
  | string
  | null
  | ParsedJson[]
  | { [key: string]: ParsedJson };
