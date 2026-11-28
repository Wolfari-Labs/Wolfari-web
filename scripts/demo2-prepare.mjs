import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { backendFile } from './demo-paths.mjs';

const { loadManifest } = await import(backendFile('scripts/demo-config.mjs'));
const { api, login } = await import(backendFile('scripts/demo-scenarios.mjs'));
const manifest = await loadManifest();
const seed = JSON.parse(await readFile(backendFile('.local/demo/seed.json'), 'utf8'));
if (manifest.gatewayUrl !== 'http://127.0.0.1:13000' || seed.instanceId !== manifest.instanceId) {
  throw Error('Use the seeded local demo instance');
}
const actor = await login(seed.accounts.owner);
const root = '/api/v1/trips/' + seed.resources.tripId;
const read = async (path) => (await api(root + path, 'GET', undefined, actor)).data;
const trip = await read('');
if (trip.timezone !== 'Asia/Ho_Chi_Minh' || trip.current_membership.role !== 'OWNER') {
  throw Error('Expected the demo owner and the Vietnam itinerary');
}
const day = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: trip.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(date));
const firstDay = day(trip.start_at);
const dayTwo = day(Math.min(Date.parse(trip.start_at) + 86400000, Date.parse(trip.end_at)));
const post = (path, body) => api(root + path, 'POST', body, actor, randomUUID(), [200, 201]);

for (const [index, date] of [firstDay, firstDay, day(trip.end_at)].entries()) {
  const plan = await read('/plan');
  const id = seed.operations['activity-' + index]?.result?.id;
  if (plan.activities.some((a) => a.id === id && !a.scheduled_date && !a.starts_at)) {
    await api(root + '/activities/' + id, 'PATCH', {
      expected_plan_version: plan.plan_version, scheduled_date: date,
    }, actor, randomUUID());
  }
}

for (const [key, title] of [['dn-cau-rong', 'Cầu Rồng'], ['dn-cau-song-han', 'Cầu Sông Hàn']]) {
  let plan = await read('/plan');
  let location = plan.selected_locations.find((p) => p.provider === 'WOLFARI' && p.provider_place_id === key);
  if (!location) {
    const query = new URLSearchParams({ q: title, geocode: 'false', latitude:'16.06', longitude:'108.22', radius_m:'5000' });
    const hit = (await read('/places/search?' + query)).find((p) => p.provider === 'WOLFARI' && p.id === key);
    if (!hit) throw Error('Local POI catalog required for ' + title);
    await post('/selected-locations', {expected_plan_version:plan.plan_version, selection_token:hit.selection_token});
    plan = await read('/plan');
    location = plan.selected_locations.find((p) => p.provider === 'WOLFARI' && p.provider_place_id === key);
  }
  if (!location) throw Error('Saved place missing after refresh');
  if (!plan.activities.some((a) => a.selected_location_id === location.id)) {
    await post('/activities', {expected_plan_version:plan.plan_version, title, activity_type:'SIGHTSEEING',
      selected_location_id:location.id, scheduled_date:firstDay, position:plan.activities.length});
  }
}
for (const [title, type, start, end] of [
  ['Dạo biển Mỹ Khê', 'BEACH', '07:00', '08:00'],
  ['Thăm Nhà thờ Chính tòa Đà Nẵng', 'CHURCH', '09:30', '10:30'],
]) {
  const plan = await read('/plan');
  if (!plan.activities.some((a) => a.title === title)) {
    await post('/activities', {expected_plan_version:plan.plan_version, title, activity_type:type,
      starts_at:dayTwo+'T'+start+':00+07:00', ends_at:dayTwo+'T'+end+':00+07:00', position:plan.activities.length});
  }
}

const members = (await read('/members')).items;
for (const [name, unit, category, memberName] of [
  ['Bình nước cá nhân', 'bình', 'Đi biển', seed.accounts.owner.fullName],
  ['Khăn choàng khi tham quan', 'chiếc', 'Trang phục', seed.accounts.member.fullName],
  ['Bộ sơ cứu nhóm', 'bộ', 'Y tế', seed.accounts.holder.fullName],
]) {
  const plan = await read('/plan');
  if (!plan.packing_items.some((p) => p.name === name)) {
    const member = members.find((m) => m.display_name === memberName);
    await post('/packing-items', {expected_plan_version:plan.plan_version, name, category, quantity:'1', unit,
      assigned_member_id:member?.id ?? null, due_at:firstDay+'T18:00:00+07:00'});
  }
}
const plan = await read('/plan');
const bottle = plan.packing_items.find((p) => p.name === 'Bình nước cá nhân');
const remindAt = Date.parse(bottle.due_at) - 3600000;
const reminders = await read('/reminders');
if (bottle.assigned_member_id === trip.current_membership.id && remindAt > Date.now() &&
    !reminders.some((r) => r.source_id === bottle.id && r.source_type === 'PACKING')) {
  await post('/reminders', {source_type:'PACKING', source_id:bottle.id, remind_at:new Date(remindAt).toISOString()});
}
console.log(JSON.stringify({activities:plan.activities.length, places:plan.selected_locations.length,
  packing:plan.packing_items.length, dressCodes:plan.dress_codes.length, reminders:(await read('/reminders')).length,
  planVersion:plan.plan_version, firstDay, dayTwo}));
