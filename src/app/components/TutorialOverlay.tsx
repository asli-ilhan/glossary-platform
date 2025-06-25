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
  const [sidePanelElement, setSidePanelElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        
        // Calculate tooltip position with better boundary checking
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Popup dimensions (approximate)
        const popupWidth = 400;
        const popupHeight = 300;
        const margin = 20;
        const separationDistance = 30; // Distance between popup and highlighted element
        
        let x = 0, y = 0;
        
        switch (step.position) {
          case 'top':
            x = rect.left + scrollLeft + rect.width / 2 - popupWidth / 2;
            y = rect.top + scrollTop - popupHeight - separationDistance;
            // If tooltip would go off top of screen, position it below instead
            if (y < margin) {
              y = rect.bottom + scrollTop + separationDistance;
            }
            // Ensure x position keeps popup within screen
            x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
            break;
          case 'bottom':
            x = rect.left + scrollLeft + rect.width / 2 - popupWidth / 2;
            y = rect.bottom + scrollTop + separationDistance;
            // If tooltip would go off bottom of screen, position it above instead
            if (y + popupHeight > window.innerHeight + scrollTop - margin) {
              y = rect.top + scrollTop - popupHeight - separationDistance;
            }
            // Ensure x position keeps popup within screen
            x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
            break;
          case 'left':
            x = rect.left + scrollLeft - popupWidth - separationDistance;
            y = rect.top + scrollTop + rect.height / 2 - popupHeight / 2;
            // If tooltip would go off left of screen, position it to the right instead
            if (x < margin) {
              x = rect.right + scrollLeft + separationDistance;
            }
            // Ensure y position keeps popup within screen
            y = Math.max(margin, Math.min(y, window.innerHeight + scrollTop - popupHeight - margin));
            // Special adjustment for click-side-panel step - move further left to show side panel
            if (step.id === 'click-side-panel') {
              x = Math.max(margin, rect.left + scrollLeft - popupWidth - 80);
            }
            break;
          case 'right':
            x = rect.right + scrollLeft + separationDistance;
            y = rect.top + scrollTop + rect.height / 2 - popupHeight / 2;
            // If tooltip would go off right of screen, position it to the left instead
            if (x + popupWidth > window.innerWidth - margin) {
              x = rect.left + scrollLeft - popupWidth - separationDistance;
            }
            // Ensure y position keeps popup within screen
            y = Math.max(margin, Math.min(y, window.innerHeight + scrollTop - popupHeight - margin));
            break;
          case 'center':
            x = window.innerWidth / 2 - popupWidth / 2;
            y = (window.innerHeight / 2) + scrollTop - popupHeight / 2;
            // Ensure center position is within bounds
            x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
            y = Math.max(margin + scrollTop, Math.min(y, window.innerHeight + scrollTop - popupHeight - margin));
            break;
        }
        
        setTooltipPosition({ x, y });
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Check for side panel highlighting
        if (step.id === 'click-side-panel') {
          // Look for the side panel after a short delay to allow for click demonstration
          setTimeout(() => {
            const sidePanel = document.querySelector('.fixed.top-0.right-0.h-full.w-96.bg-gray-900') as HTMLElement;
            if (sidePanel) {
              setSidePanelElement(sidePanel);
            }
          }, 2000); // Wait for the side panel to open
        } else {
          setSidePanelElement(null);
        }
        
        // Trigger demonstration actions for specific steps
        if (step.action === 'hover' && (step.id === 'cyan-segments' || step.id === 'hover-tooltip')) {
          // For hover demonstrations, find a cyan node and hover over it
          setTimeout(() => {
            const cyanNodes = document.querySelectorAll('.node circle[fill="#06b6d4"]');
            if (cyanNodes.length > 0) {
              const targetNode = cyanNodes[0] as HTMLElement;
              
              // Simulate mouse enter event
              const hoverEvent = new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetNode.getBoundingClientRect().left + 25,
                clientY: targetNode.getBoundingClientRect().top + 25
              });
              targetNode.dispatchEvent(hoverEvent);
              
              // Also trigger on the parent node group
              const nodeGroup = targetNode.closest('.node') as HTMLElement;
              if (nodeGroup) {
                nodeGroup.dispatchEvent(hoverEvent);
              }
            }
          }, 1500);
        }
        
        if (step.action === 'click' && step.id === 'click-side-panel') {
          // For side panel demonstration, find a cyan node and click it
          setTimeout(() => {
            const cyanNodes = document.querySelectorAll('.node circle[fill="#06b6d4"]');
            if (cyanNodes.length > 0) {
              const targetNode = cyanNodes[0] as HTMLElement;
              const rect = targetNode.getBoundingClientRect();
              
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2
              });
              
              // Trigger on the parent node group
              const nodeGroup = targetNode.closest('.node') as HTMLElement;
              if (nodeGroup) {
                nodeGroup.dispatchEvent(clickEvent);
              }
              
              // Check for side panel after click
              setTimeout(() => {
                const sidePanel = document.querySelector('.fixed.top-0.right-0.h-full.w-96.bg-gray-900') as HTMLElement;
                if (sidePanel) {
                  setSidePanelElement(sidePanel);
                }
              }, 500);
            }
          }, 1500);
        }
      }
    } else {
      setHighlightedElement(null);
      setSidePanelElement(null);
      const popupWidth = 400;
      const popupHeight = 300;
      const margin = 20;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const x = Math.max(margin, Math.min(window.innerWidth / 2 - popupWidth / 2, window.innerWidth - popupWidth - margin));
      const y = Math.max(margin + scrollTop, Math.min((window.innerHeight / 2) + scrollTop - popupHeight / 2, window.innerHeight + scrollTop - popupHeight - margin));
      
      setTooltipPosition({ x, y });
    }
  }, [currentStep, steps, isVisible]);

  const nextStep = () => {
    // Clean up any demonstration effects from current step
    cleanupDemonstrationEffects();
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const cleanupDemonstrationEffects = () => {
    const currentStepData = steps[currentStep];
    
    // Remove hover effects from cyan nodes
    if (currentStepData.action === 'hover' && (currentStepData.id === 'cyan-segments' || currentStepData.id === 'hover-tooltip')) {
      const cyanNodes = document.querySelectorAll('.node circle[fill="#06b6d4"]');
      if (cyanNodes.length > 0) {
        const targetNode = cyanNodes[0] as HTMLElement;
        const mouseLeaveEvent = new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Trigger on the parent node group
        const nodeGroup = targetNode.closest('.node') as HTMLElement;
        if (nodeGroup) {
          nodeGroup.dispatchEvent(mouseLeaveEvent);
        }
      }
    }
    
    // Remove hover effects from other elements
    if (currentStepData.action === 'hover' && highlightedElement && currentStepData.id !== 'cyan-segments' && currentStepData.id !== 'hover-tooltip') {
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      highlightedElement.dispatchEvent(mouseLeaveEvent);
    }
    
    // Close side panel if it was opened during demonstration
    if (currentStepData.id === 'click-side-panel') {
      // Dispatch event to close side panel
      window.dispatchEvent(new CustomEvent('closeSidePanel'));
      setSidePanelElement(null);
    }
  };

  const prevStep = () => {
    // Clean up any demonstration effects from current step
    cleanupDemonstrationEffects();
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    // Clean up any demonstration effects before skipping
    cleanupDemonstrationEffects();
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
              {sidePanelElement && (
                <rect
                  x={sidePanelElement.getBoundingClientRect().left - 8}
                  y={sidePanelElement.getBoundingClientRect().top - 8}
                  width={sidePanelElement.getBoundingClientRect().width + 16}
                  height={sidePanelElement.getBoundingClientRect().height + 16}
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

      {/* Highlight border for main element */}
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

      {/* Highlight border for side panel */}
      {sidePanelElement && (
        <div
          className="absolute border-4 border-cyan-400 rounded-lg pointer-events-none animate-pulse"
          style={{
            left: sidePanelElement.getBoundingClientRect().left - 4,
            top: sidePanelElement.getBoundingClientRect().top - 4,
            width: sidePanelElement.getBoundingClientRect().width + 8,
            height: sidePanelElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div
        className="absolute bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-600 max-w-sm z-[201]"
        style={{
          left: Math.max(20, Math.min(tooltipPosition.x, window.innerWidth - 420)),
          top: Math.max(20, tooltipPosition.y),
          width: '400px',
        }}
      >
        {/* Arrow pointer */}
        {highlightedElement && currentStepData.position !== 'center' && (
          <div
            className={`absolute w-4 h-4 bg-gray-900 border-gray-600 transform rotate-45 ${
              currentStepData.position === 'top' ? 'bottom-[-8px] left-1/2 -translate-x-1/2 border-b border-r' :
              currentStepData.position === 'bottom' ? 'top-[-8px] left-1/2 -translate-x-1/2 border-t border-l' :
              currentStepData.position === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2 border-t border-r' :
              'left-[-8px] top-1/2 -translate-y-1/2 border-b border-l'
            }`}
          />
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold mr-2">
              {currentStep + 1}
            </div>
            <h3 className="text-lg font-semibold text-cyan-300">{currentStepData.title}</h3>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-300 leading-relaxed">{currentStepData.content}</p>
            {currentStepData.action && (
              <div className="mt-3 p-3 bg-gray-800 rounded border-l-4 border-cyan-400">
                <p className="text-sm text-cyan-300 font-medium">
                  {currentStepData.action === 'click' && '👆 Click on the highlighted element'}
                  {currentStepData.action === 'hover' && '🖱️ Hover over the highlighted element'}
                  {currentStepData.action === 'none' && '👀 Take a look at the highlighted area'}
                </p>
              </div>
            )}
          </div>

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
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={skipTutorial}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
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
  );
} 