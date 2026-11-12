-- =============================================================================
-- NeoLevel · 1910 · Notificações de Solicitações
--  * Solicitante: mudança de status e respostas (não internas) da secretaria.
--  * Responsável: atribuição e novos comentários do solicitante.
-- notify() já ignora o próprio autor da ação e respeita as preferências.
-- =============================================================================

create or replace function public.request_status_label(p public.request_status)
returns text language sql immutable set search_path = '' as $$
  select case p
    when 'open' then 'Aberta' when 'in_review' then 'Em análise' when 'awaiting_user' then 'Aguardando você'
    when 'resolved' then 'Resolvida' when 'canceled' then 'Cancelada' end
$$;

create or replace function public.notify_on_request_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform public.notify(new.requester_id, 'request',
      'Solicitação ' || lower(public.request_status_label(new.status)) || ': ' || left(new.subject, 80),
      case when new.status = 'awaiting_user' then 'A secretaria precisa de uma informação sua.' end,
      '/solicitacoes?id=' || new.id, jsonb_build_object('request_id', new.id, 'status', new.status));
  end if;
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    perform public.notify(new.assigned_to, 'request', 'Solicitação atribuída a você: ' || left(new.subject, 80), null,
      '/gestao/solicitacoes?id=' || new.id, jsonb_build_object('request_id', new.id));
  end if;
  return new;
end $$;
create trigger service_requests_notify after update of status, assigned_to on public.service_requests
  for each row execute function public.notify_on_request_update();

create or replace function public.notify_on_request_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.service_requests;
begin
  select * into r from public.service_requests where id = new.request_id;
  if new.author_id = r.requester_id then
    perform public.notify(r.assigned_to, 'request', 'Nova mensagem em: ' || left(r.subject, 80), left(new.body, 140),
      '/gestao/solicitacoes?id=' || r.id, jsonb_build_object('request_id', r.id));
  elsif not new.is_internal then
    perform public.notify(r.requester_id, 'request', 'Resposta da secretaria: ' || left(r.subject, 80), left(new.body, 140),
      '/solicitacoes?id=' || r.id, jsonb_build_object('request_id', r.id));
  end if;
  return new;
end $$;
create trigger service_request_comments_notify after insert on public.service_request_comments
  for each row execute function public.notify_on_request_comment();

revoke execute on function public.notify_on_request_update() from public, anon, authenticated;
revoke execute on function public.notify_on_request_comment() from public, anon, authenticated;
