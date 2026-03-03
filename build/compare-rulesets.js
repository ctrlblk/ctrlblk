// Compare output of generate-rulesets.js (old) vs generate-rulesets-v2.js (new)
// Usage: node build/compare-rulesets.js <old-dir> <new-dir>

import fs from 'fs/promises';
import path from 'path';

const [,, oldDir, newDir] = process.argv;

if (!oldDir || !newDir) {
    console.error('Usage: node build/compare-rulesets.js <old-dir> <new-dir>');
    process.exit(1);
}

async function listFiles(dir) {
    const files = [];
    async function walk(d) {
        const entries = await fs.readdir(d, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
            } else {
                files.push(path.relative(dir, full));
            }
        }
    }
    await walk(dir);
    return files.sort();
}

async function readFileOrNull(filepath) {
    try {
        return await fs.readFile(filepath, 'utf8');
    } catch {
        return null;
    }
}

function diffLines(a, b, filename) {
    const aLines = a.split('\n');
    const bLines = b.split('\n');

    const diffs = [];
    const maxLines = Math.max(aLines.length, bLines.length);

    for (let i = 0; i < maxLines; i++) {
        const aLine = aLines[i];
        const bLine = bLines[i];
        if (aLine !== bLine) {
            diffs.push({
                line: i + 1,
                old: aLine !== undefined ? aLine : '(missing)',
                new: bLine !== undefined ? bLine : '(missing)',
            });
        }
    }

    return diffs;
}

async function main() {
    const oldFiles = await listFiles(oldDir);
    const newFiles = await listFiles(newDir);

    const allFiles = new Set([...oldFiles, ...newFiles]);
    let identical = 0;
    let different = 0;
    let onlyOld = 0;
    let onlyNew = 0;
    let totalDiffLines = 0;

    const sortedFiles = [...allFiles].sort();

    for (const file of sortedFiles) {
        const oldPath = path.join(oldDir, file);
        const newPath = path.join(newDir, file);
        const oldContent = await readFileOrNull(oldPath);
        const newContent = await readFileOrNull(newPath);

        if (oldContent === null && newContent !== null) {
            console.log(`  ONLY NEW: ${file}`);
            onlyNew++;
            continue;
        }
        if (oldContent !== null && newContent === null) {
            console.log(`  ONLY OLD: ${file}`);
            onlyOld++;
            continue;
        }

        if (oldContent === newContent) {
            identical++;
            continue;
        }

        // Files differ
        different++;
        const diffs = diffLines(oldContent, newContent, file);
        totalDiffLines += diffs.length;
        console.log(`\n  DIFF: ${file} (${diffs.length} lines differ)`);

        // Show first few diffs
        const maxShow = 10;
        for (let i = 0; i < Math.min(diffs.length, maxShow); i++) {
            const d = diffs[i];
            const oldStr = d.old.length > 120 ? d.old.slice(0, 120) + '...' : d.old;
            const newStr = d.new.length > 120 ? d.new.slice(0, 120) + '...' : d.new;
            console.log(`    L${d.line}:`);
            console.log(`      OLD: ${oldStr}`);
            console.log(`      NEW: ${newStr}`);
        }
        if (diffs.length > maxShow) {
            console.log(`    ... and ${diffs.length - maxShow} more differences`);
        }
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`  Identical files: ${identical}`);
    console.log(`  Different files: ${different}`);
    console.log(`  Only in old:     ${onlyOld}`);
    console.log(`  Only in new:     ${onlyNew}`);
    console.log(`  Total diff lines: ${totalDiffLines}`);
    console.log(`  Total files:     ${sortedFiles.length}`);

    if (different === 0 && onlyOld === 0 && onlyNew === 0) {
        console.log('\n  OUTPUT IS 100% IDENTICAL');
        process.exit(0);
    } else {
        console.log('\n  OUTPUT DIFFERS - needs fixing');
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
