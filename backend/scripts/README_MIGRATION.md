# Database Migration Scripts

## Overview
These scripts help normalize and clean up the database by:
- Consolidating duplicate collections
- Archiving deprecated tables
- Renaming collections for consistency
- Removing unused collections

## ⚠️ **IMPORTANT: Before Running**

1. **Backup your database** (MongoDB dump)
2. **Run in development/staging first**
3. **Review verification output** before proceeding
4. **Test application** after each migration

## Scripts

### 1. `verifyCollections.js` ✅ **SAFE (Read-only)**
**Purpose**: Verify collections before migration  
**Risk**: None (read-only)  
**Run**: `node backend/scripts/verifyCollections.js`

**Output**:
- Lists all collections
- Identifies duplicates
- Shows document counts
- Highlights deprecated tables

---

### 2. `consolidateStudentProgress.js` ⚠️ **MODIFIES DATA**
**Purpose**: Migrate `student_progress` → `tblStudentProgress`  
**Risk**: Low (creates backup first)  
**Run**: `node backend/scripts/consolidateStudentProgress.js`

**What it does**:
1. Creates backup of `student_progress`
2. Migrates all documents to `tblStudentProgress`
3. Skips duplicates
4. Drops `student_progress` after verification

**Safety**: Creates backup before migration

---

### 3. `archiveOldTPCTables.js` ⚠️ **ARCHIVES DATA**
**Purpose**: Archive `tblTPC` and `tblDeptTPC`  
**Risk**: Low (only archives, doesn't delete)  
**Run**: `node backend/scripts/archiveOldTPCTables.js`

**What it does**:
1. Creates archive collections (`tblTPC_archive_YYYY-MM-DD`)
2. Copies all documents to archive
3. Keeps original collections (manual deletion after verification)

**Safety**: Original collections remain until manual deletion

---

### 4. `renameSyllabusCollection.js` ⚠️ **RENAMES COLLECTION**
**Purpose**: Rename `syllabus` → `tblSyllabus`  
**Risk**: Medium (requires code updates)  
**Run**: `node backend/scripts/renameSyllabusCollection.js`

**What it does**:
1. Creates backup
2. Renames collection
3. Verifies document count

**⚠️ After running**: Update code references:
- `backend/controller/*.js` (if any reference "syllabus")
- `backend/schema/syllabus.js` (update collection name)

---

### 5. `checkAndDeleteUnusedCollections.js` ⚠️ **CAN DELETE**
**Purpose**: Check and delete unused collections (e.g., `tblITPC`)  
**Risk**: Medium (dry-run by default)  
**Run**: 
- Dry-run: `node backend/scripts/checkAndDeleteUnusedCollections.js`
- Delete: `node backend/scripts/checkAndDeleteUnusedCollections.js --delete`

**What it does**:
1. Checks for unused collections
2. Shows document counts
3. Deletes only if `--delete` flag is used

**Safety**: Dry-run by default

---

### 6. `migrateAll.js` 🚀 **MASTER SCRIPT**
**Purpose**: Run all migrations in correct order  
**Risk**: Medium (orchestrates all scripts)  
**Run**: `node backend/scripts/migrateAll.js`

**What it does**:
1. Runs verification
2. Asks for confirmation
3. Runs all migration scripts in order
4. Provides summary

**Safety**: Asks for confirmation before each step

---

## Recommended Migration Order

### **Phase 1: Verification (Safe)**
```bash
node backend/scripts/verifyCollections.js
```
Review output, then proceed.

### **Phase 2: Immediate Cleanup (Low Risk)**
```bash
# 1. Consolidate student_progress
node backend/scripts/consolidateStudentProgress.js

# 2. Check unused collections (dry-run)
node backend/scripts/checkAndDeleteUnusedCollections.js

# 3. If tblITPC is empty, delete it
node backend/scripts/checkAndDeleteUnusedCollections.js --delete
```

### **Phase 3: Rename for Consistency**
```bash
# Rename syllabus (requires code update after)
node backend/scripts/renameSyllabusCollection.js

# Then update code references:
# - Search for "syllabus" in backend/controller/
# - Update to "tblSyllabus"
```

### **Phase 4: Archive Deprecated Tables**
```bash
# Archive old TPC tables (keeps originals)
node backend/scripts/archiveOldTPCTables.js
```

### **Phase 5: After 3-6 Months**
```bash
# Manually delete archived collections in MongoDB:
# db.tblTPC_archive_*.drop()
# db.tblDeptTPC_archive_*.drop()
```

---

## Or Use Master Script (Recommended)

```bash
# Runs all migrations with confirmations
node backend/scripts/migrateAll.js
```

---

## Rollback Instructions

### If something goes wrong:

1. **student_progress consolidation**:
   ```javascript
   // Restore from backup
   db.student_progress_backup_*.aggregate([{ $out: "student_progress" }]);
   ```

2. **syllabus rename**:
   ```javascript
   // Restore from backup
   db.syllabus_backup_*.aggregate([{ $out: "syllabus" }]);
   // Or rename back
   db.tblSyllabus.rename("syllabus");
   ```

3. **TPC tables**: Originals are kept, just delete archives if needed

---

## Verification After Migration

1. **Check collection counts**:
   ```javascript
   db.tblStudentProgress.countDocuments();
   db.tblSyllabus.countDocuments();
   ```

2. **Test application**:
   - Login as TPC/DeptTPC
   - View students
   - Check student progress
   - Verify syllabus loading

3. **Check for errors**:
   - Review `tblerrorlog` for any collection-related errors
   - Check application logs

---

## Troubleshooting

### Error: "Collection already exists"
- Check if collection was already migrated
- Review verification output

### Error: "Cannot drop collection"
- Check if collection is in use
- Stop application, then retry

### Missing documents after migration
- Check backup collections
- Restore from backup if needed

---

## Support

If you encounter issues:
1. Check backup collections (they have timestamp in name)
2. Review error logs
3. Restore from MongoDB dump if needed

---

**Last Updated**: After PersonMaster migration
