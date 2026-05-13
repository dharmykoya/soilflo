import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates that an ISO 8601 date string is not in the future.
 * Equivalent to Laravel's `'date' => 'before_or_equal:today'`.
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          return !isNaN(date.getTime()) && date <= new Date();
        },
        defaultMessage(): string {
          return '$property cannot be a future date';
        },
      },
    });
  };
}
