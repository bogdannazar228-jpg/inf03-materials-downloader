# Материалы INF.03

Русскоязычный каталог **только INF.03**: Next.js App Router, Tailwind CSS, Vercel Cron, очередь в Postgres и Supabase Edge Function. Источник: [каталог INF.03](https://arkusze.pl/egzamin-zawodowy-kwalifikacja-inf-03/). Пример [страницы с PDF и ZIP](https://arkusze.pl/egzamin-zawodowy-inf-03-2026-czerwiec/). Использование и публичное кэширование файлов допускается только при наличии прав от правообладателей; robots.txt само по себе не является лицензией.

## Архитектура и ограничения

- Vercel Cron раз в сутки в 03:00 UTC создаёт `pending` в `sync_jobs`; `POST /api/admin/force-sync` делает то же вручную. Для cron нужен `CRON_SECRET`, который Vercel передаёт в Authorization. Эндпоинты закрыты токенами.
- `pg_cron` + `pg_net` раз в минуту вызывают `process-sync`. Она атомарно захватывает только одну задачу и выполняет порцию работы до 75 секунд; незавершённая задача возвращается в `pending`, её продолжит следующий вызов. Зависший захват восстанавливается через 4 минуты. Очередь нужна, чтобы не упираться в ограничения времени Vercel и Supabase, и сохранять прогресс. Первичное заполнение займёт несколько минут.
- Источники: sitemap index и дочерние sitemap, страницы пагинации раздела, а также каталог INF.03. Скачиваются исключительно ссылки с именами INF.03, найденные на страницах конкретной сессии INF.03. HTML, PDF, ZIP/7Z, HEAD и перенаправления проходят проверку robots.txt и домена, между обращениями 1,25 с. Если robots.txt недоступен — обход прекращается. Формат файлов проверяется по сигнатуре. Ошибки пишутся в `sync_errors`, задача получает `failed`; для повтора поставьте новую задачу. Журнал ошибок старше 30 дней удаляется по cron.
- `source_url` уникален; метаданные и счётчик обновляются в одной транзакции через RPC. Сохранение в Storage не является транзакцией Postgres: одинаковый объект повторно загружается по детерминированному имени, при отказе регистрации предпринимается удаление незарегистрированного объекта. При аварийном завершении между upload и регистрацией возможен осиротевший объект — сверяйте Storage и таблицу вручную. Не включайте параллельные сторонние загрузчики в этот bucket.
- **Strict**: файлы не удаляются для освобождения места; при исчерпании лимита задача переходит в `paused_storage_full`, а уже сохранённые файлы доступны. Перед загрузкой обязателен корректный `Content-Length` из HEAD; файл ограничен 50 МиБ (на Free у Supabase есть ограничение размера файла). При отсутствии длины или более крупном файле задача останавливается с ошибкой, а не рискует памятью и квотой.
- **Важное расхождение с исходным ТЗ:** согласно [Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size), Free включает 1 ГБ Storage на организацию, а не 5 ГБ. Поэтому начальный лимит здесь 1 GiB с резервом 200 MiB, а не 5 GiB. Квота общая по организации, поэтому при наличии других проектов нужно уменьшить `storage_limit_bytes` с учётом их использования. Цифра не отслеживает сторонние buckets. Меняйте её лишь после проверки тарифа и квоты. Free также ограничивает БД; [актуальные лимиты](https://supabase.com/docs/guides/platform/database-size) проверяйте у провайдера.
- Автосинхронизация зависит от доступности Supabase, Vercel и источника; на Free неактивные проекты могут приостанавливаться. Страницы и шаблоны источника могут измениться. Полнота ZIP не гарантируется при изменении схемы ссылок или если файлы отсутствуют на источнике.

## Ручной деплой

1. Создайте Supabase проект (предпочтительно Free), дождитесь готовности. Примените содержимое `supabase/migrations/20261106000000_initial.sql` в SQL Editor. Миграция создаёт таблицы, публичный bucket, RLS, функции и очистку ошибок.
2. Разверните Edge Function `process-sync` с файлами из `supabase/functions/process-sync/` через Dashboard или Supabase CLI. Включите проверку JWT. Системные переменные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` обычно предоставляются Supabase автоматически.
3. В Supabase Vault сохраните `inf03_project_url` (например `https://PROJECT_REF.supabase.co`) и **legacy service_role JWT** как `inf03_worker_key`. Не публикуйте ключ в репозитории. В SQL Editor выполните с собственными значениями `select vault.create_secret('...', 'inf03_project_url'); select vault.create_secret('...', 'inf03_worker_key');` и затем:

```sql
select cron.schedule('inf03-worker','* * * * *', $job$
select net.http_post(
 url := (select decrypted_secret from vault.decrypted_secrets where name='inf03_project_url') || '/functions/v1/process-sync',
 headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='inf03_worker_key')),
 body := '{}'::jsonb,
 timeout_milliseconds := 120000
);
$job$);
```

При ротации ключа обновите значение в Vault. Проверяйте `cron.job_run_details` и `net._http_response` при диагностике.
4. Создайте публичный GitHub репозиторий и загрузите файлы проекта без `.env`. Импортируйте его в Vercel, выберите Next.js и ветку `main`. Добавьте в production `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_TOKEN` и `CRON_SECRET`. Первые две и публичные значения находятся в Supabase Dashboard → Project Settings → API. Генерируйте два разных случайных токена (не менее 32 символов), например `openssl rand -hex 32`. Секреты остаются только в Vercel/Vault. Передеплойте проект после установки переменных. `vercel.json` регистрирует ежедневный cron; timezone — UTC.
5. Запустите `curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://ВАШ_ДОМЕН/api/admin/force-sync`. Дождитесь нескольких минут. В Supabase проверьте `sync_jobs`, `sync_errors`, `materials` и Storage bucket. На сайте проверьте фильтрацию, ссылки на источник и скачивание PDF/ZIP через домен Supabase. Не передавайте токен в URL или скриншотах.

## Разработка

```sh
cp .env.example .env.local
# Заполните переменные локально и не коммитьте их
npm ci
npm test
npm run typecheck
npm run build
npm run dev
```

В проекте нет демонстрационных результатов — пустой каталог не выдаётся за заполненный. Серверный ключ не используется в интерфейсе.
