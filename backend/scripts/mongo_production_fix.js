
// Paste this directly into MongoDB Compass Shell (Mongosh)

// 1. Switch to your database (if not already selected)
// use('scholarplace');

// 2. Find duplicates
var cursor = db.tblStudentProgress.aggregate([
    {
        $group: {
            // Group by User + Week to find collisions
            _id: { student_id: "$student_id", week: "$week" },
            count: { $sum: 1 },
            docs: { $push: "$$ROOT" } // Keep full docs to inspect
        }
    },
    {
        $match: {
            count: { $gt: 1 } // Only groups with duplicates
        }
    }
]);

print("Found duplicates, processing...");

cursor.forEach(function (group) {
    var records = group.docs;

    // Sort records: prioritizing 'completed' status, then latest update
    records.sort(function (a, b) {
        if (a.status === 'completed' && b.status !== 'completed') return -1; // a comes first (keep)
        if (b.status === 'completed' && a.status !== 'completed') return 1;  // b comes first (keep)
        // If status same, prefer newest
        return (b.updated_at || 0) - (a.updated_at || 0);
    });

    // The first record is the "Keeper"
    var keeper = records[0];

    // Ensure capstone_completed flag bubbles up if ANY duplicate had it
    var wasCapstoneDone = records.some(r => r.capstone_completed === true);
    if (wasCapstoneDone && !keeper.capstone_completed) {
        db.tblStudentProgress.updateOne(
            { _id: keeper._id },
            { $set: { capstone_completed: true, updated_at: new Date() } }
        );
        print("Updated keeper " + keeper._id + " with capstone_completed=true");
    }

    // Identify IDs to delete (everyone except the keeper)
    var idsToDelete = [];
    for (var i = 1; i < records.length; i++) {
        idsToDelete.push(records[i]._id);
    }

    if (idsToDelete.length > 0) {
        db.tblStudentProgress.deleteMany({ _id: { $in: idsToDelete } });
        print("Deleted " + idsToDelete.length + " duplicates for user " + group._id.student_id + " week " + group._id.week);
    }
});

// 3. Create Unique Index to prevent future duplicates
print("Creating Unique Index...");
db.tblStudentProgress.createIndex(
    { "student_id": 1, "week": 1 },
    { unique: true, name: "unique_student_week_constraint" }
);

print("Production fix complete.");
