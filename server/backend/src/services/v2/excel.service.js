const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const NodeRepo = require("../../repositories/v2/common/neo4j-node.repository");
const EdgeRepo = require("../../repositories/v2/common/neo4j-edge.repository");
const { stringToId } = require("../../utils/neo4j.util");

class ExcelService {
    /**
     * Import MajorProgramme từ file Excel — giữ nguyên CUSTOM_ và kiểm tra tồn tại trước khi thêm
     */
    async importMajorProgrammes(filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.worksheets[0];
        const headers = sheet.getRow(1).values;

        const majors = new Map();
        const programmes = new Map();
        const years = new Map();
        const majorProgrammes = [];
        const edges = [];
        const staticFields = new Set(["major_name", "programme_name", "year_name", "major_code", "tab", "name", "description", "reasons", "images"]);

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const data = {};
            row.eachCell((cell, colNumber) => {
                const key = headers[colNumber];
                data[key] = cell.value?.toString().trim() || "";
            });

            const majorName = data.major_name;
            const programmeName = data.programme_name;
            const yearNames = data.year_name.split(";").map(s => s.trim()).filter(Boolean);

            const majorId = stringToId(majorName);
            const programmeId = stringToId(programmeName);
            const mpId = stringToId(`${majorName}_${programmeName}`);

            if (!majors.has(majorId)) {
                majors.set(majorId, {
                    id: majorId,
                    name: majorName,
                    description: data.description || '',
                    reasons: data.reasons || '',
                    images: this.parseJsonOrArray(data.images)
                });
            }

            if (!programmes.has(programmeId)) {
                programmes.set(programmeId, { id: programmeId, name: programmeName });
            }

            for (const yearName of yearNames) {
                const yearId = stringToId(yearName);
                if (!years.has(yearId)) {
                    years.set(yearId, { id: yearId, name: yearName });
                }
                edges.push({ from: mpId, type: "OF_YEAR", toLabel: "Year", toId: yearId });
            }

            edges.push({ from: mpId, type: "OF_MAJOR", toLabel: "Major", toId: majorId });
            edges.push({ from: mpId, type: "OF_PROGRAMME", toLabel: "Programme", toId: programmeId });

            const mpNode = {
                id: mpId,
                major_id: majorId,
                programme_id: programmeId,
                major_code: data.major_code || '',
                tab: data.tab || '',
                name: data.name || '',
                description: data.description || ''
            };

            Object.keys(data).forEach(key => {
                if (!staticFields.has(key) && key.startsWith("CUSTOM_")) {
                    const actualKey = key.replace("CUSTOM_", "").trim();
                    mpNode[actualKey] = data[key];
                }
            });

            majorProgrammes.push(mpNode);
        });

        const existing = await NodeRepo.findManyByIds("MajorProgramme", majorProgrammes.map(x => x.id));
        const existingIds = new Set(existing.map(x => x.id));
        const insertItems = majorProgrammes.filter(x => !existingIds.has(x.id));

        if (insertItems.length === 0) {
            return { inserted: 0, skipped: majorProgrammes.length };
        }

        await NodeRepo.upsertMany("Major", Array.from(majors.values()));
        await NodeRepo.upsertMany("Programme", Array.from(programmes.values()));
        await NodeRepo.upsertMany("Year", Array.from(years.values()));
        await NodeRepo.upsertMany("MajorProgramme", insertItems);

        for (const edge of edges) {
            await EdgeRepo.upsert("MajorProgramme", edge.from, edge.type, edge.toLabel, edge.toId);
        }

        return { inserted: insertItems.length, skipped: majorProgrammes.length - insertItems.length };
    }

    /**
     * Export dữ liệu MajorProgramme ra file Excel
     */
    async exportMajorProgrammes() {
        const items = await NodeRepo.findAll("MajorProgramme", 1000);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("MajorProgrammes");

        const staticFields = new Set([
            "id", "major_id", "programme_id", "major_code", "tab", "name", "description"
        ]);

        const customKeys = new Set();
        items.forEach(item => {
            Object.keys(item).forEach(key => {
                if (!staticFields.has(key)) {
                    customKeys.add(`CUSTOM_${key}`);
                }
            });
        });

        const headers = [
            "major_name",
            "programme_name",
            "year_name",
            "major_code",
            "tab",
            "name",
            "description",
            "reasons",
            "images"
        ];

        const fullHeaders = [...headers, ...Array.from(customKeys)];
        sheet.addRow(fullHeaders);
        sheet.columns.forEach((column, index) => {
            let maxLength = 10;
            sheet.eachRow(row => {
                const cellValue = row.getCell(index + 1).value;
                if (cellValue && cellValue.toString().length > maxLength) {
                    maxLength = cellValue.toString().length;
                }
            });
            column.width = maxLength + 2;
        });

        for (const item of items) {
            const major = await NodeRepo.findById("Major", item.major_id || "");
            const programme = await NodeRepo.findById("Programme", item.programme_id || "");
            const yearEdges = await EdgeRepo.findTargets("MajorProgramme", item.id || "", "OF_YEAR");
            const yearNames = yearEdges.map(y => y.name).join(";");

            const row = [
                major?.name || item.major_id,
                programme?.name || item.programme_id,
                yearNames,
                item.major_code,
                item.tab,
                item.name,
                item.description,
                major?.reasons || "",
                JSON.stringify(major?.images || [])
            ];

            for (const key of customKeys) {
                const k = key.replace("CUSTOM_", "");
                row.push(item[k] || "");
            }

            sheet.addRow(row);
        }

        const exportDir = path.join(__dirname, "../../exports");
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        const filePath = path.join(exportDir, "major_programmes_export.xlsx");
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }

    /**
     * Import node bất kỳ từ Excel bằng label
     */
    async importGeneric(label, filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.worksheets[0];
        const headers = sheet.getRow(1).values;
        const rows = [];

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const data = {};
            row.eachCell((cell, colNumber) => {
                const key = headers[colNumber];
                data[key] = cell.value?.toString().trim() || "";
            });
            if (!data.id && data.name) {
                data.id = stringToId(data.name);
            }
            rows.push(data);
        });

        await NodeRepo.upsertMany(label, rows);
        return { inserted: rows.length };
    }

    /**
     * Export node bất kỳ theo label
     */
    async exportGeneric(label) {
        const items = await NodeRepo.findAll(label, 1000);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(label);
        const headers = Object.keys(items[0] || {});
        sheet.addRow(headers);
        items.forEach(item => {
            const row = headers.map(h => typeof item[h] === 'object' ? JSON.stringify(item[h]) : item[h]);
            sheet.addRow(row);
        });

        const exportDir = path.join(__dirname, "../../exports");
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        const filePath = path.join(exportDir, `${label}_export.xlsx`);

        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }

    /**
     * Tiện ích xử lý chuỗi JSON hoặc chuỗi dạng mảng cho images
     */
    parseJsonOrArray(value) {
        if (!value) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return value.split(';').map(s => s.trim()).filter(Boolean);
        }
    }
}

module.exports = new ExcelService();