import { z } from "zod"

export const isValidPhone = (value: string): boolean => {
  const v = value.trim()
  if (!/^\+?[\d\s()-]+$/.test(v)) return false
  const digits = v.replace(/\D/g, "")
  const plus = v.startsWith("+")
  if ((plus && digits.startsWith("7")) || (!plus && /^[78]/.test(digits))) {
    return digits.length === 11
  }
  return digits.length >= 10 && digits.length <= 15
}

export const PHONE_ERROR = "Некорректный номер телефона"

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidPhone(v), { message: PHONE_ERROR })
  .optional()

export const phoneOrNull = (value?: string | null): string | null =>
  value?.trim() || null
