import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']
export const INSTALLMENT_LABEL: Record<Enums['installment_status'], string> = { pending: 'A vencer', paid: 'Pago', overdue: 'Em atraso', canceled: 'Cancelada', waived: 'Isenta' }
export const AGREEMENT_LABEL: Record<Enums['agreement_status'], string> = { active: 'Ativo', completed: 'Quitado', canceled: 'Cancelado', defaulted: 'Inadimplente' }

/** Local (São Paulo) yyyy-mm-dd, so "today" matches the school's calendar. */
export const localToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

export function useAgreements(studentId?: string) {
  return useQuery({
    queryKey: ['finance', 'agreements', studentId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('financial_agreements')
        .select('id, total_amount, installments_count, start_date, status, notes, created_at, student:profiles!financial_agreements_student_id_fkey(id, full_name), cohort:cohorts(id, name), adjustments:financial_adjustments(id, kind, percent, amount, reason), installments:tuition_installments(id, number, due_date, amount, status, paid_at, payment_method)')
        .order('created_at', { ascending: false })
      if (studentId) q = q.eq('student_id', studentId)
      const { data, error } = await q
      if (error) throw error
      const today = localToday()
      return data.map((a) => {
        const inst = [...a.installments].sort((x, y) => x.number - y.number)
          .map((i) => ({ ...i, late: (i.status === 'pending' || i.status === 'overdue') && i.due_date < today }))
        const paid = inst.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
        const open = inst.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
        const late = inst.filter((i) => i.late).reduce((s, i) => s + Number(i.amount), 0)
        return { ...a, installments: inst, paid, open, late, net: inst.filter((i) => i.status !== 'canceled').reduce((s, i) => s + Number(i.amount), 0) }
      })
    },
  })
}
export type Agreement = NonNullable<ReturnType<typeof useAgreements>['data']>[number]

export function useCreateAgreement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { student: string; cohort: string; total: number; installments: number; firstDue: string; discount: number; kind: Enums['adjustment_kind']; reason: string }) => {
      const { data, error } = await supabase.rpc('create_agreement_with_installments', {
        p_student: v.student, p_cohort: v.cohort, p_total: v.total, p_installments: v.installments, p_first_due: v.firstDue,
        p_discount_percent: v.discount, p_discount_kind: v.kind, p_reason: v.reason || undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['finance'] }); void qc.invalidateQueries({ queryKey: ['management'] }) },
  })
}

export function useSetAgreementStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums['agreement_status'] }) => {
      const { error } = await supabase.from('financial_agreements').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['finance'] }),
  })
}
