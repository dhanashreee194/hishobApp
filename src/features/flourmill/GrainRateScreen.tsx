import React from 'react';
import {database} from '../../db';
import {loadGrains} from '../../db/reads';
import {useAsyncData} from '../../hooks/useAsyncData';
import {RateMasterScreen} from '../masters/RateMasterScreen';

export function GrainRateScreen() {
  const grains = useAsyncData(() => loadGrains(database), []);
  return (
    <RateMasterScreen
      masterType="grain"
      items={grains.data.map(grain => ({id: grain.id, name: grain.name}))}
    />
  );
}
