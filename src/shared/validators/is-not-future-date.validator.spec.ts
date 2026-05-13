import { registerDecorator } from 'class-validator';
import { IsNotFutureDate } from './is-not-future-date.validator';

jest.mock('class-validator', () => ({
  registerDecorator: jest.fn(),
}));

// Extract the validator object that gets registered by the decorator
const getValidator = () => {
  class Target {}
  IsNotFutureDate()(Target.prototype, 'dispatchedAt');
  const call = (registerDecorator as jest.Mock).mock.calls.at(-1)[0];
  return call.validator as { validate: (v: unknown) => boolean; defaultMessage: () => string };
};

describe('IsNotFutureDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true for a past date string', () => {
    expect(getValidator().validate('2024-01-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for a date 24 h in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getValidator().validate(future)).toBe(false);
  });

  it('returns false for a non-string value', () => {
    const validator = getValidator();
    expect(validator.validate(12345)).toBe(false);
    expect(validator.validate(null)).toBe(false);
    expect(validator.validate(undefined)).toBe(false);
  });

  it('returns false for an invalid date string', () => {
    expect(getValidator().validate('not-a-date')).toBe(false);
  });

  it('defaultMessage returns the expected template', () => {
    expect(getValidator().defaultMessage()).toBe('$property cannot be a future date');
  });

  it('registers the decorator on the correct property and target', () => {
    class MyClass {}
    IsNotFutureDate({ message: 'custom' })(MyClass.prototype, 'myProp');

    const call = (registerDecorator as jest.Mock).mock.calls.at(-1)[0];
    expect(call.propertyName).toBe('myProp');
    expect(call.target).toBe(MyClass);
    expect(call.options).toEqual({ message: 'custom' });
  });
});
