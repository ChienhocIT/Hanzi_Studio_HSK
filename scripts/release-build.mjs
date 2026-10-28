// Only the production build may run cloud DDL. Preview builds never mutate it.
if(process.env.VERCEL_ENV==='production') {
  const {migrateCloud}=await import('./migrate.mjs');
  await migrateCloud();
}
await import('./build.mjs');
