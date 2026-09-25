import ReactNativeBlobUtil from 'react-native-blob-util';
import {Platform} from 'react-native';
import {reportToCsv, reportToPdf} from '../../domain/reportExport';
import type {BuiltReport} from '../../domain/reports';

declare function atob(data: string): string;
declare function btoa(data: string): string;

export async function exportReportCsv(report: BuiltReport): Promise<string> {
  const name = `maza-hishob-${Date.now()}.csv`;
  return saveAndOpen(name, reportToCsv(report), 'utf8', 'text/csv');
}

export async function exportReportPdf(report: BuiltReport): Promise<string> {
  const font = await loadDevanagariFont();
  const bytes = await reportToPdf(report, font);
  const name = `maza-hishob-${Date.now()}.pdf`;
  return saveAndOpen(name, bytesToBase64(bytes), 'base64', 'application/pdf');
}

async function loadDevanagariFont(): Promise<Uint8Array> {
  const path =
    Platform.OS === 'android'
      ? ReactNativeBlobUtil.fs.asset('fonts/NotoSansDevanagari-Regular.ttf')
      : `${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/NotoSansDevanagari-Regular.ttf`;
  const base64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function saveAndOpen(
  name: string,
  data: string,
  encoding: 'utf8' | 'base64',
  mime: string,
): Promise<string> {
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
  await ReactNativeBlobUtil.fs.writeFile(path, data, encoding);
  if (Platform.OS === 'android') {
    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      {name, parentFolder: 'MazaHishob', mimeType: mime},
      'Download',
      path,
    );
    try {
      await ReactNativeBlobUtil.android.actionViewIntent(path, mime);
    } catch {
      // The file is already in Downloads when no viewer is installed.
    }
  }
  return name;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
