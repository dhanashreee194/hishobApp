import {addColumns, createTable, schemaMigrations, unsafeExecuteSql} from '@nozbe/watermelondb/Schema/migrations';
import {financialTables} from './queries';
import {schema} from './schema';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'expense_categories',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'business_type', type: 'string', isIndexed: true},
            {name: 'category_group', type: 'string', isIndexed: true},
            {name: 'active', type: 'boolean'},
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        unsafeExecuteSql(
          'create table if not exists "expense_categories" ("id" primary key, "_changed", "_status", "name", "business_type", "category_group", "active");',
        ),
        unsafeExecuteSql(
          'create index if not exists "expense_categories_business_type" on "expense_categories" ("business_type");',
        ),
        unsafeExecuteSql(
          'create index if not exists "expense_categories_category_group" on "expense_categories" ("category_group");',
        ),
        unsafeExecuteSql(
          'create index if not exists "expense_categories__status" on "expense_categories" ("_status");',
        ),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'partner_payments',
          columns: [
            {name: 'partner_id', type: 'string', isIndexed: true},
            {name: 'date', type: 'number', isIndexed: true},
            {name: 'amount', type: 'number'},
            {name: 'notes', type: 'string', isOptional: true},
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: Object.keys(schema.tables).map(table =>
        addColumns({
          table,
          columns: [{name: 'updated_at', type: 'number'}],
        }),
      ),
    },
    {
      toVersion: 6,
      steps: [
        ...financialTables.map(table =>
          addColumns({
            table,
            columns: [
              {name: 'is_deleted', type: 'boolean', isIndexed: true},
              {name: 'created_at', type: 'number', isIndexed: true},
              {name: 'created_by', type: 'string', isOptional: true},
            ],
          }),
        ),
        unsafeExecuteSql(
          'create index if not exists "customers_name" on "customers" ("name");',
        ),
        unsafeExecuteSql(
          'create index if not exists "grain_masters_name" on "grain_masters" ("name");',
        ),
        unsafeExecuteSql(
          'create index if not exists "vegetable_masters_name" on "vegetable_masters" ("name");',
        ),
        ...financialTables.map(table =>
          unsafeExecuteSql(
            `update "${table}" set "created_at" = "updated_at" where "created_at" = 0;`,
          ),
        ),
        ...financialTables.map(table =>
          unsafeExecuteSql(
            `update "${table}" set "created_by" = 'owner' where "created_by" is null;`,
          ),
        ),
      ],
    },
    {
      toVersion: 7,
      steps: [
        createTable({
          name: 'stock_movements',
          columns: [
            {name: 'date', type: 'number', isIndexed: true},
            {name: 'kind', type: 'string', isIndexed: true},
            {name: 'grain_id', type: 'string', isIndexed: true},
            {name: 'direction', type: 'string'},
            {name: 'quantity', type: 'number'},
            {name: 'unit', type: 'string'},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'is_deleted', type: 'boolean', isIndexed: true},
            {name: 'created_at', type: 'number', isIndexed: true},
            {name: 'created_by', type: 'string', isOptional: true},
            {name: 'updated_at', type: 'number'},
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'partners',
          columns: [{name: 'business_type', type: 'string', isIndexed: true}],
        }),
        unsafeExecuteSql(
          `update "partners" set "business_type" = 'vegetable' where "business_type" is null or "business_type" = '';`,
        ),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'businesses',
          columns: [
            {name: 'tracking', type: 'string', isIndexed: true},
            {name: 'buys', type: 'boolean'},
            {name: 'produces', type: 'boolean'},
            {name: 'sells', type: 'boolean'},
            {name: 'tracks_credit', type: 'boolean'},
            {name: 'tracks_billing', type: 'boolean'},
          ],
        }),
        unsafeExecuteSql(
          `update "businesses" set "tracking" = 'resale' where "tracking" is null or "tracking" = '';`,
        ),
        unsafeExecuteSql(`update "businesses" set "buys" = 1 where "buys" is null;`),
        unsafeExecuteSql(`update "businesses" set "produces" = 0 where "produces" is null;`),
        unsafeExecuteSql(`update "businesses" set "sells" = 1 where "sells" is null;`),
        unsafeExecuteSql(`update "businesses" set "tracks_credit" = 1 where "tracks_credit" is null;`),
        unsafeExecuteSql(`update "businesses" set "tracks_billing" = 1 where "tracks_billing" is null;`),
        createTable({
          name: 'catalog_products',
          columns: [
            {name: 'business_id', type: 'string', isIndexed: true},
            {name: 'name', type: 'string'},
            {name: 'unit', type: 'string'},
            {name: 'kind', type: 'string'},
            {name: 'active', type: 'boolean'},
            {name: 'updated_at', type: 'number'},
          ],
        }),
        createTable({
          name: 'product_moves',
          columns: [
            {name: 'date', type: 'number', isIndexed: true},
            {name: 'business_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'direction', type: 'string', isIndexed: true},
            {name: 'quantity', type: 'number'},
            {name: 'unit', type: 'string'},
            {name: 'amount', type: 'number'},
            {name: 'paid_amount', type: 'number'},
            {name: 'customer_id', type: 'string', isOptional: true, isIndexed: true},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'is_deleted', type: 'boolean', isIndexed: true},
            {name: 'created_at', type: 'number', isIndexed: true},
            {name: 'created_by', type: 'string', isOptional: true},
            {name: 'updated_at', type: 'number'},
          ],
        }),
        createTable({
          name: 'business_expenses',
          columns: [
            {name: 'date', type: 'number', isIndexed: true},
            {name: 'business_id', type: 'string', isIndexed: true},
            {name: 'kind', type: 'string', isIndexed: true},
            {name: 'amount', type: 'number'},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'is_deleted', type: 'boolean', isIndexed: true},
            {name: 'created_at', type: 'number', isIndexed: true},
            {name: 'created_by', type: 'string', isOptional: true},
            {name: 'updated_at', type: 'number'},
          ],
        }),
        createTable({
          name: 'partner_scopes',
          columns: [
            {name: 'partner_id', type: 'string', isIndexed: true},
            {name: 'business_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isOptional: true, isIndexed: true},
            {name: 'updated_at', type: 'number'},
          ],
        }),
        createTable({
          name: 'collaborators',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'phone', type: 'string', isIndexed: true},
            {name: 'business_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isOptional: true, isIndexed: true},
            {name: 'active', type: 'boolean'},
            {name: 'updated_at', type: 'number'},
          ],
        }),
      ],
    },
  ],
});
