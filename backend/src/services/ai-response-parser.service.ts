export type AIResponseValidator<T> = (value: unknown) => value is T

export class AIResponseParser {
  parseWithStatus<T>(
    value: unknown,
    validator: AIResponseValidator<T>,
    fallback: T,
  ): { value: T; usedFallback: boolean } {
    try {
      const parsed =
        typeof value === 'string' ? (JSON.parse(value) as unknown) : value
      return validator(parsed)
        ? { value: parsed, usedFallback: false }
        : { value: fallback, usedFallback: true }
    } catch {
      return { value: fallback, usedFallback: true }
    }
  }

  parse<T>(
    value: unknown,
    validator: AIResponseValidator<T>,
    fallback: T,
  ): T {
    return this.parseWithStatus(value, validator, fallback).value
  }
}

export const aiResponseParser = new AIResponseParser()
