import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { 
    SearchOutlined, 
    CheckCircleOutlined, 
    LoadingOutlined,
    BulbOutlined,
    FileSearchOutlined,
    MessageOutlined 
} from '@ant-design/icons';

interface ProgressStep {
    step: string;
    description: string;
    timestamp: number;
    completed?: boolean;
    details?: any;
}

interface ProgressIndicatorProps {
    isVisible: boolean;
    currentStep?: string;
    currentDescription?: string;
    steps?: ProgressStep[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    isVisible,
    currentStep,
    currentDescription,
    steps = []
}) => {
    const [displaySteps, setDisplaySteps] = useState<ProgressStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentStep && currentDescription) {
            const newStep: ProgressStep = {
                step: currentStep,
                description: currentDescription,
                timestamp: Date.now(),
                completed: currentStep === 'completed'
            };

            setDisplaySteps(prev => {
                const exists = prev.find(s => s.step === currentStep);
                if (exists) {
                    return prev.map(s => 
                        s.step === currentStep 
                            ? { ...s, description: currentDescription, completed: currentStep === 'completed' }
                            : s
                    );
                }
                return [...prev, newStep];
            });

            if (currentStep !== 'completed') {
                setCurrentIndex(prev => prev + 1);
            }
        }
    }, [currentStep, currentDescription]);

    const getStepIcon = (step: string, completed: boolean) => {
        if (completed) {
            return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        }

        const iconMap: { [key: string]: React.ReactNode } = {
            'classification': <BulbOutlined style={{ color: '#1890ff' }} />,
            'analysis': <FileSearchOutlined style={{ color: '#1890ff' }} />,
            'main_query': <SearchOutlined style={{ color: '#1890ff' }} />,
            'main_query_validation': <CheckCircleOutlined style={{ color: '#1890ff' }} />,
            'context_score_main': <FileSearchOutlined style={{ color: '#1890ff' }} />,
            'enrichment_1': <SearchOutlined style={{ color: '#1890ff' }} />,
            'enrichment_2': <SearchOutlined style={{ color: '#1890ff' }} />,
            'enrichment_3': <SearchOutlined style={{ color: '#1890ff' }} />,
            'context_score_enrichment_1': <FileSearchOutlined style={{ color: '#1890ff' }} />,
            'context_score_enrichment_2': <FileSearchOutlined style={{ color: '#1890ff' }} />,
            'context_score_enrichment_3': <FileSearchOutlined style={{ color: '#1890ff' }} />,
            'answer_generation': <MessageOutlined style={{ color: '#1890ff' }} />,
            'verification': <CheckCircleOutlined style={{ color: '#1890ff' }} />
        };

        return iconMap[step] || <LoadingOutlined style={{ color: '#1890ff' }} />;
    };

    if (!isVisible) return null;

    return (
        <div className="flex items-start gap-3 mb-6 progress-fade-in">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Spin 
                            indicator={<LoadingOutlined style={{ fontSize: 16, color: '#1890ff' }} spin />} 
                            size="small" 
                        />
                        <span className="text-blue-700 font-medium text-sm">
                            Chatbot đang xử lý...
                        </span>
                    </div>
                </div>

                {displaySteps.length > 0 && (
                    <div className="space-y-2">
                        {displaySteps.slice(-3).map((step, index) => {
                            const isCurrentStep = step.step === currentStep && !step.completed;
                            const isCompleted = step.completed || displaySteps.findIndex(s => s.step === step.step) < displaySteps.length - 1;
                            
                            return (
                                <div 
                                    key={step.step} 
                                    className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                                        isCurrentStep 
                                            ? 'text-blue-700 font-medium' 
                                            : isCompleted 
                                                ? 'text-green-600' 
                                                : 'text-gray-500'
                                    }`}
                                >
                                    {getStepIcon(step.step, isCompleted)}
                                    <span className="flex-1">{step.description}</span>
                                    {isCurrentStep && (
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {currentDescription && currentStep !== 'completed' && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                        <div className="text-xs text-blue-600">
                            {currentDescription}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressIndicator;