
import React from 'react';
import { Link } from 'react-router-dom';

const PencilIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);
const IdentificationIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 76 76" fill="currentColor">
        <path d="M 21.3,17L 46.7,17C 47.418,17 48,17.5821 48,18.3L 48,24.7C 48,25.418 47.418,26 46.7,26L 31.3,26C 30.0298,26 29,27.0298 29,28.3L 29,49.7C 29,50.418 28.418,51 27.7,51L 21.3,51C 20.582,51 20,50.418 20,49.7L 20,18.3C 20,17.582 20.582,17 21.3,17 Z M 33.3,29L 54.7,29C 55.418,29 56,29.582 56,30.3L 56,57.7C 56,58.418 55.418,59 54.7,59L 33.3,59C 32.582,59 32,58.418 32,57.7L 32,30.3C 32,29.582 32.582,29 33.3,29 Z "/>
    </svg>
);
const CreditCardIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);
const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
    </svg>
);

interface ProgressTrackerProps {
  currentStep: number;
  completedSteps: { [key: number]: boolean };
  getStepPath: (step: number) => string;
}

const visualSteps = [
  { name: 'Design', step: 1, icon: IdentificationIcon },
  { name: 'NFC link', step: 2, icon: PencilIcon },
  { name: 'Pay', step: 3, icon: CreditCardIcon },
];

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep, completedSteps, getStepPath }) => {
  return (
    <div className="w-full mx-auto py-2 relative">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-start justify-between relative z-10">
          {visualSteps.map((vStep, index) => {
            const isCompleted = completedSteps[vStep.step];
            const isCurrent = vStep.step === currentStep;
            const isAccessible = vStep.step === 1 || completedSteps[vStep.step - 1];

            const StepContent = () => {
              const IconComponent = vStep.icon;
              return (
                <div className="flex flex-col items-center space-y-2 bg-zinc-950/50 p-1 rounded-lg">
                   <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${isCurrent ? 'border-gold bg-zinc-950 shadow-[0_0_10px_rgba(215,186,82,0.3)]' : 'border-zinc-700 bg-zinc-800'}`}>
                     {(isCompleted && !isCurrent) ? (
                        <div className="absolute inset-0 rounded-full bg-gold flex items-center justify-center">
                            <CheckIcon className="h-6 w-6 text-black" />
                        </div>
                    ) : (
                        <IconComponent className={`h-5 w-5 transition-colors ${isCurrent ? 'text-gold' : isAccessible ? 'text-zinc-400 group-hover:text-gold' : 'text-zinc-600' }`} />
                    )}
                  </div>
                  <span className={`block text-center text-[10px] sm:text-xs font-medium leading-tight transition-colors ${
                      isCurrent ? 'text-gold' : isCompleted ? 'text-zinc-300' : isAccessible ? 'text-zinc-400 group-hover:text-gold' : 'text-zinc-600'
                  }`}>
                      {vStep.name}
                  </span>
                </div>
              );
            };

            const isLast = index === visualSteps.length - 1;
            const isLineActive = completedSteps[vStep.step];

            return (
              <li key={vStep.name} className="relative flex-1 flex flex-col items-center">
                 {!isLast && (
                  <div className="absolute top-5 left-[50%] w-full h-0.5 -translate-y-1/2 -z-10" aria-hidden="true">
                    <div className={`${isLineActive ? 'bg-gold' : 'bg-zinc-700'} w-full h-full transition-colors duration-500`} />
                  </div>
                )}
                {isAccessible ? (
                  <Link to={getStepPath(vStep.step)} className="group focus:outline-none">
                    <StepContent />
                  </Link>
                ) : (
                  <div className="cursor-not-allowed">
                    <StepContent />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default ProgressTracker;
