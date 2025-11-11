# Инструкции по настройке Supabase Storage

## Создание Bucket `journal-audio`

### Шаги:

1. Откройте Supabase Dashboard:
   - URL: https://supabase.com/dashboard/project/gnywltdograatcpqhyzd

2. Перейдите в раздел Storage:
   - В левом меню выберите "Storage"

3. Создайте новый bucket:
   - Нажмите кнопку "New bucket"
   - **Name:** `journal-audio`
   - **Public bucket:** ❌ НЕ включать (оставить выключенным) - **Private**
   - Нажмите "Create bucket"

4. Проверка настроек:
   - Bucket должен быть **Private**
   - Никаких публичных правил/URL на этом этапе не требуется
   - Доступ будет контролироваться через Service Role Key в серверных API роутах

### Структура путей в Storage:

Файлы будут сохраняться по следующей схеме:
```
user/<userId>/<yyyy>/<mm>/<dd>/<cuid>.<ext>
```

Пример:
```
user/clx123abc456/2025/11/12/clx789def012.webm
```

### Переменные окружения

Убедитесь, что в Railway и локально заданы следующие переменные:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://gnywltdograatcpqhyzd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<ваш-service-role-key>
SUPABASE_BUCKET=journal-audio
ALLOWED_AUDIO_MIME=audio/webm,audio/ogg,audio/m4a,audio/mp3
MAX_AUDIO_MB=20
```

### Важно:

- ✅ Bucket должен быть **Private**
- ✅ Доступ только через Service Role Key (серверные роуты)
- ✅ Клиент никогда не получает прямой доступ к Storage
- ✅ Все операции загрузки проходят через `/api/journal/upload`
- ⚠️ Если bucket отсутствует, API загрузки должны отдавать **503** с понятным текстом

### Проверка после создания:

1. В Supabase Dashboard → Storage → `journal-audio` должен быть виден
2. Статус: **Private**
3. В коде проверка bucket выполняется в `src/lib/supabaseServer.ts` и `src/app/api/journal/upload/route.ts`


