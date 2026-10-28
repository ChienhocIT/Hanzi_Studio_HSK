export const KEYS = ['hanzi-studio-hsk3-prod-v1', 'hanzi-studio-curriculum-v4', 'hanzi-studio-video-lab-v1', 'hanzi-studio-situations-v4'];
export const OWNER = 'hanzi-cloud-owner';
export const META = 'hanzi-cloud-sync';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validateSnapshot(value) {
  if (!object(value) || Object.keys(value).some(key => !KEYS.includes(key))) throw Error('Nhóm dữ liệu không hợp lệ.');
  if (JSON.stringify(value).length > 6 * 1024 * 1024) throw Error('Tiến độ vượt giới hạn 6 MB. Hãy xuất bản sao lưu.');
  for (const [key, group] of Object.entries(value)) {
    if (!object(group)) throw Error('Dữ liệu học không hợp lệ.');
    if (key === KEYS[0] && (group.v !== 1 || !object(group.records) || !Array.isArray(group.bookmarks) || !Array.isArray(group.events) || !Array.isArray(group.quizHistory) || !object(group.settings))) throw Error('Tiến độ HSK 3 sai cấu trúc.');
    if (key === KEYS[1] && (!object(group.progress) || !Array.isArray(group.injected) || !Array.isArray(group.importLog))) throw Error('Lộ trình sai cấu trúc.');
    if (key === KEYS[2] && (!Array.isArray(group.lessons) || !object(group.stats))) throw Error('Dữ liệu video sai cấu trúc.');
  }
  return value;
}
export function snapshot(storage) {
  const result = {};
  for (const key of KEYS) { const raw = storage.getItem(key); if (raw !== null) result[key] = JSON.parse(raw); }
  return validateSnapshot(result);
}
export function archive(storage, owner) {
  const data = snapshot(storage);
  storage.setItem(`hanzi-cloud-archive:${owner || 'guest'}`, JSON.stringify(data));
  return data;
}
export function applySnapshot(storage, data) {
  validateSnapshot(data);
  const previous = KEYS.map(key => storage.getItem(key));
  try {
    for (const key of KEYS) if (data[key] === undefined) storage.removeItem(key); else storage.setItem(key, JSON.stringify(data[key]));
  } catch (error) {
    for (let i = 0; i < KEYS.length; i++) { try { if (previous[i] === null) storage.removeItem(KEYS[i]); else storage.setItem(KEYS[i], previous[i]); } catch {} }
    throw error;
  }
}
export function switchOwner(storage, owner) {
  const current = storage.getItem(OWNER) || '';
  if (current === (owner || '')) return false;
  archive(storage, current);
  const saved = JSON.parse(storage.getItem(`hanzi-cloud-archive:${owner || 'guest'}`) || '{}');
  const previous=snapshot(storage), meta=storage.getItem(META);
  try {
    applySnapshot(storage, saved);
    storage.setItem(OWNER, owner || '');
    storage.removeItem(META);
  } catch(error) {
    applySnapshot(storage,previous);
    if(current)storage.setItem(OWNER,current);else storage.removeItem(OWNER);
    if(meta!==null)storage.setItem(META,meta);
    throw error;
  }
  return true;
}
// Whole-snapshot compare-and-swap. Never silently merge SRS or overwrite a newer device.
export async function uploadProgress(client, storage, userId) {
  if (storage.getItem(OWNER) !== userId) throw Error('Tài khoản đã thay đổi. Hãy tải lại trang.');
  const data = snapshot(storage);
  const meta = JSON.parse(storage.getItem(META) || 'null');
  if (!meta || meta.owner !== userId) throw Error('Hãy chọn dữ liệu khởi đầu trước khi đồng bộ.');
  const { data: revision, error } = await client.rpc('save_progress', { expected_revision: meta.revision, payload: data, owner_uuid: userId });
  if (error) throw error;
  if (storage.getItem(OWNER) !== userId) throw Error('Tài khoản đã thay đổi trong lúc đồng bộ.');
  storage.setItem(META, JSON.stringify({ owner: userId, revision, synced: JSON.stringify(data) }));
  return { revision, pending: JSON.stringify(snapshot(storage)) !== JSON.stringify(data) };
}
export function recoveryBackup(data) {
  validateSnapshot(data);
  return {format:'hanzi-studio-full-backup',version:1,appVersion:'4.2',exportedAt:new Date().toISOString(),storage:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)]))};
}
