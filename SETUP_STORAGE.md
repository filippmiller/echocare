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
   - **Public bucket:** ❌ НЕ включать (оставить выключенным)
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
user/clx123abc456/2025/11/11/clx789def012.webm
```

### Важно:

- ✅ Bucket должен быть **Private**
- ✅ Доступ только через Service Role Key (серверные роуты)
- ✅ Клиент никогда не получает прямой доступ к Storage
- ✅ Все операции загрузки проходят через `/api/journal/upload`

