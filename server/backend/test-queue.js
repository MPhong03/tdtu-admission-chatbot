const CacheService = require('./src/services/v2/cachings/cache.service');
const VerificationService = require('./src/services/v2/bots/verification.service');
const GeminiService = require('./src/services/v2/bots/gemini.service');
const PromptService = require('./src/services/v2/bots/prompt.service');

async function testQueue() {
    console.log('=== TESTING QUEUE PROCESSOR ===');
    
    try {
        // Initialize services
        const cache = new CacheService('redis://localhost:6379');
        const gemini = new GeminiService();
        const prompts = new PromptService();
        const verification = new VerificationService(gemini, prompts, cache);
        
        console.log('✅ Services initialized');
        
        // Start queue processor
        cache.startVerificationQueueProcessor(
            (task) => verification.handleVerificationTask(task)
        );
        
        console.log('✅ Queue processor started');
        
        // Enqueue a test task
        const taskData = {
            historyId: 'test123',
            question: 'Test question',
            answer: 'Test answer',
            contextNodes: JSON.stringify([]),
            category: 'simple_admission',
            type: 'verification'
        };
        
        const taskId = await cache.enqueueVerificationTask(taskData);
        console.log(`✅ Task enqueued: ${taskId}`);
        
        // Check queue length
        const queueLength = await cache.getVerificationQueueLength();
        console.log(`✅ Queue length: ${queueLength}`);
        
        // Wait for processing
        console.log('⏳ Waiting for task processing...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check queue length again
        const finalQueueLength = await cache.getVerificationQueueLength();
        console.log(`✅ Final queue length: ${finalQueueLength}`);
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testQueue();