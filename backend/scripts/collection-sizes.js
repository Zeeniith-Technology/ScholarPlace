/**
 * List MongoDB collection sizes (data + indexes) for ScholarPlace.
 * Run from backend: node scripts/collection-sizes.js
 * Helps answer "why is my cluster 119 MB for 2-3 users?"
 */

import { connectDB, getDB } from '../methods.js';

async function main() {
  await connectDB();
  const db = getDB();
  if (!db) {
    console.error('Could not connect to DB. Set MONGODB_URI and run from backend.');
    process.exit(1);
  }

  const cols = await db.listCollections().toArray();
  const stats = await Promise.all(
    cols.map(async (c) => {
      const name = c.name;
      const coll = db.collection(name);
      const [s, count] = await Promise.all([
        coll.stats().catch(() => null),
        coll.countDocuments().catch(() => 0),
      ]);
      const sizeMB = s && s.size != null ? (s.size / (1024 * 1024)).toFixed(2) : '—';
      const storageMB = s && s.storageSize != null ? (s.storageSize / (1024 * 1024)).toFixed(2) : '—';
      const indexMB = s && s.totalIndexSize != null ? (s.totalIndexSize / (1024 * 1024)).toFixed(2) : '—';
      return { name, count, sizeMB, storageMB, indexMB, avgDocKB: s && count > 0 && s.size ? (s.size / count / 1024).toFixed(1) : '—' };
    })
  );

  stats.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));

  console.log('\n--- ScholarPlace collection sizes (largest first) ---\n');
  console.log('Collection              Documents   Data (MB)   Storage (MB)   Index (MB)   Avg doc (KB)');
  console.log('--------------------------------------------------------------------------------------------');
  let totalData = 0, totalStorage = 0, totalIndex = 0;
  for (const s of stats) {
    const data = parseFloat(s.sizeMB);
    const storage = parseFloat(s.storageMB);
    const idx = parseFloat(s.indexMB);
    if (!isNaN(data)) totalData += data;
    if (!isNaN(storage)) totalStorage += storage;
    if (!isNaN(idx)) totalIndex += idx;
    console.log(
      `${s.name.padEnd(22)} ${String(s.count).padStart(10)} ${String(s.sizeMB).padStart(11)} ${String(s.storageMB).padStart(14)} ${String(s.indexMB).padStart(12)} ${String(s.avgDocKB).padStart(14)}`
    );
  }
  console.log('--------------------------------------------------------------------------------------------');
  console.log(`Total (data): ${totalData.toFixed(2)} MB  |  Storage (on disk): ~${totalStorage.toFixed(2)} MB  |  Indexes: ~${totalIndex.toFixed(2)} MB\n`);
  console.log('Why 119 MB for 2-3 users?');
  console.log('  • tblPracticeTest / tblTestAnalysis: every test attempt stores full question text, options, and explanation for each question → heavy duplication.');
  console.log('  • tblQuestion: large question bank with long text and explanations.');
  console.log('  • Indexes and MongoDB storage overhead add 20-40% on top of raw data.');
  console.log('  • To reduce size: store only question_id in questions_attempted and look up question text when needed.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
