const {
    N_MajorService,
    N_ProgrammeService,
    N_MajorProgrammeService,
    N_YearService,
    N_TuitionService,
    N_ScholarshipService,
    N_DocumentService
} = require('./nodes.neo4j-service');

/** Lọc unique theo id */
function uniqueById(arr) {
    const map = new Map();
    for (const item of arr || []) {
        if (item && item.id && !map.has(item.id)) {
            map.set(item.id, item);
        }
    }
    return Array.from(map.values());
}

/** Chuyển tiếng Việt sang in hoa không dấu, thay khoảng trắng thành "_" */
function toUpperNoAccent(str) {
    if (!str) return '';
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return str.toUpperCase().replace(/\s+/g, '_');
}

/** Gán id nếu không có từ fieldName (mặc định là 'name') */
function assignIdIfMissing(arr, fieldName = 'name') {
    return (arr || []).map(item => {
        if (!item.id && item[fieldName]) {
            item.id = toUpperNoAccent(item[fieldName]);
        }
        return item;
    });
}

/** Batch xử lý song song có kiểm soát */
async function batchAsync(array, batchSize, asyncFn) {
    for (let i = 0; i < array.length; i += batchSize) {
        const batch = array.slice(i, i + batchSize);
        await Promise.all(batch.map(asyncFn));
    }
}

class N_DataService {
    // Import majors, programmes, major_programmes, years
    async importMajorsProgrammesAndYears({ majors, programmes, major_programmes, years }) {
        let uniqueMajors = assignIdIfMissing(majors, 'name');
        uniqueMajors = uniqueById(uniqueMajors);

        let uniqueProgrammes = assignIdIfMissing(programmes, 'name');
        uniqueProgrammes = uniqueById(uniqueProgrammes);

        let uniqueYears = assignIdIfMissing(years, 'name');
        uniqueYears = uniqueById(uniqueYears);

        let uniqueMajorProgrammes = assignIdIfMissing(major_programmes, 'name');
        uniqueMajorProgrammes = uniqueById(uniqueMajorProgrammes);

        await N_YearService.upsertMany(uniqueYears);
        await N_MajorService.upsertMany(uniqueMajors);
        await N_ProgrammeService.upsertMany(uniqueProgrammes);
        await N_MajorProgrammeService.upsertMany(
            uniqueMajorProgrammes.map(({ year_ids, ...rest }) => rest)
        );

        await batchAsync(uniqueMajorProgrammes, 10, async mp => {
            if (mp.major_id) await N_MajorProgrammeService.linkToMajor(mp.id, mp.major_id);
            if (mp.programme_id) await N_MajorProgrammeService.linkToProgramme(mp.id, mp.programme_id);
            if (Array.isArray(mp.year_ids)) {
                for (const yid of mp.year_ids) {
                    await N_MajorProgrammeService.linkToYear(mp.id, yid);
                    await N_YearService.linkToMajorProgramme(yid, mp.id);
                }
            }
            if (mp.major_id && mp.programme_id) {
                await N_MajorService.linkToProgramme(mp.major_id, mp.programme_id);
                await N_ProgrammeService.linkToMajor(mp.programme_id, mp.major_id);
            }
        });
    }

    // Import tuitions, programmes, years
    async importTuitions({ tuitions, programmes, years }) {
        let uniqueTuitions = assignIdIfMissing(tuitions, 'name');
        uniqueTuitions = uniqueById(uniqueTuitions);

        let uniqueProgrammes = assignIdIfMissing(programmes, 'name');
        uniqueProgrammes = uniqueById(uniqueProgrammes);

        let uniqueYears = assignIdIfMissing(years, 'name');
        uniqueYears = uniqueById(uniqueYears);

        await N_YearService.upsertMany(uniqueYears);
        await N_ProgrammeService.upsertMany(uniqueProgrammes);
        await N_TuitionService.upsertMany(uniqueTuitions);

        await batchAsync(uniqueTuitions, 10, async t => {
            if (t.programme_id) {
                await N_TuitionService.linkToProgramme(t.id, t.programme_id);
                await N_ProgrammeService.linkToTuition(t.programme_id, t.id);
            }
            if (t.year_id) {
                await N_TuitionService.linkToYear(t.id, t.year_id);
                await N_YearService.linkToTuition(t.year_id, t.id);
            }
        });
    }

    // Import scholarships, years
    async importScholarships({ scholarships, years }) {
        let uniqueScholarships = assignIdIfMissing(scholarships, 'name');
        uniqueScholarships = uniqueById(uniqueScholarships);

        let uniqueYears = assignIdIfMissing(years, 'name');
        uniqueYears = uniqueById(uniqueYears);

        await N_YearService.upsertMany(uniqueYears);
        await N_ScholarshipService.upsertMany(uniqueScholarships);

        await batchAsync(uniqueScholarships, 10, async s => {
            if (s.year_id) {
                await N_ScholarshipService.linkToYear(s.id, s.year_id);
            }
        });
    }

    // Import documents, years
    async importDocuments({ documents, years }) {
        let uniqueDocuments = assignIdIfMissing(documents, 'name');
        uniqueDocuments = uniqueById(uniqueDocuments);

        let uniqueYears = assignIdIfMissing(years, 'name');
        uniqueYears = uniqueById(uniqueYears);

        await N_YearService.upsertMany(uniqueYears);
        await N_DocumentService.upsertMany(uniqueDocuments);

        await batchAsync(uniqueDocuments, 10, async d => {
            if (d.year_id) {
                await N_YearService.linkToDocument(d.year_id, d.id);
            }
        });
    }

    // Import chỉ Programmes
    async importProgrammes({ programmes }) {
        let result = assignIdIfMissing(programmes, 'name');
        result = uniqueById(result);
        await N_ProgrammeService.upsertMany(result);
    }

    // Import chỉ Years
    async importYears({ years }) {
        let result = assignIdIfMissing(years, 'name');
        result = uniqueById(result);
        await N_YearService.upsertMany(result);
    }
}

module.exports = new N_DataService();