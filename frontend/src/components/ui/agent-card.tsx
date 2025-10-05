"use client";

import React, { useState, useCallback } from "react";
import { CanvasRevealEffect } from "./canvas-reveal-effect";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface AgentCardProps {
   agentName: string;
   agentDescription: string;
   colors: number[][];
   loadingStates: Array<{ text: string }>;
   isActive: boolean;
   isCompleted: boolean;
   onComplete?: () => void;
   className?: string;
}

export const AgentCard = ({
   agentName,
   agentDescription,
   colors,
   loadingStates,
   isActive,
   isCompleted,
   onComplete,
   className,
}: AgentCardProps) => {
   const [showLoader, setShowLoader] = useState(false);
   const [currentStep, setCurrentStep] = useState(0);

   // Simulate agent processing
   const handleAgentStart = useCallback(() => {
      if (isActive && !isCompleted) {
         setShowLoader(true);
         setCurrentStep(0);

         // Simulate step progression
         let stepIndex = 0;
         const stepInterval = setInterval(() => {
            stepIndex++;
            setCurrentStep(stepIndex);

            if (stepIndex >= loadingStates.length) {
               clearInterval(stepInterval);
               setTimeout(() => {
                  setShowLoader(false);
                  setCurrentStep(0);
                  onComplete?.();
               }, 300);
            }
         }, newStepDuration);
      }
   }, [isActive, isCompleted, loadingStates.length, onComplete, agentName]);

   // Start the agent when it becomes active
   React.useEffect(() => {
      if (isActive && !isCompleted) {
         handleAgentStart();
      }
   }, [isActive, isCompleted, handleAgentStart, agentName]);

   const isInProgress = isActive && !isCompleted;
   const accentColor = isInProgress ? colors?.[0] ?? [255, 255, 255] : null;
   const accentColorString = accentColor
      ? `rgb(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]})`
      : "rgba(255, 255, 255, 0.6)";
   const totalSteps = loadingStates.length;
   const hasSteps = totalSteps > 0;
   const hasStarted = showLoader || currentStep > 0 || isCompleted;
   const activeStepIndex = isCompleted
      ? totalSteps - 1
      : Math.min(currentStep, Math.max(totalSteps - 1, 0));
   const progressFraction = hasSteps
      ? isCompleted
         ? 1
         : hasStarted
         ? (activeStepIndex + 1) / totalSteps
         : 0
      : 0;
   const statusLabel = isCompleted
      ? "Completed"
      : isActive
      ? "In progress"
      : "Pending";
   const currentStepLabel = hasSteps
      ? isCompleted
         ? "All steps completed"
         : hasStarted
         ? loadingStates[activeStepIndex]?.text ?? "Processing..."
         : loadingStates[0]?.text ?? "Processing..."
      : "Processing...";
   const windowSize = 5;
   const maxStartIndex = Math.max(totalSteps - windowSize, 0);
   const focusIndex = isCompleted
      ? totalSteps - 1
      : hasStarted
      ? activeStepIndex
      : 0;
   const startIndex = Math.max(
      0,
      Math.min(focusIndex - (windowSize - 1), maxStartIndex)
   );
   const endIndex = Math.min(totalSteps, startIndex + windowSize);
   const visibleSteps = loadingStates.slice(startIndex, endIndex);
   const hasPreviousSteps = startIndex > 0;
   const hasMoreSteps = endIndex < totalSteps;
   const cardState = isCompleted
      ? "completed"
      : isInProgress
      ? "active"
      : "idle";
   const baseBackgroundClass =
      cardState === "active" ? "bg-black/60" : "bg-black/80";
   const overlayVeilClass =
      cardState === "active"
         ? "bg-black/60"
         : cardState === "completed"
         ? "bg-black/40"
         : "bg-black/50";
   const borderToneClass =
      cardState === "active" ? "border-white/20" : "border-white/10";
   const normalizedSteps = Math.max(totalSteps, 1);
   const baseStepTarget = 4;
   const stepDuration = 600; // ms per step
   const totalDuration = normalizedSteps * stepDuration; // total ms for this agent

   const systemTotalDuration = 13800; // 13.8s in ms
   const additionalTime = 10000; // 10s in ms
   const proportionalIncrease =
      (totalDuration / systemTotalDuration) * additionalTime;
   const baseDuration = totalDuration + proportionalIncrease;

   const newStepDuration = baseDuration / normalizedSteps;
   const originalStepDuration = 600;
   const canvasSpeedMultiplier = originalStepDuration / newStepDuration;
   const baseCanvasSpeed = 0.4; // Default canvas speed
   const revealSpeed =
      cardState === "active"
         ? Math.min(Math.max(baseCanvasSpeed * canvasSpeedMultiplier, 0.2), 1.0)
         : 0;

   return (
      <div
         className={cn(
            "relative transition-all duration-500 ease-out",
            className,
            cardState === "active"
               ? "opacity-100"
               : cardState === "completed"
               ? "opacity-75"
               : "opacity-60"
         )}
         data-state={cardState}
      >
         <Card
            className={cn(
               "relative overflow-hidden border-0 bg-transparent py-0 transition-all duration-500 ease-out",
               cardState === "active" &&
                  "shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
            )}
            data-active={isActive}
         >
            <CardContent className="relative p-0">
               <div
                  className={cn(
                     "relative min-h-[320px] overflow-hidden rounded-3xl transition-colors duration-500",
                     baseBackgroundClass
                  )}
               >
                  <div className="absolute inset-0">
                     <CanvasRevealEffect
                        key={`${agentName}-${isActive}-${isCompleted}`}
                        animationSpeed={revealSpeed}
                        colors={
                           cardState === "active"
                              ? colors
                              : cardState === "completed"
                              ? [[45, 180, 111]]
                              : [[45, 45, 45]]
                        }
                        dotSize={2}
                        containerClassName="h-full"
                        showGradient={false}
                     />
                  </div>
                  <div
                     className="absolute inset-0 opacity-20"
                     style={{
                        background:
                           "radial-gradient(120% 120% at 80% 0%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.85) 55%)",
                     }}
                  />
                  <div
                     className={cn(
                        "pointer-events-none absolute inset-0 transition-colors duration-500",
                        overlayVeilClass
                     )}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-6">
                     <div className="flex items-start justify-between gap-6">
                        <div className="space-y-3">
                           <div className="space-y-2">
                              <h3 className="text-2xl font-semibold text-white">
                                 {agentName}
                              </h3>
                              <p className="text-sm text-white/70">
                                 {agentDescription}
                              </p>
                           </div>
                        </div>
                        {hasSteps && (
                           <div className="flex flex-col items-end text-right">
                              <span className="text-xs uppercase tracking-wide text-white/50">
                                 Step
                              </span>
                              <span className="text-lg font-semibold text-white">
                                 {isCompleted
                                    ? `${totalSteps}`
                                    : `${Math.max(
                                         activeStepIndex + (hasStarted ? 1 : 0),
                                         1
                                      )}`}
                                 <span className="text-white/60">
                                    /{totalSteps}
                                 </span>
                              </span>
                           </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        {hasSteps && (
                           <div className="relative grid min-h-[200px] gap-2">
                              {hasPreviousSteps && (
                                 <div className="pointer-events-none absolute -top-2 left-0 right-0 h-6 " />
                              )}
                              {visibleSteps.map((loadingState, index) => {
                                 const stepIndex = startIndex + index;
                                 const isComplete =
                                    isCompleted ||
                                    (hasStarted && stepIndex < activeStepIndex);
                                 const isCurrent =
                                    !isCompleted &&
                                    hasStarted &&
                                    stepIndex === activeStepIndex;

                                 return (
                                    <div
                                       key={`${loadingState.text}-${stepIndex}`}
                                       className={cn(
                                          "flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2transition",
                                          isComplete &&
                                             "border-white/30 bg-white/10",
                                          isCurrent &&
                                             "border-white/40 bg-white/10",
                                          !isComplete &&
                                             !isCurrent &&
                                             "bg-white/5 text-white/60"
                                       )}
                                       style={
                                          isCurrent && accentColor
                                             ? {
                                                  borderColor:
                                                     accentColorString,
                                                  boxShadow: `0 0 15px rgba(${
                                                     accentColor?.[0] ?? 255
                                                  }, ${
                                                     accentColor?.[1] ?? 255
                                                  }, ${
                                                     accentColor?.[2] ?? 255
                                                  }, 0.3)`,
                                               }
                                             : undefined
                                       }
                                    >
                                       <div className="flex h-6 w-6 items-center justify-center rounded-full">
                                          {isComplete || isCurrent ? (
                                             <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="h-4 w-4 text-white"
                                             >
                                                <path
                                                   fillRule="evenodd"
                                                   d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                   clipRule="evenodd"
                                                />
                                             </svg>
                                          ) : (
                                             <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="h-4 w-4 text-white/40"
                                             >
                                                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                             </svg>
                                          )}
                                       </div>
                                       <span
                                          className={cn(
                                             "text-sm text-white/70",
                                             isComplete && "text-white",
                                             isCurrent &&
                                                "text-white font-medium"
                                          )}
                                       >
                                          {loadingState.text}
                                       </span>
                                    </div>
                                 );
                              })}
                              {hasMoreSteps && (
                                 <div className="pointer-events-none absolute -bottom-2 left-0 right-0 h-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  {isCompleted && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-6">
                        <div className="text-center space-y-3">
                           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                              <svg
                                 className="h-8 w-8 text-white"
                                 fill="none"
                                 stroke="currentColor"
                                 viewBox="0 0 24 24"
                              >
                                 <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                 />
                              </svg>
                           </div>
                           <h3 className="text-2xl font-semibold text-white">
                              {agentName}
                           </h3>
                           <p className="text-sm text-white/70">
                              Completed successfully
                           </p>
                        </div>
                     </div>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
   );
};
