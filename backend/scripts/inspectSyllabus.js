import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inspect Excel File Structure
 * This script reads the Excel file and shows its structure
 */
function inspectSyllabus() {
    try {
        const excelPath = path.join(__dirname, '../../Designed_syllabus.xlsx');
        
        if (!fs.existsSync(excelPath)) {
            console.error('❌ Excel file not found at:', excelPath);
            process.exit(1);
        }

        console.log('📖 Reading Excel file:', excelPath);
        const workbook = XLSX.readFile(excelPath);
        const sheetNames = workbook.SheetNames;
        
        console.log('\n📋 Found sheets:', sheetNames.length);
        sheetNames.forEach((name, idx) => {
            console.log(`   ${idx + 1}. ${name}`);
        });
        
        // Inspect each sheet
        sheetNames.forEach((sheetName, sheetIdx) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📄 Sheet ${sheetIdx + 1}: ${sheetName}`);
            console.log('='.repeat(60));
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                defval: null,
                raw: false
            });
            
            if (jsonData.length === 0) {
                console.log('   (Empty sheet)');
                return;
            }
            
            console.log(`\n   Rows: ${jsonData.length}`);
            console.log(`   Columns: ${Object.keys(jsonData[0] || {}).length}`);
            
            // Show column names
            if (jsonData[0]) {
                console.log('\n   Column names:');
                Object.keys(jsonData[0]).forEach((key, idx) => {
                    console.log(`     ${idx + 1}. ${key}`);
                });
            }
            
            // Show first 3 rows as sample
            console.log('\n   Sample data (first 3 rows):');
            jsonData.slice(0, 3).forEach((row, idx) => {
                console.log(`\n   Row ${idx + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        const displayValue = typeof value === 'string' && value.length > 50 
                            ? value.substring(0, 50) + '...' 
                            : value;
                        console.log(`     ${key}: ${displayValue}`);
                    }
                });
            });
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Inspection complete!');
        
    } catch (error) {
        console.error('❌ Error inspecting Excel file:', error);
        process.exit(1);
    }
}

inspectSyllabus();

