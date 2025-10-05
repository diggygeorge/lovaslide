"use client";

import React, { useState, useEffect, useRef } from "react";
import { AgentCard } from "@/components/ui/agent-card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FileText, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function WorkingAgentsPage() {
   const router = useRouter();
   const [activeAgent, setActiveAgent] = useState(0);
   const [completedAgents, setCompletedAgents] = useState<number[]>([]);
   const agentRefs = useRef<(HTMLDivElement | null)[]>([]);

   // Agent configurations with different colors and loading states
   const agents = [
      {
         name: "Extracting Agent",
         description: "Extracting content from your uploaded files",
         colors: [
            [0, 255, 255],
            [0, 200, 255],
         ], // Cyan to blue
         loadingStates: [
            { text: "Starting extraction..." },
            { text: "Extracting text content..." },
            { text: "Identifying key sections..." },
            { text: "Analyzing formatting..." },
            { text: "Analyzing metadata..." },
            { text: "Analyzing relationships..." },
            { text: "Extraction complete!" },
         ],
      },
      {
         name: "Analyzing Agent",
         description: "Analyzing the extracted content",
         colors: [
            [255, 0, 255],
            [200, 0, 255],
         ], // Magenta to purple
         loadingStates: [
            { text: "Analyzing content..." },
            { text: "Finding insights..." },
            { text: "Extracting information..." },
            { text: "Filtering information..." },
            { text: "Analyzing complete!" },
         ],
      },
      {
         name: "Slides Agent",
         description: "Creating beautiful slides",
         colors: [
            [255, 165, 0],
            [255, 140, 0],
         ], // Orange to dark orange
         loadingStates: [
            { text: "Selecting design templates..." },
            { text: "Applying color schemes..." },
            { text: "Optimizing layouts..." },
            { text: "Adding visual elements..." },
            { text: "Slides generation complete!" },
         ],
      },
      {
         name: "Validation Agent",
         description: "Validating the facts on the slides",
         colors: [
            [0, 255, 0],
            [0, 200, 0],
         ], // Green to dark green
         loadingStates: [
            { text: "Collecting facts..." },
            { text: "Checking facts..." },
            { text: "Validating facts..." },
            { text: "Adding references..." },
            { text: "Finalizing slides..." },
            { text: "Validation complete!" },
         ],
      },
   ];

   const handleAgentComplete = (agentIndex: number) => {
      setCompletedAgents((prev) =>
         prev.includes(agentIndex) ? prev : [...prev, agentIndex]
      );

      // Move to next agent after a short delay
      setTimeout(() => {
         if (agentIndex < agents.length - 1) {
            const nextAgent = agentIndex + 1;
            setActiveAgent(nextAgent);
         }
      }, 500);
   };

   const handleGoBack = () => {
      router.push("/");
   };

   const handleViewSlides = () => {
      router.push("/slides");
   };

   // Check if all agents are completed
   const completedCount = completedAgents.length;
   const allCompleted = completedCount === agents.length;

   useEffect(() => {
      const targetNode = agentRefs.current[activeAgent];

      if (!targetNode) {
         return;
      }

      requestAnimationFrame(() => {
         targetNode.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
         });
      });
   }, [activeAgent]);

   return (
      <div className="min-h-screen bg-background flex flex-col">
         {/* Header */}
         <header className="border-b border-border">
            <div className="container mx-auto px-6 py-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGoBack}
                        className="flex items-center space-x-2 hover:cursor-pointer"
                     >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                     </Button>
                     <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                           <FileText className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                           Lovaslide
                        </h1>
                     </div>
                  </div>
                  <div className="flex items-center space-x-4">
                     <div className="text-sm text-muted-foreground">
                        Working Agents
                     </div>
                     <ThemeToggle />
                  </div>
               </div>
            </div>
         </header>

         {/* Main Content */}
         <main className="flex-1 p-6">
            <div className="container mx-auto max-w-6xl">
               {/* Progress Header */}
               <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                     Our AI Agents are working!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                     Their work hard for your beautiful presentation...
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md mx-auto bg-muted rounded-full h-2 mb-4">
                     <div
                        className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                           width: `${(completedCount / agents.length) * 100}%`,
                        }}
                     />
                  </div>
                  <p className="text-sm text-muted-foreground">
                     {completedCount} of {agents.length} agents completed
                  </p>
               </div>

               {/* Agents Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {agents.map((agent, index) => {
                     const isCompleted = completedAgents.includes(index);
                     const isActive = activeAgent === index;
                     const shouldRender = isActive || isCompleted;

                     if (!shouldRender) {
                        agentRefs.current[index] = null;
                        return null;
                     }

                     const cardKey = `${agent.name}-${index}`;

                     return (
                        <div
                           key={cardKey}
                           ref={(element) => {
                              agentRefs.current[index] = element;
                           }}
                           className="w-full scroll-mt-24"
                        >
                           <AgentCard
                              agentName={agent.name}
                              agentDescription={agent.description}
                              colors={agent.colors}
                              loadingStates={agent.loadingStates}
                              isActive={isActive}
                              isCompleted={isCompleted}
                              onComplete={() => handleAgentComplete(index)}
                              className="w-full"
                           />
                        </div>
                     );
                  })}
               </div>

               {allCompleted && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-xl">
                     <div className="relative mx-4 w-full max-w-xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br via-background/90 to-background px-10 py-12 text-center shadow-xl">
                        <div className="absolute inset-x-10 -top-24 flex justify-center opacity-90 blur-2xl">
                           <div className="h-48 w-48 rounded-full bg-primary/40" />
                        </div>
                        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                           <Sparkles className="h-7 w-7" />
                        </div>
                        <div className="relative mt-6 space-y-4">
                           <h3 className="text-3xl font-semibold tracking-tight text-foreground">
                              Your presentation is ready!
                           </h3>
                           <p className="mx-auto max-w-xl text-base text-muted-foreground">
                              Thanks to our AI agents, your presentation is
                              finished for preview!
                           </p>
                           <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                              <Button size="lg" className="hover:cursor-pointer" onClick={handleViewSlides}>
                                 Preview
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="lg"
                                 className="hover:cursor-pointer"
                                 onClick={handleGoBack}
                              >
                                 Start Over
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}
