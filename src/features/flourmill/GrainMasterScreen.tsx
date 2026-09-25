import React from 'react';
import {database} from '../../db';
import {loadGrains} from '../../db/reads';
import {createNamedMaster, setMasterActive, updateNamedMaster} from '../../db/writes';
import {useAsyncData} from '../../hooks/useAsyncData';
import {NameMasterScreen} from '../masters/NameMasterScreen';

export function GrainMasterScreen() {
  const grains = useAsyncData(() => loadGrains(database), []);
  return (
    <NameMasterScreen
      showUnit
      rows={grains.data}
      onSave={async input => {
        if (input.id) {
          await updateNamedMaster(database, 'grain_masters', {
            id: input.id,
            name: input.name,
            unit: input.unit,
          });
        } else {
          await createNamedMaster(database, 'grain_masters', input);
        }
        await grains.reload();
      }}
      onToggle={async (id, active) => {
        await setMasterActive(database, 'grain_masters', id, active);
        await grains.reload();
      }}
    />
  );
}
