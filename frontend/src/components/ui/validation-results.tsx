"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

interface ProofSource {
  title: string;
  url: string;
  snippet: string;
  reliability_score: number;
}

interface ValidationResult {
  claim: string;
  status: "valid" | "invalid" | "uncertain" | "needs_review";
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

const ClaimHighlighter: React.FC<{
  text: string;
  claim: string;
  status: ValidationResult["status"];
  onClick: () => void;
}> = ({ text, claim, status, onClick }) => {
  const getStatusColor = (status: ValidationResult["status"]) => {
    switch (status) {
      case "valid":
        return "bg-green-100 border-green-300 text-green-800 hover:bg-green-200";
      case "invalid":
        return "bg-red-100 border-red-300 text-red-800 hover:bg-red-200";
      case "uncertain":
        return "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusIcon = (status: ValidationResult["status"]) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4" />;
      case "invalid":
        return <XCircle className="w-4 h-4" />;
      case "uncertain":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Simple text matching - highlight if the claim appears in the text
  const highlightClaim = (text: string, claim: string) => {
    if (!claim || !text) return text;
    
    // Clean up the claim text for better matching
    const cleanClaim = claim.replace(/^[-•]\s*/, "").trim();
    
    if (text.toLowerCase().includes(cleanClaim.toLowerCase())) {
      const parts = text.split(new RegExp(`(${cleanClaim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      
      return parts.map((part, index) => {
        if (part.toLowerCase() === cleanClaim.toLowerCase()) {
          return (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-2 py-1 mx-1 rounded border cursor-pointer transition-colors ${getStatusColor(status)}`}
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

  const getStatusBadge = (status: ValidationResult["status"]) => {
    const variants = {
      valid: "bg-green-500 hover:bg-green-600",
      invalid: "bg-red-500 hover:bg-red-600",
      uncertain: "bg-yellow-500 hover:bg-yellow-600",
      needs_review: "bg-blue-500 hover:bg-blue-600"
    };

    const labels = {
      valid: "Valid",
      invalid: "Invalid",
      uncertain: "Uncertain",
      needs_review: "Needs Review"
    };

    return (
      <Badge className={`${variants[status]} text-white`}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Validation Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim */}
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Claim</h4>
            <p className="text-sm bg-gray-50 p-3 rounded border">{result.claim}</p>
          </div>

          {/* Status and Confidence */}
          <div className="flex items-center gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Status</h4>
              {getStatusBadge(result.status)}
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Confidence</h4>
              <Badge variant="outline">
                {(result.confidence_score * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Explanation</h4>
            <p className="text-sm bg-blue-50 p-3 rounded border">{result.explanation}</p>
          </div>

          {/* Proof Sources */}
          {result.proof_sources && result.proof_sources.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">
                Proof Sources ({result.proof_sources.length})
              </h4>
              <div className="space-y-3">
                {result.proof_sources.map((source, index) => (
                  <div key={index} className="border rounded p-3 bg-green-50">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-sm">{source.title}</h5>
                      <Badge variant="outline" className="text-xs">
                        {(source.reliability_score * 100).toFixed(0)}% reliable
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{source.snippet}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => window.open(source.url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Source
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replacement Suggestion */}
          {result.replacement_suggestion && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Suggested Replacement</h4>
              <div className="bg-yellow-50 p-3 rounded border">
                <p className="text-sm font-medium mb-2">
                  {result.replacement_suggestion.suggested_replacement}
                </p>
                <p className="text-xs text-gray-600">
                  {result.replacement_suggestion.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Recommendations</h4>
              <ul className="text-sm space-y-1">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
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
  slideContent
}) => {
  const [selectedResult, setSelectedResult] = useState<ValidationResult | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);

  const getOverallStatusColor = () => {
    const confidence = validation.overall_confidence;
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getOverallStatusIcon = () => {
    const confidence = validation.overall_confidence;
    if (confidence >= 0.8) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (confidence >= 0.6) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {getOverallStatusIcon()}
              Validation Results
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlights(!showHighlights)}
            >
              {showHighlights ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showHighlights ? "Hide" : "Show"} Highlights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{validation.total_claims}</div>
              <div className="text-sm text-gray-600">Total Claims</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validation.valid_claims}</div>
              <div className="text-sm text-gray-600">Valid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{validation.invalid_claims}</div>
              <div className="text-sm text-gray-600">Invalid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{validation.uncertain_claims}</div>
              <div className="text-sm text-gray-600">Uncertain</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-3xl font-bold ${getOverallStatusColor()}`}>
              {(validation.overall_confidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Overall Confidence</div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation.results && validation.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Individual Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validation.results.map((result, index) => (
                <div key={index} className="border rounded p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {showHighlights && slideContent ? (
                        <ClaimHighlighter
                          text={slideContent}
                          claim={result.claim}
                          status={result.status}
                          onClick={() => setSelectedResult(result)}
                        />
                      ) : (
                        <p className="text-sm font-medium">{result.claim}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge
                        variant={result.status === "valid" ? "default" : "secondary"}
                        className={
                          result.status === "valid"
                            ? "bg-green-500 hover:bg-green-600"
                            : result.status === "invalid"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }
                      >
                        {result.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedResult(result)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Confidence: {(result.confidence_score * 100).toFixed(0)}%</span>
                    {result.proof_sources && result.proof_sources.length > 0 && (
                      <span>{result.proof_sources.length} proof sources</span>
                    )}
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
