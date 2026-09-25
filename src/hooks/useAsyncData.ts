import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useRef, useState} from 'react';

export function useAsyncData<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'माहिती लोड करता आली नाही');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loaderRef
        .current()
        .then(value => {
          if (!cancelled) {
            setData(value);
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setError(caught instanceof Error ? caught.message : 'माहिती लोड करता आली नाही');
          }
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return {data, error, reload};
}
