const fs = require("fs");
const path = require("path");
const GroupService = require("../services/group.service");
const MajorService = require("../services/major.service");
const ProgrammeService = require("../services/programme.service");
const MajorProgrammeService = require("../services/majorprogramme.service");
const Neo4jService = require("../services/neo4j.service");
const HttpResponse = require("../data/responses/http.response");

class Neo4jController {
    async importFromFiles(req, res) {
        try {
            const tdtuMajorsFile = req.files?.tdtu_majors?.[0];
            const detailFiles = req.files?.details || [];

            if (!tdtuMajorsFile || detailFiles.length === 0) {
                return res.json(HttpResponse.error("Thiếu file dữ liệu."));
            }

            const majorsData = JSON.parse(fs.readFileSync(tdtuMajorsFile.path, "utf-8"));
            const detailMap = {};
            for (const file of detailFiles) {
                detailMap[path.basename(file.originalname)] = JSON.parse(fs.readFileSync(file.path, "utf-8"));
            }

            for (const group of majorsData) {
                const g = await GroupService.create({ name: group.group_name });

                for (const major of group.majors) {
                    const m = await MajorService.create({ name: major.name });
                    await Neo4jService.linkGroupToMajor(g.id, m.id);

                    const detailData = detailMap[path.basename(major.detail)];
                    if (!detailData) continue;

                    for (const prog of detailData.programs || []) {
                        let p = await ProgrammeService.getByName(prog.tab);
                        if (!p) {
                            p = await ProgrammeService.create({ name: prog.tab });
                        }

                        await Neo4jService.linkMajorToProgramme(m.id, p.id);

                        const mp = await MajorProgrammeService.create({
                            name: prog.name,
                            tab: prog.tab,
                            description: prog.description,
                            major_code: prog.major_code,
                            ...prog.content
                        });

                        await Neo4jService.linkProgrammeToMajorProgramme(p.id, mp.id);
                    }
                }
            }

            return res.json(HttpResponse.success("Import dữ liệu ngành thành công"));
        } catch (error) {
            console.error(error);
            return res.json(HttpResponse.error("Import thất bại", -1, error.message));
        }
    }
}

module.exports = new Neo4jController();