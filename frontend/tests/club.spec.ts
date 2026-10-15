import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"

const publicPages = [
  { path: "/price", heading: "Цены на тренировки" },
  { path: "/schedule", heading: "Расписание" },
  { path: "/contacts", heading: "Контакты" },
  { path: "/competitions", heading: "Соревнования" },
]

test.describe("Public site", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Home page shows the map block with the address", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: "Как нас найти" }),
    ).toBeVisible()
    await expect(
      page
        .locator("#map")
        .getByText("Санкт-Петербург, ул. Народная, д. 55, лит. Т, второй этаж"),
    ).toBeVisible()
  })

  for (const { path, heading } of publicPages) {
    test(`Page ${path} is available`, async ({ page }) => {
      await page.goto(path)
      await expect(
        page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible()
    })
  }

  test("Request form rejects an invalid phone number", async ({ page }) => {
    await page.goto("/contacts")
    const form = page.locator("form").filter({ hasText: "политику" }).first()
    await form.getByPlaceholder("Ваше имя").fill("Иван")
    await form.getByPlaceholder("Телефон").fill("+792100000000")
    await form.getByRole("button", { name: "Записаться на тренировку" }).click()
    await expect(page.getByText("Некорректный номер телефона")).toBeVisible()
  })

  test("Request form is submitted with a valid phone number", async ({
    page,
  }) => {
    await page.goto("/contacts")
    const form = page.locator("form").filter({ hasText: "политику" }).first()
    await form.getByPlaceholder("Ваше имя").fill("Иван Тестов")
    await form.getByPlaceholder("Телефон").fill("+79210000000")
    await form.getByRole("button", { name: "Записаться на тренировку" }).click()
    await expect(page.getByText("Заявка отправлена")).toBeVisible()
  })
})

test.describe("Login", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Login form is visible", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible()
  })

  test("Wrong password shows an error", async ({ page }) => {
    await page.goto("/login")
    await page.getByTestId("email-input").fill(firstSuperuser)
    await page.getByTestId("password-input").fill("wrong-password-123")
    await page.getByRole("button", { name: "Войти" }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("Anonymous user is redirected from admin pages", async ({ page }) => {
    await page.goto("/requests")
    await expect(page).toHaveURL(/\/login/)
  })

  test("Superuser can log in", async ({ page }) => {
    await page.goto("/login")
    await page.getByTestId("email-input").fill(firstSuperuser)
    await page.getByTestId("password-input").fill(firstSuperuserPassword)
    await page.getByRole("button", { name: "Войти" }).click()
    await page.waitForURL("/account")
  })
})

test.describe("Admin", () => {
  test("Requests page lists website requests", async ({ page }) => {
    await page.goto("/requests")
    await expect(
      page.getByRole("heading", { name: "Заявки с сайта" }),
    ).toBeVisible()
  })

  test("Client subscriptions page is available", async ({ page }) => {
    await page.goto("/user-services")
    await expect(
      page.getByRole("heading", { name: "Абонементы клиентов" }),
    ).toBeVisible()
  })
})
