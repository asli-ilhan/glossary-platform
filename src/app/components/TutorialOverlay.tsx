"use client";

import { useState, useEffect, useRef } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'none';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function TutorialOverlay({ steps, isVisible, onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [arrowPosition, setArrowPosition] = useState<{ x: number; y: number; direction: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Calculate arrow position next to the highlighted frame
        calculateArrowPosition(element);
      }
    } else {
      setHighlightedElement(null);
      setArrowPosition(null);
    }
  }, [currentStep, steps, isVisible]);

  const calculateArrowPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const popupX = 20;
    const popupY = window.innerHeight - 380; // Adjusted for new popup height
    
    // Determine the best side to place arrow based on element position relative to popup
    let arrowX, arrowY, direction;
    
    // Calculate distances to each side of the element
    const toLeft = rect.left;
    const toRight = window.innerWidth - rect.right;
    const toTop = rect.top;
    const toBottom = window.innerHeight - rect.bottom;
    
    // Choose the side with most space, but prefer visible sides
    if (toRight > 50 && rect.left > popupX + 400) {
      // Arrow on right side of element
      arrowX = rect.right + 12;
      arrowY = rect.top + rect.height / 2;
      direction = 'right';
    } else if (toLeft > 50 && rect.right < popupX) {
      // Arrow on left side of element  
      arrowX = rect.left - 24;
      arrowY = rect.top + rect.height / 2;
      direction = 'left';
    } else if (toBottom > 50) {
      // Arrow below element
      arrowX = rect.left + rect.width / 2;
      arrowY = rect.bottom + 12;
      direction = 'down';
    } else {
      // Arrow above element
      arrowX = rect.left + rect.width / 2;
      arrowY = rect.top - 24;
      direction = 'up';
    }
    
    setArrowPosition({ x: arrowX, y: arrowY, direction });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    onSkip();
  };

  if (!isVisible || currentStep >= steps.length) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200]" ref={overlayRef}>
      {/* Dark overlay with highlight cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="highlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {highlightedElement && (
                <rect
                  x={highlightedElement.getBoundingClientRect().left - 8}
                  y={highlightedElement.getBoundingClientRect().top - 8}
                  width={highlightedElement.getBoundingClientRect().width + 16}
                  height={highlightedElement.getBoundingClientRect().height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#highlight-mask)"
          />
        </svg>
      </div>

      {/* Highlight border */}
      {highlightedElement && (
        <div
          className="absolute border-4 border-cyan-400 rounded-lg pointer-events-none animate-pulse"
          style={{
            left: highlightedElement.getBoundingClientRect().left - 4,
            top: highlightedElement.getBoundingClientRect().top - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          }}
        />
      )}

      {/* Small arrow pointer next to highlighted element */}
      {arrowPosition && highlightedElement && (
        <div
          className="absolute pointer-events-none z-[201]"
          style={{
            left: arrowPosition.x - 12,
            top: arrowPosition.y - 12,
          }}
        >
          <div className={`w-6 h-6 transform animate-pulse ${
            arrowPosition.direction === 'right' ? 'rotate-180' :
            arrowPosition.direction === 'left' ? 'rotate-0' :
            arrowPosition.direction === 'down' ? 'rotate-270' :
            'rotate-90'
          }`}>
            <svg viewBox="0 0 24 24" fill="#06b6d4" className="w-6 h-6">
              <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Fixed tutorial popup - bottom left with proper sizing */}
      <div
        className="fixed bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-600 z-[201] overflow-hidden"
        style={{
          left: '20px',
          bottom: '20px',
          width: '400px',
          height: '400px',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                {currentStep + 1}
              </div>
              <h3 className="text-lg font-semibold text-cyan-300 leading-tight">{currentStepData.title}</h3>
            </div>
          </div>

          {/* Content - scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <p className="text-gray-300 leading-relaxed text-sm mb-4">{currentStepData.content}</p>
              
              {currentStepData.action && currentStepData.action !== 'none' && (
                <div className="p-3 bg-gray-800 rounded border-l-4 border-cyan-400">
                  <p className="text-sm text-cyan-300 font-medium">
                    {currentStepData.action === 'click' && '👆 Try clicking on the highlighted element'}
                    {currentStepData.action === 'hover' && '🖱️ Try hovering over the highlighted element'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer with progress and buttons */}
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={skipTutorial}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors font-medium"
                >
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 