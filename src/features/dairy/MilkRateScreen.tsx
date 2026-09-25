import React from 'react';
import {RateMasterScreen} from '../masters/RateMasterScreen';
import {MILK_RATE_ITEM_ID} from '../../domain/labels';

export function MilkRateScreen() {
  return (
    <RateMasterScreen
      masterType="milk"
      items={[{id: MILK_RATE_ITEM_ID, name: 'दूध'}]}
    />
  );
}
