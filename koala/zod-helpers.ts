/**
 * This file provides helpers for schema validation similar to OpenAI's zod helpers
 */
import { z } from 'zod';

export function zodResponseFormat<T extends z.ZodType>(schema: T, responseFormat?: string) {
  return {
    type: "json_object",
    schema: schema.shape || schema,
    responseFormat,
  };
}

export function createParser<T extends z.ZodType>(schema: T) {
  return (input: string) => {
    try {
      const parsed = JSON.parse(input);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw new Error(`Failed to parse response as JSON: ${error}`);
    }
  };
}
