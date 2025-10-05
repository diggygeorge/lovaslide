"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   ExternalLink,
   CheckCircle,
   XCircle,
   AlertCircle,
   Eye,
   EyeOff,
} from "lucide-react";

interface ProofSource {
   title: string;
   url: string;
   snippet: string;
   reliability_score: number;
}

interface ValidationResult {
   claim: string;
   status: "valid" | "invalid" | "uncertain";
   confidence_score: number;
   explanation: string;
   proof_sources: ProofSource[];
   replacement_suggestion?: {
      suggested_replacement: string;
      explanation: string;
      proof_sources: ProofSource[];
   };
   recommendations: string[];
}

interface ValidationResultsProps {
   validation: {
      total_claims: number;
      valid_claims: number;
      invalid_claims: number;
      uncertain_claims: number;
      overall_confidence: number;
      summary: string;
      results: ValidationResult[];
   };
   slideContent?: string;
}

const STATUS_LABELS: Record<ValidationResult["status"], string> = {
   valid: "Valid",
   invalid: "Invalid",
   uncertain: "Uncertain",
};

const STATUS_BADGE_VARIANTS: Record<
   ValidationResult["status"],
   "default" | "secondary" | "destructive" | "outline"
> = {
   valid: "default",
   invalid: "destructive",
   uncertain: "secondary",
};

const ClaimHighlighter: React.FC<{
   text: string;
   claim: string;
   status: ValidationResult["status"];
   onClick: () => void;
}> = ({ text, claim, status, onClick }) => {
   const getStatusClasses = (currentStatus: ValidationResult["status"]) => {
      switch (currentStatus) {
         case "valid":
            return "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20";
         case "invalid":
            return "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20";
         case "uncertain":
            return "border border-muted/60 bg-muted text-foreground hover:bg-muted/80";
      }
   };

   const getStatusIcon = (currentStatus: ValidationResult["status"]) => {
      switch (currentStatus) {
         case "valid":
            return (
               <CheckCircle
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
               />
            );
         case "invalid":
            return (
               <XCircle
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
               />
            );
         case "uncertain":
            return (
               <AlertCircle
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
               />
            );
      }
   };

   // Simple text matching - highlight if the claim appears in the text
   const highlightClaim = (text: string, claim: string) => {
      if (!claim || !text) return text;

      // Clean up the claim text for better matching
      const cleanClaim = claim.replace(/^[-•]\s*/, "").trim();

      if (text.toLowerCase().includes(cleanClaim.toLowerCase())) {
         const parts = text.split(
            new RegExp(
               `(${cleanClaim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
               "gi"
            )
         );

         return parts.map((part, index) => {
            if (part.toLowerCase() === cleanClaim.toLowerCase()) {
               return (
                  <span
                     key={index}
                     className={`mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm transition-colors ${getStatusClasses(
                        status
                     )}`}
                     onClick={onClick}
                     title={`Click to view validation details for: ${claim}`}
                  >
                     {getStatusIcon(status)}
                     {part}
                  </span>
               );
            }
            return part;
         });
      }

      return text;
   };

   return <span>{highlightClaim(text, claim)}</span>;
};

const ValidationModal: React.FC<{
   result: ValidationResult;
   isOpen: boolean;
   onClose: () => void;
}> = ({ result, isOpen, onClose }) => {
   if (!isOpen) return null;

   const getStatusBadge = (status: ValidationResult["status"]) => (
      <Badge variant={STATUS_BADGE_VARIANTS[status]}>
         {STATUS_LABELS[status]}
      </Badge>
   );

   return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-lg font-semibold">
                  Validation Details
               </CardTitle>
               <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
               </Button>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Claim */}
               <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                     Claim
                  </h4>
                  <p className="rounded border bg-muted p-3 text-sm text-foreground">
                     {result.claim}
                  </p>
               </div>

               {/* Status and Confidence */}
               <div className="flex items-center gap-4">
                  <div>
                     <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Status
                     </h4>
                     {getStatusBadge(result.status)}
                  </div>
                  <div>
                     <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Confidence
                     </h4>
                     <Badge variant="outline" className="font-medium">
                        {(result.confidence_score * 100).toFixed(0)}%
                     </Badge>
                  </div>
               </div>

               {/* Explanation */}
               <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                     Explanation
                  </h4>
                  <p className="rounded border bg-muted/70 p-3 text-sm text-foreground">
                     {result.explanation}
                  </p>
               </div>

               {/* Proof Sources */}
               {result.proof_sources && result.proof_sources.length > 0 && (
                  <div>
                     <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Proof Sources ({result.proof_sources.length})
                     </h4>
                     <div className="space-y-3">
                        {result.proof_sources.map((source, index) => (
                           <div
                              key={index}
                              className="rounded border bg-muted/70 p-3"
                           >
                              <div className="mb-2 flex items-start justify-between">
                                 <h5 className="text-sm font-medium text-foreground">
                                    {source.title}
                                 </h5>
                                 <Badge
                                    variant="outline"
                                    className="text-xs font-medium"
                                 >
                                    {(source.reliability_score * 100).toFixed(
                                       0
                                    )}
                                    % reliable
                                 </Badge>
                              </div>
                              <p className="mb-2 text-xs text-muted-foreground">
                                 {source.snippet}
                              </p>
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="text-xs"
                                 onClick={() =>
                                    window.open(source.url, "_blank")
                                 }
                              >
                                 <ExternalLink className="mr-1 h-3 w-3" />
                                 View Source
                              </Button>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Replacement Suggestion */}
               {result.replacement_suggestion &&
                  result.replacement_suggestion.suggested_replacement && (
                     <div>
                        <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                           Suggested Replacement
                        </h4>
                        <div className="rounded border bg-muted/70 p-3">
                           <p className="mb-2 text-sm font-medium text-foreground">
                              {
                                 result.replacement_suggestion
                                    .suggested_replacement
                              }
                           </p>
                           <p className="text-xs text-muted-foreground">
                              {result.replacement_suggestion.explanation}
                           </p>
                        </div>
                     </div>
                  )}

               {/* Recommendations */}
               {result.recommendations && result.recommendations.length > 0 && (
                  <div>
                     <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Recommendations
                     </h4>
                     <ul className="space-y-1 text-sm text-foreground">
                        {result.recommendations.map((rec, index) => (
                           <li key={index} className="flex items-start gap-2">
                              <span className="mt-1 text-primary">•</span>
                              <span>{rec}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
};

export const ValidationResults: React.FC<ValidationResultsProps> = ({
   validation,
   slideContent,
}) => {
   const [selectedResult, setSelectedResult] =
      useState<ValidationResult | null>(null);
   const [showHighlights, setShowHighlights] = useState(false);

   const getOverallStatusColor = () => {
      const confidence = validation.overall_confidence;
      if (confidence >= 0.8) return "text-primary";
      if (confidence >= 0.6) return "text-muted-foreground";
      return "text-destructive";
   };

   const getOverallStatusIcon = () => {
      const confidence = validation.overall_confidence;
      if (confidence >= 0.8) {
         return (
            <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />
         );
      }
      if (confidence >= 0.6) {
         return (
            <AlertCircle
               className="h-5 w-5 text-muted-foreground"
               aria-hidden="true"
            />
         );
      }
      return (
         <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
      );
   };

   return (
      <div className="">
         {/* Validation Results */}
         {validation.results && validation.results.length > 0 && (
            <Card className="p-2">
               <CardHeader>
                  <CardTitle className="text-lg">Individual Claims</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                     {validation.results.map((result, index) => (
                        <div
                           key={index}
                           className="flex flex-col h-40 rounded-lg border p-3 hover:bg-muted/40 cursor-pointer"
                           onClick={() => setSelectedResult(result)}
                        >
                           <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                 <Badge
                                    variant={
                                       STATUS_BADGE_VARIANTS[result.status]
                                    }
                                    className={`text-xs ${
                                       result.status === "valid"
                                          ? "bg-green-700 text-white"
                                          : result.status === "invalid"
                                          ? "bg-red-700 text-white"
                                          : "bg-yellow-700 text-white"
                                    }`}
                                 >
                                    {STATUS_LABELS[result.status]}
                                 </Badge>
                                 <span className="text-xs font-medium text-foreground">
                                    {(result.confidence_score * 100).toFixed(0)}
                                    %
                                 </span>
                              </div>
                              {result.proof_sources &&
                                 result.proof_sources.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                       {result.proof_sources.length} sources
                                    </div>
                                 )}
                              <div className="text-xs font-medium text-foreground line-clamp-3">
                                 {showHighlights && slideContent ? (
                                    <ClaimHighlighter
                                       text={slideContent}
                                       claim={result.claim}
                                       status={result.status}
                                       onClick={() => setSelectedResult(result)}
                                    />
                                 ) : (
                                    result.claim
                                 )}
                              </div>
                           </div>
                           <div className="mt-auto pt-2">
                              <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => setSelectedResult(result)}
                                 className="text-xs h-6 px-2 w-full"
                              >
                                 View detail
                              </Button>
                           </div>
                        </div>
                     ))}
                  </div>
               </CardContent>
            </Card>
         )}

         {/* Modal for detailed view */}
         <ValidationModal
            result={selectedResult!}
            isOpen={!!selectedResult}
            onClose={() => setSelectedResult(null)}
         />
      </div>
   );
};

export default ValidationResults;
