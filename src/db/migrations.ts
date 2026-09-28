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
        createTable({
          name: 'partner_products',
          columns: [
            {name: 'partner_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'updated_at', type: 'number'},
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'flour_items',
          columns: [{name: 'custom_name', type: 'string', isOptional: true}],
        }),
        addColumns({
          table: 'vegetable_sale_items',
          columns: [
            {name: 'applied_rate', type: 'number', isOptional: true},
            {name: 'opening_quantity', type: 'number', isOptional: true},
            {name: 'remaining_quantity', type: 'number', isOptional: true},
          ],
        }),
      ],
    },
  ],
});
