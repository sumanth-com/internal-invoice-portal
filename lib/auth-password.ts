export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "case",
    label: "Uppercase and lowercase letters",
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
] as const;

export function passwordIsValid(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function passwordValidationMessage(password: string) {
  if (passwordIsValid(password)) return null;
  return "Use at least 8 characters with uppercase, lowercase, and a number.";
}
