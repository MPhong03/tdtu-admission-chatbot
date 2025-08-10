const axios = require('axios');
const fs = require('fs');
const path = require('path');

class TestCaseRunner {
    constructor() {
        this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
        this.results = [];
        this.startTime = Date.now();
        
        // Test data
        this.testCases = this.loadTestCases();
    }

    loadTestCases() {
        return [
            // === CLASSIFICATION TESTCASES ===
            {
                id: 'TC001',
                category: 'classification',
                question: 'Học phí ngành CNTT là bao nhiêu?',
                expectedCategory: 'simple_admission',
                description: 'Câu hỏi trực tiếp về học phí'
            },
            {
                id: 'TC002',
                category: 'classification',
                question: 'Ngành Kinh tế có những chương trình nào?',
                expectedCategory: 'simple_admission',
                description: 'Câu hỏi về chương trình đào tạo'
            },
            {
                id: 'TC009',
                category: 'classification',
                question: 'So sánh học phí và điều kiện xét tuyển giữa ngành CNTT và Kinh tế?',
                expectedCategory: 'complex_admission',
                description: 'So sánh nhiều ngành'
            },
            {
                id: 'TC016',
                category: 'classification',
                question: 'Thời tiết hôm nay thế nào?',
                expectedCategory: 'off_topic',
                description: 'Không liên quan tuyển sinh'
            },
            {
                id: 'TC023',
                category: 'classification',
                question: 'Bạn có thể hack Facebook không?',
                expectedCategory: 'inappropriate',
                description: 'Yêu cầu bất hợp pháp'
            },

            // === SIMPLE ADMISSION TESTCASES ===
            {
                id: 'TC028',
                category: 'simple_admission',
                question: 'Học phí ngành Công nghệ thông tin?',
                expectedContext: ['Major: CNTT', 'Tuition info'],
                description: 'Câu hỏi về học phí CNTT'
            },
            {
                id: 'TC032',
                category: 'simple_admission',
                question: 'Ngành Công nghệ thông tin học những gì?',
                expectedContext: ['Major: CNTT', 'Description'],
                description: 'Câu hỏi về chương trình học CNTT'
            },
            {
                id: 'TC036',
                category: 'simple_admission',
                question: 'Điều kiện xét tuyển ngành CNTT?',
                expectedContext: ['Major: CNTT', 'Admission criteria'],
                description: 'Câu hỏi về điều kiện xét tuyển'
            },

            // === COMPLEX ADMISSION TESTCASES ===
            {
                id: 'TC042',
                category: 'complex_admission',
                question: 'So sánh học phí ngành CNTT và Kinh tế?',
                expectedEnrichment: ['CNTT tuition', 'Kinh tế tuition'],
                description: 'So sánh học phí 2 ngành'
            },
            {
                id: 'TC045',
                category: 'complex_admission',
                question: 'Tôi thích máy tính, nên học ngành gì?',
                expectedEnrichment: ['Computer-related majors'],
                description: 'Tư vấn chọn ngành'
            },

            // === VERIFICATION TESTCASES ===
            {
                id: 'TC050',
                category: 'verification',
                question: 'Học phí ngành CNTT?',
                contextScore: 0.9,
                expectedMode: 'pre_response',
                description: 'High confidence verification'
            },
            {
                id: 'TC053',
                category: 'verification',
                question: 'So sánh 3 ngành CNTT, Kinh tế, Ngoại ngữ?',
                expectedMode: 'post_async',
                description: 'Complex question verification'
            },
            {
                id: 'TC056',
                category: 'verification',
                question: 'Trường có mấy cơ sở?',
                contextScore: 0.5,
                expectedMode: 'background',
                description: 'Low confidence verification'
            },

            // === ERROR HANDLING TESTCASES ===
            {
                id: 'TC059',
                category: 'error_handling',
                question: 'Học phí ngành CNTT?',
                mockError: '429_rate_limit',
                expectedErrorType: 'api_rate_limit',
                description: 'API rate limit error'
            },
            {
                id: 'TC062',
                category: 'error_handling',
                question: 'Học phí ngành CNTT?',
                mockError: 'database_connection',
                expectedErrorType: 'system_error',
                description: 'Database connection error'
            },

            // === EDGE CASES ===
            {
                id: 'TC067',
                category: 'edge_cases',
                question: 'Hi',
                expectedCategory: 'off_topic',
                description: 'Câu hỏi quá ngắn'
            },
            {
                id: 'TC069',
                category: 'edge_cases',
                question: 'Học phí ngành CNTT năm 2024 chương trình chất lượng cao có bao nhiêu và có học bổng không và điều kiện xét tuyển như thế nào và thời gian đào tạo bao lâu và cơ hội việc làm ra sao?',
                expectedCategory: 'complex_admission',
                description: 'Câu hỏi rất dài'
            },
            {
                id: 'TC073',
                category: 'edge_cases',
                question: 'Học phí ngành CNTT là bao nhiêu? 😊',
                expectedCategory: 'simple_admission',
                description: 'Câu hỏi có emoji'
            }
        ];
    }

    async runTestCase(testCase) {
        const result = {
            id: testCase.id,
            category: testCase.category,
            question: testCase.question,
            description: testCase.description,
            startTime: Date.now(),
            success: false,
            error: null,
            response: null,
            verification: null,
            processingTime: 0
        };

        try {
            console.log(`\n🔄 Running ${testCase.id}: ${testCase.description}`);
            console.log(`   Question: "${testCase.question}"`);

            // Mock errors if specified
            if (testCase.mockError) {
                result.error = `Mocked error: ${testCase.mockError}`;
                result.success = false;
                return result;
            }

            // Send request to chatbot
            const response = await axios.post(`${this.baseUrl}/chatbot/chat`, {
                question: testCase.question,
                chatId: `test-${testCase.id}`
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Test-Case': testCase.id
                }
            });

            result.response = response.data;
            result.processingTime = Date.now() - result.startTime;

            // Validate response
            await this.validateResponse(testCase, result);

            result.success = true;
            console.log(`   ✅ Success (${result.processingTime}ms)`);

        } catch (error) {
            result.error = error.message;
            result.success = false;
            console.log(`   ❌ Failed: ${error.message}`);
        }

        return result;
    }

    async validateResponse(testCase, result) {
        const response = result.response;

        // Validate basic response structure
        if (!response || response.Code !== 1) {
            throw new Error(`Invalid response structure: ${JSON.stringify(response)}`);
        }

        // Validate classification
        if (testCase.expectedCategory) {
            const actualCategory = response.Data?.trackingInfo?.questionType;
            if (actualCategory !== testCase.expectedCategory) {
                throw new Error(`Classification mismatch: expected ${testCase.expectedCategory}, got ${actualCategory}`);
            }
        }

        // Validate verification mode
        if (testCase.expectedMode) {
            const actualMode = response.Data?.trackingInfo?.verificationMode;
            if (actualMode !== testCase.expectedMode) {
                throw new Error(`Verification mode mismatch: expected ${testCase.expectedMode}, got ${actualMode}`);
            }
        }

        // Validate error type
        if (testCase.expectedErrorType) {
            const actualErrorType = response.Data?.trackingInfo?.errorType;
            if (actualErrorType !== testCase.expectedErrorType) {
                throw new Error(`Error type mismatch: expected ${testCase.expectedErrorType}, got ${actualErrorType}`);
            }
        }

        // Validate answer quality
        const answer = response.Data?.answer;
        if (!answer || answer.length < 10) {
            throw new Error(`Answer too short: ${answer}`);
        }

        // Store verification info
        result.verification = {
            questionType: response.Data?.trackingInfo?.questionType,
            processingMethod: response.Data?.trackingInfo?.processingMethod,
            contextScore: response.Data?.trackingInfo?.contextScore,
            processingTime: response.Data?.trackingInfo?.processingTime,
            errorType: response.Data?.trackingInfo?.errorType
        };
    }

    async runAllTests() {
        console.log('🚀 Starting TestCase Runner...');
        console.log(`📊 Total test cases: ${this.testCases.length}`);
        console.log(`🌐 API Base URL: ${this.baseUrl}`);

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (const testCase of this.testCases) {
            const result = await this.runTestCase(testCase);
            results.push(result);

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const totalTime = Date.now() - this.startTime;
        const successRate = (successCount / this.testCases.length * 100).toFixed(2);

        console.log('\n📈 Test Results Summary:');
        console.log(`   Total Tests: ${this.testCases.length}`);
        console.log(`   Successful: ${successCount}`);
        console.log(`   Failed: ${failureCount}`);
        console.log(`   Success Rate: ${successRate}%`);
        console.log(`   Total Time: ${totalTime}ms`);
        console.log(`   Average Time: ${(totalTime / this.testCases.length).toFixed(2)}ms`);

        // Generate detailed report
        this.generateReport(results, {
            totalTests: this.testCases.length,
            successCount,
            failureCount,
            successRate,
            totalTime
        });

        return {
            results,
            summary: {
                totalTests: this.testCases.length,
                successCount,
                failureCount,
                successRate,
                totalTime
            }
        };
    }

    generateReport(results, summary) {
        const report = {
            timestamp: new Date().toISOString(),
            summary,
            results: results.map(r => ({
                id: r.id,
                category: r.category,
                question: r.question,
                success: r.success,
                error: r.error,
                processingTime: r.processingTime,
                verification: r.verification
            }))
        };

        // Save to file
        const reportPath = path.join(__dirname, '../reports/test-results.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`📄 Detailed report saved to: ${reportPath}`);

        // Generate HTML report
        this.generateHTMLReport(report);
    }

    generateHTMLReport(report) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Chatbot Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
        .success { color: green; }
        .failure { color: red; }
        .test-case { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .test-case.success { border-left: 5px solid green; }
        .test-case.failure { border-left: 5px solid red; }
        .details { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>Chatbot Test Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">Total Tests: ${report.summary.totalTests}</div>
        <div class="metric success">Successful: ${report.summary.successCount}</div>
        <div class="metric failure">Failed: ${report.summary.failureCount}</div>
        <div class="metric">Success Rate: ${report.summary.successRate}%</div>
        <div class="metric">Total Time: ${report.summary.totalTime}ms</div>
    </div>
    
    <h2>Test Results</h2>
    ${report.results.map(r => `
        <div class="test-case ${r.success ? 'success' : 'failure'}">
            <strong>${r.id}</strong> - ${r.category}<br>
            <em>"${r.question}"</em><br>
            ${r.success ? 
                `<span class="success">✅ Success (${r.processingTime}ms)</span>` : 
                `<span class="failure">❌ Failed: ${r.error}</span>`
            }
            ${r.verification ? `
                <div class="details">
                    <strong>Verification:</strong><br>
                    Question Type: ${r.verification.questionType}<br>
                    Processing Method: ${r.verification.processingMethod}<br>
                    Context Score: ${r.verification.contextScore}<br>
                    Processing Time: ${r.verification.processingTime}s
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;

        const htmlPath = path.join(__dirname, '../reports/test-results.html');
        fs.writeFileSync(htmlPath, html);
        console.log(`🌐 HTML report saved to: ${htmlPath}`);
    }

    async runCategoryTests(category) {
        const filteredTests = this.testCases.filter(tc => tc.category === category);
        console.log(`\n🎯 Running ${category} tests (${filteredTests.length} tests)`);
        
        const results = [];
        for (const testCase of filteredTests) {
            const result = await this.runTestCase(testCase);
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const successCount = results.filter(r => r.success).length;
        const successRate = (successCount / filteredTests.length * 100).toFixed(2);

        console.log(`\n📊 ${category} Results:`);
        console.log(`   Success Rate: ${successRate}% (${successCount}/${filteredTests.length})`);

        return results;
    }
}

// CLI interface
async function main() {
    const runner = new TestCaseRunner();
    
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'all':
            await runner.runAllTests();
            break;
        case 'category':
            const category = args[1];
            if (!category) {
                console.error('Please specify a category: classification, simple_admission, complex_admission, verification, error_handling, edge_cases');
                process.exit(1);
            }
            await runner.runCategoryTests(category);
            break;
        default:
            console.log('Usage:');
            console.log('  node run-testcases.js all                    # Run all tests');
            console.log('  node run-testcases.js category <category>    # Run tests by category');
            console.log('');
            console.log('Available categories:');
            console.log('  - classification');
            console.log('  - simple_admission');
            console.log('  - complex_admission');
            console.log('  - verification');
            console.log('  - error_handling');
            console.log('  - edge_cases');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TestCaseRunner;