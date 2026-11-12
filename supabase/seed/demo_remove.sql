-- Removes ALL demo data created by supabase/seed/demo.sql.
-- Order matters: enrollments block cohort deletion, documents survive user deletion.
delete from public.documents
 where created_by in (select id from auth.users where email like '%@demo.neolevel.local')
    or owner_user_id in (select id from auth.users where email like '%@demo.neolevel.local');
delete from auth.users where email like '%@demo.neolevel.local';          -- cascades profiles & personal data
delete from public.experiences where cohort_id in (select id from public.cohorts where code = 'DEMO');
delete from public.cohorts where code = 'DEMO';                            -- cascades lessons, journey, targets
delete from public.subjects where code like 'DEMO-%';                      -- cascades assignments, materials
select 'demo data removed' as result;
