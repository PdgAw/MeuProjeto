import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/layout/PageLoader'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { DashboardRedirect, RequireAuth, RequireGuest, RequirePermission } from '@/features/auth/components/guards'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const SetPasswordPage = lazy(() => import('@/features/auth/pages/SetPasswordPage'))
const NoAccessPage = lazy(() => import('@/features/auth/pages/NoAccessPage'))
const NotFoundPage = lazy(() => import('@/components/layout/NotFoundPage'))
const NeoleaderDashboardPage = lazy(() => import('@/features/dashboard/neoleader/NeoleaderDashboardPage'))
const JourneyPage = lazy(() => import('@/features/journey/pages/JourneyPage'))
const TodayPage = lazy(() => import('@/features/today/TodayPage'))
const SubjectsPage = lazy(() => import('@/features/academic/pages/SubjectsPage'))
const SubjectDetailPage = lazy(() => import('@/features/academic/pages/SubjectDetailPage'))
const LessonPage = lazy(() => import('@/features/academic/pages/LessonPage'))
const LessonsPage = lazy(() => import('@/features/academic/pages/LessonsPage'))
const AssignmentPage = lazy(() => import('@/features/academic/pages/AssignmentPage'))
const TeacherDashboardPage = lazy(() => import('@/features/dashboard/teacher/TeacherDashboardPage'))
const CohortsPage = lazy(() => import('@/features/cohorts/pages/CohortsPage'))
const CohortDetailPage = lazy(() => import('@/features/cohorts/pages/CohortDetailPage'))
const TeachersPage = lazy(() => import('@/features/teachers/pages/TeachersPage'))
const ProfessionalProfilePage = lazy(() => import('@/features/teachers/pages/ProfessionalProfilePage'))
const MentoringPage = lazy(() => import('@/features/mentoring/pages/MentoringPage'))
const SessionPage = lazy(() => import('@/features/mentoring/pages/SessionPage'))
const MentorDashboardPage = lazy(() => import('@/features/mentoring/pages/MentorDashboardPage'))
const MenteesPage = lazy(() => import('@/features/mentoring/pages/MenteesPage'))
const MenteePage = lazy(() => import('@/features/mentoring/pages/MenteePage'))
const MentorsAdminPage = lazy(() => import('@/features/mentoring/pages/MentorsAdminPage'))
const SessionsAdminPage = lazy(() => import('@/features/mentoring/pages/SessionsAdminPage'))
const MyVenturePage = lazy(() => import('@/features/ventures/pages/MyVenturePage'))
const VenturePage = lazy(() => import('@/features/ventures/pages/VenturePage'))
const VenturesAdminPage = lazy(() => import('@/features/ventures/pages/VenturesAdminPage'))
const PanelsPage = lazy(() => import('@/features/panels/pages/PanelsPage'))
const PitchFormPage = lazy(() => import('@/features/panels/pages/PitchFormPage'))
const EvaluationsPage = lazy(() => import('@/features/panels/pages/EvaluationsPage'))
const EvaluatePage = lazy(() => import('@/features/panels/pages/EvaluatePage'))
const RoundsAdminPage = lazy(() => import('@/features/panels/pages/RoundsAdminPage'))
const RoundAdminPage = lazy(() => import('@/features/panels/pages/RoundAdminPage'))
const ExperiencesPage = lazy(() => import('@/features/experiences/pages/ExperiencesPage'))
const ExperiencePage = lazy(() => import('@/features/experiences/pages/ExperiencePage'))
const CommunityPage = lazy(() => import('@/features/community/pages/CommunityPage'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
const AchievementsPage = lazy(() => import('@/features/achievements/AchievementsPage'))
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'))
const AnnouncementsPage = lazy(() => import('@/features/announcements/pages/AnnouncementsPage'))
const AnnouncementPage = lazy(() => import('@/features/announcements/pages/AnnouncementPage'))
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage'))
const AgendaPage = lazy(() => import('@/features/agenda/pages/AgendaPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const CoordinationDashboardPage = lazy(() => import('@/features/management/pages/CoordinationDashboardPage'))
const DirectionDashboardPage = lazy(() => import('@/features/management/pages/DirectionDashboardPage'))
const SecretaryDashboardPage = lazy(() => import('@/features/management/pages/SecretaryDashboardPage'))
const StudentsPage = lazy(() => import('@/features/students/pages/StudentsPage'))
const Student360Page = lazy(() => import('@/features/students/pages/Student360Page'))
const AdmissionsPage = lazy(() => import('@/features/admissions/pages/AdmissionsPage'))
const CandidatePage = lazy(() => import('@/features/admissions/pages/CandidatePage'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const UserAccessPage = lazy(() => import('@/features/users/pages/UserAccessPage'))
const MyRequestsPage = lazy(() => import('@/features/requests/pages/MyRequestsPage'))
const RequestsQueuePage = lazy(() => import('@/features/requests/pages/RequestsQueuePage'))
const FinancePage = lazy(() => import('@/features/finance/pages/FinancePage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

function Root() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}

/** Every authenticated page, rendered inside the app shell. */
const BUILT: RouteObject[] = [
  { path: '/inicio', element: <NeoleaderDashboardPage /> },
  { path: '/jornada', element: <JourneyPage /> },
  { path: '/hoje', element: <TodayPage /> },
  // Academic (Phase 4)
  { path: '/professor', element: <TeacherDashboardPage /> },
  { path: '/disciplinas', element: <SubjectsPage /> },
  { path: '/disciplinas/:id', element: <SubjectDetailPage /> },
  { path: '/aulas', element: <LessonsPage scope="teacher" /> },
  { path: '/aulas/:id', element: <LessonPage /> },
  { path: '/entregas/:id', element: <AssignmentPage /> },
  { path: '/professores/:id', element: <ProfessionalProfilePage /> },
  {
    element: <RequirePermission permission={['subjects.manage', 'classes.view']} />,
    children: [{ path: '/gestao/disciplinas', element: <SubjectsPage /> }],
  },
  {
    element: <RequirePermission permission={['lessons.manage', 'classes.view']} />,
    children: [{ path: '/gestao/aulas', element: <LessonsPage scope="all" /> }],
  },
  {
    element: <RequirePermission permission="classes.view" />,
    children: [
      { path: '/gestao/turmas', element: <CohortsPage /> },
      { path: '/gestao/turmas/:id', element: <CohortDetailPage /> },
    ],
  },
  {
    element: <RequirePermission permission="users.view" />,
    children: [{ path: '/gestao/professores', element: <TeachersPage /> }],
  },
  // Neomentoria & Meu Negócio (Phase 5)
  { path: '/mentorias', element: <MentoringPage /> },
  { path: '/mentorias/:id', element: <SessionPage /> },
  { path: '/neomentor', element: <MentorDashboardPage /> },
  { path: '/neomentor/neoleaders', element: <MenteesPage /> },
  { path: '/neomentor/neoleaders/:id', element: <MenteePage /> },
  { path: '/meu-negocio', element: <MyVenturePage /> },
  { path: '/negocios/:id', element: <VenturePage /> },
  {
    element: <RequirePermission permission="mentoring.view" />,
    children: [
      { path: '/gestao/neomentores', element: <MentorsAdminPage /> },
      { path: '/gestao/mentorias', element: <SessionsAdminPage /> },
    ],
  },
  {
    element: <RequirePermission permission="ventures.view" />,
    children: [{ path: '/gestao/projetos', element: <VenturesAdminPage /> }],
  },
  // Ecosystem (Phase 6)
  { path: '/bancas', element: <PanelsPage /> },
  { path: '/bancas/:roundId/pitch', element: <PitchFormPage /> },
  { path: '/avaliacoes', element: <EvaluationsPage /> },
  { path: '/avaliacoes/:id', element: <EvaluatePage /> },
  {
    element: <RequirePermission permission={['panels.manage', 'panels.results', 'panels.evaluate']} />,
    children: [
      { path: '/gestao/bancas', element: <RoundsAdminPage /> },
      { path: '/gestao/bancas/:id', element: <RoundAdminPage /> },
    ],
  },
  { path: '/experiencias', element: <ExperiencesPage /> },
  { path: '/experiencias/:id', element: <ExperiencePage /> },
  {
    element: <RequirePermission permission="events.manage" />,
    children: [{ path: '/gestao/experiencias', element: <ExperiencesPage /> }],
  },
  {
    element: <RequirePermission permission="community.view" />,
    children: [{ path: '/comunidade', element: <CommunityPage /> }],
  },
  { path: '/perfil', element: <ProfilePage /> },
  { path: '/conquistas', element: <AchievementsPage /> },
  // Communication (Phase 7)
  { path: '/chat', element: <ChatPage /> },
  { path: '/chat/:id', element: <ChatPage /> },
  { path: '/comunicados', element: <AnnouncementsPage /> },
  { path: '/comunicados/:id', element: <AnnouncementPage /> },
  { path: '/documentos', element: <DocumentsPage /> },
  { path: '/documentos/:id', element: <DocumentsPage /> },
  { path: '/agenda', element: <AgendaPage /> },
  { path: '/notificacoes', element: <NotificationsPage /> },
  // Gestão (Phase 8)
  { path: '/solicitacoes', element: <MyRequestsPage /> },
  {
    element: <RequirePermission permission={['reports.view', 'students.view', 'classes.view']} />,
    children: [
      { path: '/gestao', element: <CoordinationDashboardPage /> },
      { path: '/direcao', element: <DirectionDashboardPage /> },
    ],
  },
  {
    element: <RequirePermission permission={['requests.manage', 'admissions.view', 'finance.view', 'students.view']} />,
    children: [{ path: '/secretaria', element: <SecretaryDashboardPage /> }],
  },
  {
    element: <RequirePermission permission="students.view" />,
    children: [
      { path: '/gestao/neoleaders', element: <StudentsPage /> },
      { path: '/gestao/neoleaders/:id', element: <Student360Page /> },
    ],
  },
  {
    element: <RequirePermission permission={['admissions.view', 'admissions.committee']} />,
    children: [
      { path: '/gestao/admissoes', element: <AdmissionsPage /> },
      { path: '/gestao/admissoes/:id', element: <CandidatePage /> },
    ],
  },
  {
    element: <RequirePermission permission="users.view" />,
    children: [
      { path: '/gestao/usuarios', element: <UsersPage /> },
      { path: '/gestao/usuarios/:id', element: <UserAccessPage /> },
    ],
  },
  {
    element: <RequirePermission permission="requests.manage" />,
    children: [{ path: '/gestao/solicitacoes', element: <RequestsQueuePage /> }],
  },
  {
    element: <RequirePermission permission="finance.view" />,
    children: [{ path: '/gestao/financeiro', element: <FinancePage /> }],
  },
  {
    element: <RequirePermission permission="reports.view" />,
    children: [{ path: '/gestao/relatorios', element: <ReportsPage /> }],
  },
  {
    element: <RequirePermission permission={['settings.manage', 'permissions.manage']} />,
    children: [{ path: '/gestao/configuracoes', element: <SettingsPage /> }],
  },
]
const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
        ],
      },
      { path: '/primeiro-acesso', element: <SetPasswordPage mode="first-access" /> },
      { path: '/redefinir-senha', element: <SetPasswordPage mode="reset" /> },
      { path: '/sem-acesso', element: <NoAccessPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <DashboardRedirect /> },
          { element: <AppShell />, children: BUILT },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
