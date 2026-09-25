import {Alert} from 'react-native';
import {database} from '../../db';
import {softDeleteRecord} from '../../db/deletion';

export function confirmDelete(table: string, id: string, reload: () => Promise<void> | void) {
  Alert.alert(
    'नोंद काढायची?',
    'ती काढलेल्या नोंदींमध्ये राहील. मालक सेटिंग्जमधून परत आणू शकतो.',
    [
      {text: 'रद्द', style: 'cancel'},
      {
        text: 'काढा',
        style: 'destructive',
        onPress: () => {
          softDeleteRecord(database, table, id)
            .then(() => reload())
            .catch(() => undefined);
        },
      },
    ],
  );
}
