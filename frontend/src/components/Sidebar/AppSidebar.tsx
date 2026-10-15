import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Home,
  Inbox,
  Tags,
  UserRound,
  Users,
  Wallet,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Мои записи", path: "/account" },
  { icon: CalendarDays, title: "Расписание", path: "/schedule" },
]

const adminItems: Item[] = [
  { icon: ClipboardList, title: "Расписание (админ)", path: "/schedule-admin" },
  { icon: Inbox, title: "Заявки", path: "/requests" },
  { icon: Wallet, title: "Абонементы клиентов", path: "/user-services" },
  { icon: UserRound, title: "Тренеры", path: "/trainers-admin" },
  { icon: Dumbbell, title: "Тренировки", path: "/trainings-admin" },
  { icon: Tags, title: "Каталог абонементов", path: "/catalog-admin" },
  { icon: Users, title: "Пользователи", path: "/admin" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, ...adminItems]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
