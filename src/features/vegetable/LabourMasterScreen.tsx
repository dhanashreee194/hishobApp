import React from 'react';
import {database} from '../../db';
import {loadCategories} from '../../db/reads';
import {createLabourCategory, renameCategory, setMasterActive} from '../../db/writes';
import {useAsyncData} from '../../hooks/useAsyncData';
import {NameMasterScreen} from '../masters/NameMasterScreen';

export function LabourMasterScreen() {
  const categories = useAsyncData(() => loadCategories(database), []);
  const labour = categories.data.filter(item => item.categoryGroup === 'labour');
  return (
    <NameMasterScreen
      showUnit={false}
      rows={labour.map(item => ({
        id: item.id,
        name: item.name,
        unit: '',
        active: item.active,
      }))}
      onSave={async input => {
        if (input.id) {
          await renameCategory(database, input.id, input.name);
        } else {
          await createLabourCategory(database, input.name);
        }
        await categories.reload();
      }}
      onToggle={async (id, active) => {
        await setMasterActive(database, 'expense_categories', id, active);
        await categories.reload();
      }}
    />
  );
}
