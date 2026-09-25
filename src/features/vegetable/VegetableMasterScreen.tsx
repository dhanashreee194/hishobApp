import React from 'react';
import {database} from '../../db';
import {loadVegetables} from '../../db/reads';
import {createNamedMaster, setMasterActive, updateNamedMaster} from '../../db/writes';
import {useAsyncData} from '../../hooks/useAsyncData';
import {NameMasterScreen} from '../masters/NameMasterScreen';

export function VegetableMasterScreen() {
  const vegetables = useAsyncData(() => loadVegetables(database), []);
  return (
    <NameMasterScreen
      showUnit
      rows={vegetables.data}
      onSave={async input => {
        if (input.id) {
          await updateNamedMaster(database, 'vegetable_masters', {
            id: input.id,
            name: input.name,
            unit: input.unit,
          });
        } else {
          await createNamedMaster(database, 'vegetable_masters', input);
        }
        await vegetables.reload();
      }}
      onToggle={async (id, active) => {
        await setMasterActive(database, 'vegetable_masters', id, active);
        await vegetables.reload();
      }}
    />
  );
}
