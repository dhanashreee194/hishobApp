import ReactNativeBlobUtil from 'react-native-blob-util';

const folderName = 'mazahishob-backups';

async function folder(): Promise<string> {
  const path = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${folderName}`;
  if (!(await ReactNativeBlobUtil.fs.exists(path))) {
    await ReactNativeBlobUtil.fs.mkdir(path);
  }
  return path;
}

export async function writeLocalBackup(sealed: string, createdAt: number): Promise<string> {
  const path = `${await folder()}/backup-${createdAt}.mhb`;
  await ReactNativeBlobUtil.fs.writeFile(path, sealed, 'utf8');
  return path;
}

export async function listLocalBackups(): Promise<Array<{name: string; path: string}>> {
  const path = await folder();
  const names = await ReactNativeBlobUtil.fs.ls(path);
  return names
    .filter(name => name.endsWith('.mhb'))
    .sort()
    .reverse()
    .map(name => ({name, path: `${path}/${name}`}));
}

export async function readLocalBackup(path: string): Promise<string> {
  return ReactNativeBlobUtil.fs.readFile(path, 'utf8');
}
