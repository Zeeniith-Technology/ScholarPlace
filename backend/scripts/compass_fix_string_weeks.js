
// ==========================================
// MongoDB Compass / Mongosh Cleanup Script
// ==========================================
// Copy and paste this ENTIRE block into the Mongosh terminal in Compass.
// It will:
// 1. Find all records with "String" weeks (e.g., "1").
// 2. Convert them to "Number" weeks (e.g., 1).
// 3. Merge with existing Number records if they exist.

var collection = db.getCollection('tblStudentProgress');
var stringCursor = collection.find({ week: { $type: "string" } });

print("Found " + stringCursor.count() + " records with String-type week.");

stringCursor.forEach(function (doc) {
    var originalWeek = doc.week;
    var weekNum = parseInt(originalWeek);
    var studentId = doc.student_id;

    if (isNaN(weekNum)) {
        print("Skipping " + doc._id + ": check week value '" + originalWeek + "'");
        return;
    }

    print("Processing User: " + studentId + ", Week: " + originalWeek + " -> " + weekNum);

    // Check for existing NUMBER record
    // Note: In shell, equality checks are strict usually, but finding by ID handles ObjectId vs String automatically in some versions. 
    // We will try exact match first.
    var existingNum = collection.findOne({
        student_id: studentId,
        week: weekNum,
        _id: { $ne: doc._id }
    });

    if (existingNum) {
        print(" -> Found duplicate Num record " + existingNum._id + ". Merging...");

        var updates = {};
        var setFields = {};

        // Merge logic
        if (doc.status === 'completed' && existingNum.status !== 'completed') {
            setFields.status = 'completed';
            setFields.progress_percentage = 100;
            setFields.completed_at = doc.completed_at || new Date();
        }
        if (doc.capstone_completed && !existingNum.capstone_completed) {
            setFields.capstone_completed = true;
        }

        // Arrays merge (Coding Problems)
        var existingProblems = existingNum.coding_problems_completed || [];
        var newProblems = doc.coding_problems_completed || [];
        var mergedProblems = existingProblems.concat(newProblems.filter(function (item) {
            return existingProblems.indexOf(item) < 0;
        }));

        if (mergedProblems.length > existingProblems.length) {
            setFields.coding_problems_completed = mergedProblems;
        }

        if (Object.keys(setFields).length > 0) {
            setFields.updated_at = new Date();
            collection.updateOne({ _id: existingNum._id }, { $set: setFields });
            print("   -> Updated Number record.");
        }

        // Delete the String week record
        collection.deleteOne({ _id: doc._id });
        print("   -> Deleted String record.");

    } else {
        // No duplicate, just update type
        print(" -> No duplicate. Converting in-place.");
        collection.updateOne(
            { _id: doc._id },
            { $set: { week: weekNum } }
        );
    }
});

print("--------------------------------------");
print("Compass Cleanup Complete.");
print("--------------------------------------");
