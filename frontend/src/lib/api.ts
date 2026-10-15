import axios from "axios"

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "" })
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
http.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && localStorage.getItem("access_token")) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
  return Promise.reject(error)
})

const V1 = "/api/v1"

export type Trainer = {
  id: number
  surname: string
  name: string
  patronymic?: string | null
  photo?: string | null
  description?: string | null
  function?: string | null
  gender?: string | null
  is_active: boolean
  sort: number
}

export type ScheduleItem = {
  id: number
  training_id: number
  name: string
  level: string
  age_group: string
  color: string
  text_color: string
  date: string
  time_start: string
  time_end: string
  records_limit: number
  records_current: number
  waiting_current: number
  status: string
  description?: string | null
  trainer: Trainer
  sign_id?: number | null
  sign_status?: string | null
}

export type Training = {
  id: number
  name: string
  level: string
  age_group: string
  color: string
}

export type Catalog = {
  id: number
  category: string
  name: string
  description?: string | null
  price: number
  visits_count?: number | null
  valid_days: number
}

export type UserService = {
  id: number
  catalog: Catalog
  user_email?: string | null
  user_full_name?: string | null
  visits_total?: number | null
  visits_left?: number | null
  start_date?: string | null
  end_date?: string | null
  status: string
  price: number
  created_at: string
}

export type Registration = {
  id: number
  status: string
  attended: boolean
  schedule_item: ScheduleItem
}

export type ContactRequest = {
  id: number
  name: string
  phone: string
  kind: string
  comment?: string | null
  status: string
  created_at: string
}

export type RegistrationResult = {
  status: "success" | "waiting" | "fail"
  message: string
}

export type AdminTraining = {
  id: number
  name: string
  description?: string | null
  level: string
  age_group: string
  color: string
  text_color: string
  is_personal: boolean
  is_active: boolean
}

export type WeeklySlot = {
  id: number
  training_id: number
  trainer_id: number
  weekday: number
  time_start: string
  time_end: string
  records_limit: number
  is_active: boolean
}

export type AdminCatalog = Catalog & {
  visits_count?: number | null
  valid_days: number
  is_single: boolean
  is_active: boolean
  sort: number
}

const adminCrud = <T extends { id: number }>(path: string) => ({
  list: async () =>
    (await http.get<T[]>(`${V1}/admin/${path}/`, { params: { limit: 500 } }))
      .data,
  create: async (body: Omit<T, "id">) =>
    (await http.post<T>(`${V1}/admin/${path}/`, body)).data,
  update: async (id: number, body: Partial<Omit<T, "id">>) =>
    (await http.put<T>(`${V1}/admin/${path}/${id}`, body)).data,
})

export const api = {
  trainers: async () =>
    (await http.get<{ data: Trainer[] }>(`${V1}/trainer`)).data.data,
  trainings: async () =>
    (await http.get<Training[]>(`${V1}/schedule/trainings`)).data,
  schedule: async (params: {
    dateFrom: string
    dateTo: string
    "trainer[]"?: number[]
    ageType?: string
    level?: string
  }) =>
    (
      await http.get<{ data: ScheduleItem[] }>(`${V1}/schedule`, {
        params,
        paramsSerializer: (p) => {
          const q = new URLSearchParams()
          for (const [k, v] of Object.entries(p)) {
            if (v === undefined || v === "") continue
            for (const x of Array.isArray(v) ? v : [v]) q.append(k, String(x))
          }
          return q.toString()
        },
      })
    ).data.data,
  catalog: async () =>
    (await http.get<Catalog[]>(`${V1}/catalog/service`)).data,
  register: async (schedule_id: number, user_service_id?: number) =>
    (
      await http.post<RegistrationResult>(`${V1}/schedule/registration-v2`, {
        schedule_id,
        user_service_id,
      })
    ).data,
  cancel: async (id: number) =>
    (await http.delete<{ message: string }>(`${V1}/schedule/${id}`)).data,
  myRegistrations: async () =>
    (await http.get<{ data: Registration[] }>(`${V1}/user/registrations`)).data
      .data,
  myServices: async () =>
    (await http.get<{ data: UserService[] }>(`${V1}/service`)).data.data,
  sendRequest: async (body: {
    name: string
    phone: string
    kind: string
    comment?: string
  }) => (await http.post<ContactRequest>(`${V1}/requests`, body)).data,
  admin: {
    trainers: adminCrud<Trainer>("trainers"),
    trainings: adminCrud<AdminTraining>("trainings"),
    weeklySlots: adminCrud<WeeklySlot>("weekly-slots"),
    catalog: adminCrud<AdminCatalog>("catalog"),
    requests: async () =>
      (await http.get<{ data: ContactRequest[] }>(`${V1}/admin/requests/`)).data
        .data,
    setRequestStatus: async (id: number, status: string) =>
      (await http.put(`${V1}/admin/requests/${id}`, { status })).data,
    userServices: async (status?: string) =>
      (
        await http.get<UserService[]>(`${V1}/admin/user-services/`, {
          params: { status },
        })
      ).data,
    grantService: async (body: {
      user_id: string
      catalog_id: number
      start_date?: string
    }) =>
      (await http.post<UserService>(`${V1}/admin/user-services/`, body)).data,
    activateService: async (id: number) =>
      (await http.post(`${V1}/admin/user-services/${id}/activate`)).data,
    updateUserService: async (
      id: number,
      body: {
        visits_left?: number | null
        end_date?: string | null
        status?: string
      },
    ) =>
      (await http.patch<UserService>(`${V1}/admin/user-services/${id}`, body))
        .data,
    schedule: async (date_from: string, date_to: string) =>
      (
        await http.get<ScheduleItem[]>(`${V1}/admin/schedule/`, {
          params: { date_from, date_to },
        })
      ).data,
    updateScheduleStatus: async (id: number, status: string) =>
      (await http.put(`${V1}/admin/schedule/${id}`, { status })).data,
    generateSchedule: async (weeks: number) =>
      (
        await http.post<{ message: string }>(
          `${V1}/admin/schedule/generate`,
          null,
          {
            params: { weeks },
          },
        )
      ).data,
    registrations: async (itemId: number) =>
      (
        await http.get<
          {
            id: number
            status: string
            attended: boolean
            full_name?: string
            email: string
            phone?: string
          }[]
        >(`${V1}/admin/schedule/${itemId}/registrations`)
      ).data,
    markAttended: async (regId: number, attended: boolean) =>
      (
        await http.post(
          `${V1}/admin/schedule/registrations/${regId}/attended`,
          null,
          { params: { attended } },
        )
      ).data,
  },
}

export const fullName = (t: Trainer) => `${t.surname} ${t.name}`
export const hhmm = (t: string) => t.slice(0, 5)
