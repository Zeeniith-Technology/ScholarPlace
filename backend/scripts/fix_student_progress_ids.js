/*
  Fix inconsistent student_id types in tblStudentProgress.

  What it does:
  - Normalizes student_id to string
  - Merges duplicate records by (student_id string, week)
  - Preserves the most complete data across duplicates

  How to run in mongosh:
  - From repo root:
      load("backend/scripts/fix_student_progress_ids.js")

  Safety:
  - Set DRY_RUN = true to preview actions without writing
*/

const DRY_RUN = true

const coll = db.getCollection('tblStudentProgress')

function isObjectId(v) {
  return v && typeof v === 'object' && v._bsontype === 'ObjectId'
}

function toIdString(v) {
  if (v == null) return null
  if (isObjectId(v)) return v.toString()
  return String(v)
}

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function uniqByValue(arr) {
  const seen = new Set()
  const out = []
  for (const v of arr) {
    const key = (typeof v === 'string' || typeof v === 'number')
      ? `${typeof v}:${v}`
      : JSON.stringify(v)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

function mergeByDay(existing, incoming) {
  const map = new Map()
  function scoreOf(x) {
    const n = Number(x && x.score)
    return Number.isFinite(n) ? n : -1
  }
  function timeOf(x) {
    const t = new Date(x && (x.date || x.created_at || x.updated_at || x.timestamp || 0)).getTime()
    return Number.isFinite(t) ? t : 0
  }
  function put(x) {
    if (!x) return
    const day = x.day
    if (day == null) {
      const k = JSON.stringify(x)
      if (!map.has(k)) map.set(k, x)
      return
    }
    const key = String(day)
    const cur = map.get(key)
    if (!cur) {
      map.set(key, x)
      return
    }
    const betterByScore = scoreOf(x) > scoreOf(cur)
    const betterByTime = timeOf(x) > timeOf(cur)
    if (betterByScore || betterByTime) {
      map.set(key, x)
    }
  }
  asArray(existing).forEach(put)
  asArray(incoming).forEach(put)
  return Array.from(map.values())
}

function pickMaxNumber(a, b) {
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isFinite(na)) return b
  if (!Number.isFinite(nb)) return a
  return na >= nb ? a : b
}

function pickLatestDate(a, b) {
  const ta = new Date(a || 0).getTime()
  const tb = new Date(b || 0).getTime()
  if (!Number.isFinite(ta)) return b
  if (!Number.isFinite(tb)) return a
  return tb >= ta ? b : a
}

function pickEarliestDate(a, b) {
  const ta = new Date(a || 0).getTime()
  const tb = new Date(b || 0).getTime()
  if (!Number.isFinite(ta)) return b
  if (!Number.isFinite(tb)) return a
  return tb <= ta ? b : a
}

function mergeStatus(a, b) {
  const order = { locked: 0, start: 1, in_progress: 2, completed: 3 }
  if (!a) return b
  if (!b) return a
  return (order[b] > order[a]) ? b : a
}

function mergeDocs(primary, docs, sidStr) {
  const merged = { ...primary, student_id: sidStr }

  for (const d of docs) {
    merged.days_completed = uniqByValue([
      ...asArray(merged.days_completed),
      ...asArray(d.days_completed)
    ])
    merged.coding_problems_completed = uniqByValue([
      ...asArray(merged.coding_problems_completed),
      ...asArray(d.coding_problems_completed)
    ])
    merged.practice_test_scores = mergeByDay(
      merged.practice_test_scores,
      d.practice_test_scores
    )
    merged.bookmarks = uniqByValue([
      ...asArray(merged.bookmarks),
      ...asArray(d.bookmarks)
    ])
    merged.notes = uniqByValue([
      ...asArray(merged.notes),
      ...asArray(d.notes)
    ])

    merged.practice_tests_completed = pickMaxNumber(merged.practice_tests_completed, d.practice_tests_completed)
    merged.assignments_completed = pickMaxNumber(merged.assignments_completed, d.assignments_completed)
    merged.tests_completed = pickMaxNumber(merged.tests_completed, d.tests_completed)
    merged.assignments_total = pickMaxNumber(merged.assignments_total, d.assignments_total)
    merged.tests_total = pickMaxNumber(merged.tests_total, d.tests_total)
    merged.progress_percentage = pickMaxNumber(merged.progress_percentage, d.progress_percentage)
    merged.time_spent = pickMaxNumber(merged.time_spent, d.time_spent)

    merged.status = mergeStatus(merged.status, d.status)
    merged.capstone_completed = Boolean(merged.capstone_completed || d.capstone_completed)
    merged.deleted = (merged.deleted === true && d.deleted === true) ? true : false

    merged.last_accessed = pickLatestDate(merged.last_accessed, d.last_accessed)
    merged.updated_at = pickLatestDate(merged.updated_at, d.updated_at)
    merged.completed_at = pickEarliestDate(merged.completed_at, d.completed_at)
    merged.created_at = pickEarliestDate(merged.created_at, d.created_at)

    if (merged.college_id == null && d.college_id != null) merged.college_id = d.college_id
    if (merged.department_id == null && d.department_id != null) merged.department_id = d.department_id

    // Preserve any other fields that exist only on d
    for (const k in d) {
      if (k === '_id') continue
      if (merged[k] == null && d[k] != null) merged[k] = d[k]
    }
  }

  delete merged._id
  Object.keys(merged).forEach((k) => {
    if (merged[k] === undefined) delete merged[k]
  })
  return merged
}

let totalDocs = 0
let normalizedOnly = 0
let mergedGroups = 0
let updatedDocs = 0
let deletedDocs = 0
let skippedDocs = 0

const groups = new Map()

coll.find({}).forEach((doc) => {
  totalDocs++
  const sidStr = toIdString(doc.student_id)
  const weekKey = doc.week == null ? null : String(doc.week)
  if (!sidStr || weekKey == null) {
    skippedDocs++
    return
  }
  const key = `${sidStr}|${weekKey}`
  if (!groups.has(key)) {
    groups.set(key, { sidStr, docs: [] })
  }
  groups.get(key).docs.push(doc)
})

groups.forEach((group) => {
  const docs = group.docs
  const sidStr = group.sidStr
  if (!docs || docs.length === 0) return

  const primary = docs.find(d => typeof d.student_id === 'string') || docs[0]
  const merged = mergeDocs(primary, docs, sidStr)

  if (docs.length === 1) {
    if (isObjectId(primary.student_id)) {
      if (!DRY_RUN) {
        coll.updateOne({ _id: primary._id }, { $set: { student_id: sidStr } })
      }
      normalizedOnly++
      updatedDocs++
    }
    return
  }

  if (!DRY_RUN) {
    coll.updateOne({ _id: primary._id }, { $set: merged })
  }
  updatedDocs++
  mergedGroups++

  const idsToDelete = docs.filter(d => d._id !== primary._id).map(d => d._id)
  if (idsToDelete.length > 0) {
    if (!DRY_RUN) {
      const res = coll.deleteMany({ _id: { $in: idsToDelete } })
      deletedDocs += res.deletedCount || 0
    } else {
      deletedDocs += idsToDelete.length
    }
  }
})

print('--- Student Progress ID Fix Summary ---')
print(`DRY_RUN: ${DRY_RUN}`)
print(`Total docs scanned: ${totalDocs}`)
print(`Groups merged: ${mergedGroups}`)
print(`Docs updated: ${updatedDocs}`)
print(`Docs deleted: ${deletedDocs}`)
print(`Docs normalized only: ${normalizedOnly}`)
print(`Docs skipped (missing student_id or week): ${skippedDocs}`)
