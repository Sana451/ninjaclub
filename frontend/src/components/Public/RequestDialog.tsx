import { useMutation } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import { api } from "@/lib/api"
import { isValidPhone, PHONE_ERROR } from "@/lib/phone"
import { handleError } from "@/utils"

export function RequestForm({
  onDone,
  className = "flex flex-col gap-3",
}: {
  onDone?: () => void
  className?: string
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [kind, setKind] = useState("adults")
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const mutation = useMutation({
    mutationFn: () => api.sendRequest({ name, phone, kind }),
    onSuccess: () => {
      showSuccessToast("Заявка отправлена. Мы свяжемся с вами в течение часа")
      setName("")
      setPhone("")
      onDone?.()
    },
    onError: handleError.bind(showErrorToast),
  })
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        if (!isValidPhone(phone)) {
          showErrorToast(PHONE_ERROR)
          return
        }
        mutation.mutate()
      }}
    >
      <Input
        required
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        required
        minLength={5}
        type="tel"
        placeholder="Телефон"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <select
        className="h-9 rounded-md border bg-background text-foreground px-3 text-sm"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <option value="kids">Детские тренировки</option>
        <option value="adults">Тренировки для взрослых</option>
      </select>
      <Button type="submit" disabled={mutation.isPending}>
        Записаться на тренировку
      </Button>
      <p className="text-xs text-muted-foreground">
        Вы соглашаетесь на нашу политику обработки персональных данных
      </p>
    </form>
  )
}

export function RequestDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запишитесь на первое пробное занятие</DialogTitle>
          <DialogDescription>
            Мы свяжемся с вами в течение часа и подберем тренера, дату и время
          </DialogDescription>
        </DialogHeader>
        <RequestForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
