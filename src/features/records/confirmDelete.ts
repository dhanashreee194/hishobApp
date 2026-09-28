import {Alert} from 'react-native';
import {database} from '../../db';
import {softDeleteRecord} from '../../db/deletion';
import {useLocale} from '../../i18n/locale';
import {translate} from '../../i18n/phrases';

export function confirmDelete(table: string, id: string, reload: () => Promise<void> | void) {
  const locale = useLocale.getState().locale;
  const tx = (value: string) => translate(locale, value);
  Alert.alert(tx('नोंद काढायची?'), tx('ती काढलेल्या नोंदींमध्ये राहील. मालक सेटिंग्जमधून परत आणू शकतो.'), [
    {text: tx('रद्द'), style: 'cancel'},
    {
      text: tx('काढा'),
      style: 'destructive',
      onPress: () => {
        softDeleteRecord(database, table, id)
          .then(() => reload())
          .catch(() => undefined);
      },
    },
  ]);
}
