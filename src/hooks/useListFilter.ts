import {useEffect, useState} from 'react';
import type {ListFilter} from '../domain/listFilter';

export function useListFilter(filter: ListFilter | undefined) {
  const [text, setText] = useState(filter?.text ?? '');
  const [from, setFrom] = useState<number | null>(filter?.from ?? null);
  const [to, setTo] = useState<number | null>(filter?.to ?? null);
  const key = `${filter?.text ?? ''}|${filter?.from ?? ''}|${filter?.to ?? ''}`;

  useEffect(() => {
    setText(filter?.text ?? '');
    setFrom(filter?.from ?? null);
    setTo(filter?.to ?? null);
  }, [key, filter?.text, filter?.from, filter?.to]);

  return {text, setText, from, to, setFrom, setTo};
}
