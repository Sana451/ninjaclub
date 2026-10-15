import { useMutation } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export type FieldValue = string | boolean
export type Values = Record<string, FieldValue>

export type FieldDef = {
  key: string
  label: string
  type: "text" | "number" | "textarea" | "checkbox" | "select" | "time"
  options?: { value: string; label: string }[]
  required?: boolean
  min?: number
  placeholder?: string
}

const inputClass =
  "h-9 rounded-md border bg-background px-3 text-sm text-foreground"

export function FormDialog({
  title,
  trigger,
  fields,
  initial,
  onSave,
  onSaved,
}: {
  title: string
  trigger: ReactNode
  fields: FieldDef[]
  initial: Values
  onSave: (values: Values) => Promise<unknown>
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Values>(initial)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const save = useMutation({
    mutationFn: () => onSave(values),
    onSuccess: () => {
      showSuccessToast("Сохранено")
      setOpen(false)
      onSaved()
    },
    onError: handleError.bind(showErrorToast),
  })
  const set = (key: string, v: FieldValue) =>
    setValues((prev) => ({ ...prev, [key]: v }))

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValues(initial)
        setOpen(o)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {fields.map((f) => {
            const v = values[f.key]
            if (f.type === "checkbox") {
              return (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={v === true}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {f.label}
                </label>
              )
            }
            return (
              <label
                key={f.key}
                htmlFor={`field-${f.key}`}
                className="flex flex-col gap-1 text-sm"
              >
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    id={`field-${f.key}`}
                    rows={4}
                    value={String(v ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                  />
                ) : f.type === "select" ? (
                  <select
                    id={`field-${f.key}`}
                    required={f.required}
                    value={String(v ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    className={inputClass}
                  >
                    {!f.required && <option value="">—</option>}
                    {f.required && !v && <option value="">Выберите</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`field-${f.key}`}
                    type={f.type}
                    required={f.required}
                    min={f.min}
                    placeholder={f.placeholder}
                    value={String(v ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            )
          })}
          <Button type="submit" disabled={save.isPending}>
            Сохранить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const str = (v: FieldValue | undefined) => String(v ?? "").trim()
export const strOrNull = (v: FieldValue | undefined) => str(v) || null
export const intOrNull = (v: FieldValue | undefined) =>
  str(v) === "" ? null : Number(v)
