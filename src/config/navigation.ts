import {
  Award, BookOpen, Briefcase, CalendarDays, ClipboardList, FileText, FolderKanban, GraduationCap, Home,
  LayoutDashboard, Megaphone, MessagesSquare, Mountain, Network, Presentation, Route, Settings, Sparkles,
  Sun, UserCircle, UserCog, Users, UsersRound, BarChart3, Inbox, type LucideIcon,
} from 'lucide-react'
import type { DashboardKey, PermissionKey } from '@/features/auth/types'
import { DASHBOARD_ROUTES } from './dashboards'

export interface NavItem {
  key: string
  label: string
  /** Short label for the mobile bottom bar. */
  short?: string
  path: string
  icon: LucideIcon
  /** Shown only with any of these permissions (UX — the database enforces access). */
  permissions?: PermissionKey[]
  /** Part of the mobile bottom bar (max 4 per menu; the rest go under "Mais"). */
  mobile?: boolean
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

const NEOLEADER: NavSection[] = [
  {
    items: [
      { key: 'home', label: 'Início', path: '/inicio', icon: Home, mobile: true },
      { key: 'journey', label: 'Minha Jornada', short: 'Jornada', path: '/jornada', icon: Route, mobile: true },
      { key: 'today', label: 'Hoje', path: '/hoje', icon: Sun },
      { key: 'subjects', label: 'Disciplinas', path: '/disciplinas', icon: BookOpen },
      { key: 'venture', label: 'Meu Negócio', path: '/meu-negocio', icon: Briefcase },
      { key: 'mentoring', label: 'Mentorias', path: '/mentorias', icon: Sparkles },
      { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays, mobile: true },
    ],
  },
  {
    title: 'Ecossistema',
    items: [
      { key: 'experiences', label: 'Experiências Neo', path: '/experiencias', icon: Mountain },
      { key: 'community', label: 'Comunidade', path: '/comunidade', icon: Network },
      { key: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, mobile: true },
      { key: 'announcements', label: 'Comunicados', path: '/comunicados', icon: Megaphone },
      { key: 'documents', label: 'Documentos', path: '/documentos', icon: FileText },
      { key: 'achievements', label: 'Conquistas', path: '/conquistas', icon: Award },
      { key: 'requests', label: 'Solicitações', path: '/solicitacoes', icon: Inbox },
      { key: 'profile', label: 'Perfil', path: '/perfil', icon: UserCircle },
    ],
  },
]

const TEACHER: NavSection[] = [
  {
    items: [
      { key: 'home', label: 'Início', path: DASHBOARD_ROUTES.teacher, icon: Home, mobile: true },
      { key: 'lessons', label: 'Minhas aulas', short: 'Aulas', path: '/aulas', icon: Presentation, mobile: true },
      { key: 'subjects', label: 'Disciplinas', path: '/disciplinas', icon: BookOpen },
      { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays, mobile: true },
      { key: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, mobile: true },
      { key: 'announcements', label: 'Comunicados', path: '/comunicados', icon: Megaphone },
      { key: 'documents', label: 'Documentos', path: '/documentos', icon: FileText },
      { key: 'community', label: 'Comunidade', path: '/comunidade', icon: Network },
      { key: 'profile', label: 'Perfil', path: '/perfil', icon: UserCircle },
    ],
  },
]

const MENTOR: NavSection[] = [
  {
    items: [
      { key: 'home', label: 'Início', path: DASHBOARD_ROUTES.mentor, icon: Home, mobile: true },
      { key: 'mentees', label: 'Meus Neoleaders', short: 'Neoleaders', path: '/neomentor/neoleaders', icon: UsersRound, mobile: true },
      { key: 'mentoring', label: 'Mentorias', path: '/mentorias', icon: Sparkles, mobile: true },
      { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays },
      { key: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, mobile: true },
      { key: 'community', label: 'Comunidade', path: '/comunidade', icon: Network },
      { key: 'documents', label: 'Documentos', path: '/documentos', icon: FileText },
      { key: 'profile', label: 'Perfil', path: '/perfil', icon: UserCircle },
    ],
  },
]

function managementNav(home: string): NavSection[] {
  return [
    {
      items: [
        { key: 'home', label: 'Visão Geral', short: 'Visão', path: home, icon: LayoutDashboard, mobile: true },
        { key: 'students', label: 'Neoleaders', path: '/gestao/neoleaders', icon: GraduationCap, permissions: ['students.view'], mobile: true },
        { key: 'cohorts', label: 'Turmas', path: '/gestao/turmas', icon: Users, permissions: ['classes.view'] },
        { key: 'subjects', label: 'Disciplinas', path: '/gestao/disciplinas', icon: BookOpen, permissions: ['subjects.manage', 'classes.view'] },
        { key: 'lessons', label: 'Aulas', path: '/gestao/aulas', icon: Presentation, permissions: ['lessons.manage', 'classes.view'] },
        { key: 'teachers', label: 'Professores', path: '/gestao/professores', icon: UserCog, permissions: ['users.view'] },
        { key: 'mentors', label: 'Neomentores', path: '/gestao/neomentores', icon: UsersRound, permissions: ['mentoring.view'] },
        { key: 'mentoring', label: 'Mentorias', path: '/gestao/mentorias', icon: Sparkles, permissions: ['mentoring.view'] },
      ],
    },
    {
      title: 'Desenvolvimento',
      items: [
        { key: 'ventures', label: 'Projetos', path: '/gestao/projetos', icon: FolderKanban, permissions: ['ventures.view'] },
        { key: 'panels', label: 'Bancas', path: '/gestao/bancas', icon: Presentation, permissions: ['panels.manage', 'panels.evaluate', 'panels.results'] },
        { key: 'experiences', label: 'Experiências', path: '/gestao/experiencias', icon: Mountain, permissions: ['events.manage'] },
        { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays, mobile: true },
      ],
    },
    {
      title: 'Operação',
      items: [
        { key: 'announcements', label: 'Comunicados', path: '/comunicados', icon: Megaphone, mobile: true },
        { key: 'documents', label: 'Documentos', path: '/documentos', icon: FileText, permissions: ['documents.view'] },
        { key: 'admissions', label: 'Admissões', path: '/gestao/admissoes', icon: ClipboardList, permissions: ['admissions.view', 'admissions.committee'] },
        { key: 'requests', label: 'Solicitações', path: '/gestao/solicitacoes', icon: Inbox, permissions: ['requests.manage'] },
        { key: 'reports', label: 'Relatórios', path: '/gestao/relatorios', icon: BarChart3, permissions: ['reports.view'] },
        { key: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare },
        { key: 'users', label: 'Usuários', path: '/gestao/usuarios', icon: UserCog, permissions: ['users.view'] },
        { key: 'settings', label: 'Configurações', path: '/gestao/configuracoes', icon: Settings, permissions: ['settings.manage', 'permissions.manage'] },
        { key: 'profile', label: 'Perfil', path: '/perfil', icon: UserCircle },
      ],
    },
  ]
}

export function navigationFor(dashboard: DashboardKey): NavSection[] {
  switch (dashboard) {
    case 'neoleader': return NEOLEADER
    case 'teacher': return TEACHER
    case 'mentor': return MENTOR
    default: return managementNav(DASHBOARD_ROUTES[dashboard])
  }
}

/** Every route that appears in any menu (used to register "em breve" placeholders). */
export function allNavItems(): NavItem[] {
  const dashboards: DashboardKey[] = ['neoleader', 'teacher', 'mentor', 'coordination', 'direction', 'secretary']
  const seen = new Map<string, NavItem>()
  for (const d of dashboards) for (const s of navigationFor(d)) for (const i of s.items) if (!seen.has(i.path)) seen.set(i.path, i)
  return [...seen.values()]
}
