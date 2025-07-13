const fs = require("fs");
const path = require("path");
const GroupService = require("../services/chatbots/group.service");
const MajorService = require("../services/chatbots/major.service");
const ProgrammeService = require("../services/chatbots/programme.service");
const MajorProgrammeService = require("../services/chatbots/majorprogramme.service");
const Neo4jService = require("../services/chatbots/neo4j.service");
const LLMService = require("../services/chatbots/llm.service");
const HttpResponse = require("../data/responses/http.response");

class Neo4jController {
    // async importFromFiles(req, res) {
    //     try {
    //         const tdtuMajorsFile = req.files?.tdtu_majors?.[0];
    //         const detailFiles = req.files?.details || [];

    //         if (!tdtuMajorsFile || detailFiles.length === 0) {
    //             return res.json(HttpResponse.error("Thiếu file dữ liệu."));
    //         }

    //         const majorsData = JSON.parse(fs.readFileSync(tdtuMajorsFile.path, "utf-8"));
    //         const detailMap = {};
    //         for (const file of detailFiles) {
    //             detailMap[path.basename(file.originalname)] = JSON.parse(fs.readFileSync(file.path, "utf-8"));
    //         }

    //         for (const group of majorsData) {
    //             const groupName = group.group_name;
    //             const groupEmbedding = await LLMService.getEmbeddingV2(groupName);
    //             const existingGroup = await GroupService.getByName?.(groupName);
    //             const g = existingGroup
    //                 ? await GroupService.update(existingGroup.id, { name: groupName, embedding: groupEmbedding })
    //                 : await GroupService.create({ name: groupName, embedding: groupEmbedding });

    //             for (const major of group.majors) {
    //                 const majorEmbedding = await LLMService.getEmbeddingV2(major.name);
    //                 const existingMajor = await MajorService.getByName?.(major.name);
    //                 const m = existingMajor
    //                     ? await MajorService.update(existingMajor.id, { name: major.name, embedding: majorEmbedding })
    //                     : await MajorService.create({ name: major.name, embedding: majorEmbedding });

    //                 await Neo4jService.linkGroupToMajor(g.id, m.id);

    //                 const detailData = detailMap[path.basename(major.detail)];
    //                 if (!detailData) continue;

    //                 for (const prog of detailData.programs || []) {
    //                     const progEmbedding = await LLMService.getEmbeddingV2(prog.tab);
    //                     const existingProgramme = await ProgrammeService.getByName?.(prog.tab);
    //                     const p = existingProgramme
    //                         ? await ProgrammeService.update(existingProgramme.id, { name: prog.tab, embedding: progEmbedding })
    //                         : await ProgrammeService.create({ name: prog.tab, embedding: progEmbedding });

    //                     await Neo4jService.linkMajorToProgramme(m.id, p.id);

    //                     const embedText = `
    //                         Ngành: ${prog.name || ''}
    //                         Hệ đào tạo: ${prog.tab || ''}
    //                         ${prog.description ? `Mô tả: ${prog.description}` : ''}
    //                         `;

    //                     const mpData = {
    //                         name: prog.name,
    //                         tab: prog.tab,
    //                         description: prog.description,
    //                         major_code: prog.major_code,
    //                         embedding: await LLMService.getEmbeddingV2(embedText.trim()),
    //                         ...prog.content,
    //                     };
    //                     const existingMP = await MajorProgrammeService.getByNameAndTab?.(prog.name, prog.tab);
    //                     const mp = existingMP
    //                         ? await MajorProgrammeService.update(existingMP.id, mpData)
    //                         : await MajorProgrammeService.create(mpData);

    //                     await Neo4jService.linkProgrammeToMajorProgramme(p.id, mp.id);
    //                     await Neo4jService.linkMajorProgrammeToMajor(mp.id, m.id);
    //                 }
    //             }
    //         }

    //         return res.json(HttpResponse.success("Import dữ liệu ngành thành công (có cập nhật)"));
    //     } catch (error) {
    //         console.error(error);
    //         return res.json(HttpResponse.error("Import thất bại", -1, error.message));
    //     }
    // }
}

module.exports = new Neo4jController();