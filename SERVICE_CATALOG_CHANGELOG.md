# Service Catalog & Business Services Module - Changelog

**Date:** 2025-01-27  
**Status:** ✅ Completed

---

## 📋 Summary

Реализован модуль каталога услуг и кабинет бизнеса для управления услугами мест.

---

## 🗄️ Database Changes

### New Models Added

1. **City**
   - `id`, `code` (unique), `nameRu`, `nameEn`, `sortOrder`
   - Индексы: `code`

2. **BusinessAccount**
   - `id`, `userId` (unique, FK → User), `companyName`
   - Связь 1:1 с User

3. **Place**
   - `id`, `businessId` (FK → BusinessAccount), `cityId` (FK → City)
   - `name`, `address`, `status` (pending/approved/published)
   - Индексы: `businessId`, `cityId`

4. **ServiceCategory**
   - `id`, `code` (unique), `nameRu`, `nameEn`, `icon`, `sortOrder`
   - Индексы: `code`, `sortOrder`

5. **ServiceType**
   - `id`, `categoryId` (FK → ServiceCategory), `code` (unique)
   - `nameRu`, `nameEn`, `shortDescription`
   - `defaultDurationMinutes`, `pricingUnit` (enum), `isActive`
   - Индексы: `categoryId`, `code`, `isActive`

6. **PlaceService**
   - `id`, `placeId` (FK → Place), `serviceTypeId` (FK → ServiceType)
   - `priceFrom`, `priceTo`, `currency` (default: RUB)
   - `durationMinutes`, `isActive`, `isSpecialOffer`, `specialLabel`, `notes`
   - Unique constraint: `[placeId, serviceTypeId]`
   - Индексы: `placeId`, `serviceTypeId`, `isActive`

### New Enums

- **ServicePricingUnit**: `PER_SERVICE`, `PER_ITEM`, `PER_HOUR`
- **Role**: добавлено значение `BUSINESS_OWNER`

### Migration

- Файл: `prisma/migrations/20250127010000_add_service_catalog_and_business/migration.sql`
- Применена к базе данных

---

## 🌱 Seed Data

### Created Seed File

- Файл: `prisma/seed.ts`
- Команда: `pnpm prisma:seed`

### Seed Content

**Cities:**
- СПб (SPB) - Санкт-Петербург
- Москва (MSK) - Moscow

**Service Categories:**
- BEAUTY - Красота и уход (icon: scissors)
- DRY_CLEANING - Химчистка (icon: tshirt)
- KEYS_SHOES - Ключи и ремонт обуви (icon: key)
- FOOD_DRINK - Кофе/еда (icon: coffee)

**Service Types:**

**BEAUTY:**
- `female_haircut` - Женская стрижка (60 min, PER_SERVICE)
- `male_haircut` - Мужская стрижка (30 min, PER_SERVICE)
- `beard_trim` - Стрижка бороды (20 min, PER_SERVICE)
- `manicure_classic` - Маникюр классический (60 min, PER_SERVICE)

**DRY_CLEANING:**
- `dry_cleaning_coat` - Химчистка пальто (PER_ITEM)
- `dry_cleaning_suit` - Химчистка костюма (PER_ITEM)

**KEYS_SHOES:**
- `key_cutting_standard` - Изготовление обычных ключей (15 min, PER_ITEM)

---

## 🔌 API Endpoints

### Public Catalog API

1. **GET /api/services/categories**
   - Публичный доступ
   - Возвращает список всех категорий услуг
   - Response: `{ categories: ServiceCategory[] }`

2. **GET /api/services/types**
   - Публичный доступ
   - Query params:
     - `categoryId` (optional) - фильтр по категории
     - `q` (optional) - текстовый поиск
   - Response: `{ serviceTypes: ServiceType[] }`

### Business Management API

3. **GET /api/business/places/[placeId]/services**
   - Доступ: BUSINESS_OWNER (владелец места) или ADMIN
   - Возвращает список услуг места
   - Response: `{ services: PlaceService[] }`

4. **POST /api/business/places/[placeId]/services**
   - Доступ: BUSINESS_OWNER (владелец места) или ADMIN
   - Создает новую услугу для места
   - Body: `{ serviceTypeId, priceFrom?, priceTo?, currency?, durationMinutes?, isActive?, isSpecialOffer?, specialLabel?, notes? }`
   - Response: `{ service: PlaceService }`

5. **PATCH /api/business/places/[placeId]/services/[placeServiceId]**
   - Доступ: BUSINESS_OWNER (владелец места) или ADMIN
   - Обновляет услугу места
   - Body: частичное обновление полей
   - Response: `{ service: PlaceService }`

6. **DELETE /api/business/places/[placeId]/services/[placeServiceId]**
   - Доступ: BUSINESS_OWNER (владелец места) или ADMIN
   - Деактивирует услугу (soft delete через `isActive = false`)
   - Response: `{ success: true }`

---

## 🛡️ Security & Permissions

### Helper Module

- Файл: `src/lib/modules/business/permissions.ts`
- Функции:
  - `checkPlaceOwnership(session, placeId)` - проверка владения местом
  - `isBusinessUser(session)` - проверка роли BUSINESS_OWNER или ADMIN

### Middleware Updates

- Добавлен маршрут `/business` в защищенные роуты
- Требуется аутентификация для доступа к бизнес-кабинету

---

## 🎨 UI Components

### Pages

1. **/business/dashboard**
   - Страница списка мест бизнеса
   - Показывает все места пользователя с их статусами
   - Кнопка "Manage Services" для каждого места
   - Автоматическое создание BusinessAccount при первом входе

2. **/business/places/[placeId]/services**
   - Страница управления услугами места
   - Список активных услуг с категориями и ценами
   - Кнопка "Add Service" для добавления новой услуги
   - Кнопка удаления для каждой услуги

### Components

1. **PlaceServicesList** (`src/components/business/place-services-list.tsx`)
   - Отображает список услуг места
   - Управление добавлением и удалением услуг
   - Интеграция с модальным окном добавления

2. **AddServiceModal** (`src/components/business/add-service-modal.tsx`)
   - Модальное окно для добавления услуги
   - Пошаговый выбор: категория → тип услуги → параметры
   - Автозаполнение длительности из типа услуги
   - Поддержка специальных предложений

---

## 📝 Files Created/Modified

### Created Files

**Database:**
- `prisma/migrations/20250127010000_add_service_catalog_and_business/migration.sql`
- `prisma/seed.ts`

**API:**
- `src/app/api/services/categories/route.ts`
- `src/app/api/services/types/route.ts`
- `src/app/api/business/places/[placeId]/services/route.ts`
- `src/app/api/business/places/[placeId]/services/[placeServiceId]/route.ts`

**Permissions:**
- `src/lib/modules/business/permissions.ts`

**Pages:**
- `src/app/business/dashboard/page.tsx`
- `src/app/business/places/[placeId]/services/page.tsx`

**Components:**
- `src/components/business/place-services-list.tsx`
- `src/components/business/add-service-modal.tsx`

### Modified Files

- `prisma/schema.prisma` - добавлены новые модели и enum
- `package.json` - добавлен скрипт `prisma:seed`
- `middleware.ts` - добавлена защита маршрута `/business`

---

## ✅ Testing Instructions

### 1. Apply Migrations & Seed Data

```bash
pnpm prisma migrate deploy
pnpm prisma generate
pnpm prisma:seed
```

### 2. Create Business Owner User

Создайте пользователя с ролью `BUSINESS_OWNER` (можно через регистрацию и ручное изменение в БД или через скрипт).

### 3. Create Test Place

В Prisma Studio или через SQL создайте:
- City (если нет в seed)
- BusinessAccount для пользователя
- Place для бизнеса

### 4. Test Flow

1. Войдите под BUSINESS_OWNER
2. Откройте `/business/dashboard`
3. Убедитесь, что видите список мест
4. Перейдите на `/business/places/[placeId]/services`
5. Нажмите "Add Service"
6. Выберите категорию → тип услуги → заполните параметры
7. Сохраните и убедитесь, что услуга появилась в списке
8. Попробуйте удалить услугу

### 5. Test API

```bash
# Get categories
curl http://localhost:3005/api/services/categories

# Get service types
curl http://localhost:3005/api/services/types?categoryId=<categoryId>

# Get place services (requires auth)
curl -H "Cookie: ..." http://localhost:3005/api/business/places/<placeId>/services
```

---

## 🚀 Next Steps

1. **Пользовательский поиск**
   - Поиск мест по услугам и городу
   - Фильтрация по категориям и типам услуг
   - Сортировка по рейтингу/расстоянию

2. **Публичные карточки мест**
   - Отображение услуг в карточках мест
   - Показ цен и специальных предложений
   - Интеграция с картами

3. **Кастомные услуги**
   - Возможность бизнесу создавать услуги, не входящие в глобальный каталог
   - Модерация кастомных услуг администратором

4. **Расширенное управление**
   - Редактирование услуг (сейчас только удаление)
   - Массовое управление услугами
   - Импорт/экспорт услуг

5. **Аналитика**
   - Статистика по услугам
   - Популярные услуги
   - Отчеты для бизнеса

---

**Module Version:** 1.0  
**Last Updated:** 2025-01-27

