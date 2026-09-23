-- Constructor Quest — migration 02: server-assigned guest codenames
--
-- Guests no longer type a display name; the app assigns one from a curated
-- word list. This makes display_name unique, which is what lets the public
-- board identify a run by codename alone (emails are never shown there).
--
-- Run this only if you already applied migration 01. A fresh setup gets all of
-- it from schema.sql.

-- If any duplicate codenames already exist, number them so the unique index
-- can be created. Harmless on a clean table.
with numbered as (
  select id,
         display_name,
         row_number() over (partition by display_name order by created_at) as n
    from guests
)
update guests g
   set display_name = g.display_name || ' ' || numbered.n
  from numbered
 where numbered.id = g.id
   and numbered.n > 1;

alter table guests drop constraint if exists guests_display_name_key;
alter table guests add constraint guests_display_name_key unique (display_name);
