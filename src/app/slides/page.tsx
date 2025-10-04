"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
   MessageSquare,
   Play,
   Sparkles,
   ChevronDown,
   ChevronLeft,
   ChevronRight,
   ChevronUp,
   Download,
   FileText,
   Presentation,
   Send,
   Bot,
   History,
   CheckCircle,
   LayoutDashboard,
} from "lucide-react";

const slideThumbnails = [
   {
      id: 1,
      title: "Vision & Mission",
      status: "Needs polish",
   },
   {
      id: 2,
      title: "Opportunity",
      status: "Drafted",
   },
   {
      id: 3,
      title: "Solution Overview",
      status: "Reviewed",
   },
   {
      id: 4,
      title: "Roadmap",
      status: "Ready",
   },
];

const getToneForStatus = (status: string) => {
   if (status === "Ready") return "success" as const;
   if (status === "Needs polish") return "attention" as const;
   return "neutral" as const;
};

const SlideStatusBadge = ({
   label,
   tone = "neutral",
}: {
   label: string;
   tone?: "neutral" | "attention" | "success";
}) => {
   const styles = {
      neutral: "border-white/15 bg-white/5 text-white/70",
      attention: "border-amber-300/40 bg-amber-400/15 text-amber-100",
      success: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
   } as const;

   return (
      <span
         className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide",
            styles[tone]
         )}
      >
         <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
         {label}
      </span>
   );
};

export default function SlidesWorkspacePage() {
   const [activeSlideIndex, setActiveSlideIndex] = useState(0);
   const [noteText, setNoteText] = useState("");
   const [isProcessing, setIsProcessing] = useState(false);
   const [isDockOpen, setIsDockOpen] = useState(true);
   const [recentNotes, setRecentNotes] = useState([
      {
         id: 1,
         text: "Make the title more impactful and add customer testimonials",
         timestamp: "2 minutes ago",
         status: "completed",
      },
      {
         id: 2,
         text: "Add more visual elements to support the three pillars",
         timestamp: "5 minutes ago",
         status: "pending",
      },
   ]);

   const slidesCount = slideThumbnails.length;
   const activeSlide = slideThumbnails[activeSlideIndex];
   const isFirstSlide = activeSlideIndex === 0;
   const isLastSlide = activeSlideIndex === slidesCount - 1;

   const handleSubmitNote = () => {
      if (!noteText.trim()) return;

      setIsProcessing(true);
      // Simulate processing
      setTimeout(() => {
         const newNote = {
            id: Date.now(),
            text: noteText,
            timestamp: "Just now",
            status: "pending",
         };
         setRecentNotes((prev) => [newNote, ...prev]);
         setNoteText("");
         setIsProcessing(false);
      }, 1500);
   };

   const handlePrevSlide = () => {
      if (!isFirstSlide) {
         setActiveSlideIndex((prev) => prev - 1);
      }
   };

   const handleNextSlide = () => {
      if (!isLastSlide) {
         setActiveSlideIndex((prev) => prev + 1);
      }
   };

   const handleSelectSlide = (index: number) => {
      setActiveSlideIndex(index);
   };

   return (
      <div className="flex min-h-screen flex-col bg-background">
         <header className="border-b border-border/60 bg-background/95 backdrop-blur">
            <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
               <div className="flex items-center gap-4">
                  <LayoutDashboard className="h-8 w-8" />
                  <div>
                     <h1 className="text-2xl font-semibold text-foreground">
                        Lovaslide Presentation Workspace
                     </h1>
                     <p className="text-sm text-muted-foreground">
                        Workspace for your presentation
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2">
                     <Play className="h-4 w-4" />
                     Present
                  </Button>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button size="sm" className="gap-2">
                           Export
                           <ChevronDown className="h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="gap-2">
                           <FileText className="h-4 w-4" />
                           <span>Export to PowerPoint</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                           <Presentation className="h-4 w-4" />
                           <span>Export to Google Slides</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2">
                           <Download className="h-4 w-4" />
                           <span>Download as PDF</span>
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
         </header>

         <main className="flex-1">
            <div className="container mx-auto flex max-w-screen flex-col gap-8 px-6 py-10">
               <div className="flex flex-col gap-6 lg:flex-row">
                  <Card className="flex-1 overflow-hidden border-border/60 bg-gradient-to-br from-primary/15 via-background to-background">
                     <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                           <SlideStatusBadge
                              label={`Slide ${String(activeSlide.id).padStart(
                                 2,
                                 "0"
                              )}`}
                              tone={getToneForStatus(activeSlide.status)}
                           />
                        </div>
                        <div className="text-sm text-muted-foreground">
                           <div className="text-xs text-muted-foreground/80">
                              Slide {activeSlideIndex + 1} of {slidesCount}
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent>
                        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/80">
                           <div className="relative flex h-full flex-col gap-8">
                              <div className="flex-1">
                                 <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30">
                                    <div className="space-y-2 text-center">
                                       <p className="text-sm text-white/60">
                                          Slide preview empty
                                       </p>
                                       <p className="text-2xl font-semibold text-white/85">
                                          {activeSlide.title}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="pointer-events-none absolute bottom-4 left-6 right-6">
                              <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/70 backdrop-blur overflow-hidden transition-all duration-300 ease-in-out">
                                 {/* Toggle Button */}
                                 <div className="flex justify-center py-1">
                                    <Button
                                       variant="ghost"
                                       size="icon-sm"
                                       className="h-6 w-12 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary"
                                       aria-label={
                                          isDockOpen ? "Hide dock" : "Show dock"
                                       }
                                       onClick={() =>
                                          setIsDockOpen(!isDockOpen)
                                       }
                                    >
                                       <ChevronUp
                                          className={cn(
                                             "h-3 w-3 transition-transform duration-200",
                                             isDockOpen && "rotate-180"
                                          )}
                                       />
                                    </Button>
                                 </div>

                                 {/* Dock Content */}
                                 <div
                                    className={cn(
                                       "transition-all duration-300 ease-in-out overflow-hidden",
                                       isDockOpen
                                          ? "max-h-28 opacity-100"
                                          : "max-h-0 opacity-0"
                                    )}
                                 >
                                    <div className="px-3 pb-2">
                                       <div className="flex items-center gap-2">
                                          <Button
                                             variant="ghost"
                                             size="icon-sm"
                                             className="h-8 w-8 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary disabled:opacity-40"
                                             aria-label="Previous slide"
                                             onClick={handlePrevSlide}
                                             disabled={isFirstSlide}
                                          >
                                             <ChevronLeft className="h-4 w-4" />
                                          </Button>
                                          <div className="flex gap-2 overflow-x-auto pb-1 pr-1 flex-1 justify-center">
                                             {slideThumbnails.map(
                                                (slide, index) => (
                                                   <button
                                                      key={slide.id}
                                                      className={cn(
                                                         "flex w-16 shrink-0 flex-col gap-1 rounded-lg border p-1 text-left transition",
                                                         index ===
                                                            activeSlideIndex
                                                            ? "border-primary/60 bg-primary/10"
                                                            : "border-white/15 bg-white/5 hover:border-primary/40"
                                                      )}
                                                      type="button"
                                                      onClick={() =>
                                                         handleSelectSlide(
                                                            index
                                                         )
                                                      }
                                                   >
                                                      <div className="aspect-[7/5] w-full rounded-md border border-dashed border-white/15 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                         <div className="text-center">
                                                            <div className="text-[7px] font-semibold text-white/80 mb-0.5">
                                                               {slide.id}
                                                            </div>
                                                            <div className="text-[5px] text-white/60 leading-tight">
                                                               {slide.title}
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </button>
                                                )
                                             )}
                                          </div>
                                          <Button
                                             variant="ghost"
                                             size="icon-sm"
                                             className="h-8 w-8 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary disabled:opacity-40"
                                             aria-label="Next slide"
                                             onClick={handleNextSlide}
                                             disabled={isLastSlide}
                                          >
                                             <ChevronRight className="h-4 w-4" />
                                          </Button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  <Card className="w-full border-border/60 lg:max-w-sm">
                     <CardHeader className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                           Add notes & actions
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                           Share context or cue an agent to update this slide.
                        </p>
                     </CardHeader>
                     <div className="h-px bg-border/60" />
                     <CardContent className="space-y-6">
                        {/* Recent Notes */}
                        {recentNotes.length > 0 && (
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                 <History className="h-4 w-4 text-muted-foreground" />
                                 <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Recent notes
                                 </Label>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                 {recentNotes.slice(0, 2).map((note) => (
                                    <div
                                       key={note.id}
                                       className={cn(
                                          "rounded-lg border p-3 text-sm transition-colors",
                                          note.status === "completed"
                                             ? "border-emerald-200/20 bg-emerald-50/10"
                                             : "border-amber-200/20 bg-amber-50/10"
                                       )}
                                    >
                                       <div className="flex items-start gap-2">
                                          {note.status === "completed" ? (
                                             <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                          ) : (
                                             <Bot className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                             <p className="text-foreground/90 leading-relaxed">
                                                {note.text}
                                             </p>
                                             <p className="text-xs text-muted-foreground mt-1">
                                                {note.timestamp}
                                             </p>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Add New Note */}
                        <div className="space-y-3">
                           <Label
                              htmlFor="slide-note"
                              className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3 block"
                           >
                              Add a note
                           </Label>
                           <Textarea
                              id="slide-note"
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Describe a change or ask an agent to edit this slide..."
                              className="min-h-[100px]"
                           />
                           <div className="flex items-center gap-2">
                              <Button
                                 size="sm"
                                 className="gap-2 flex-1"
                                 onClick={handleSubmitNote}
                                 disabled={!noteText.trim() || isProcessing}
                              >
                                 {isProcessing ? (
                                    <>
                                       <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                       Processing...
                                    </>
                                 ) : (
                                    <>
                                       <Send className="h-4 w-4" />
                                       Send to agent
                                    </>
                                 )}
                              </Button>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </main>

         <Button
            size="lg"
            className="fixed bottom-6 right-6 z-40 gap-3 bg-primary text-primary-foreground shadow-xl hover:bg-primary/90"
         >
            <MessageSquare className="h-5 w-5" />
            Talk to Slides
         </Button>
      </div>
   );
}
