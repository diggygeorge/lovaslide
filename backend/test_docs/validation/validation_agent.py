"""
Validation Agent for Document Processing Pipeline

This agent validates information from slides and analyzed data using ChatGPT API
to ensure accuracy and referenceability of the content.
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import openai
from dotenv import load_dotenv
import time
from . import config

# Load environment variables
load_dotenv()

class ValidationStatus(Enum):
    """Validation status enumeration"""
    VALID = "valid"
    INVALID = "invalid"
    UNCERTAIN = "uncertain"
    NEEDS_REVIEW = "needs_review"

@dataclass
class ProofSource:
    """Source that provides proof for a claim"""
    title: str
    url: str
    snippet: str
    reliability_score: float  # 0.0 to 1.0

@dataclass
class ReplacementSuggestion:
    """Suggestion to replace invalid claim with verified information"""
    original_claim: str
    suggested_replacement: str
    proof_sources: List[ProofSource]
    explanation: str

@dataclass
class ValidationResult:
    """Result of validation for a specific claim"""
    claim: str
    status: ValidationStatus
    confidence_score: float  # 0.0 to 1.0
    explanation: str
    proof_sources: List[ProofSource]  # For valid claims
    replacement_suggestion: Optional[ReplacementSuggestion]  # For invalid claims
    recommendations: List[str]

@dataclass
class ValidationReport:
    """Complete validation report for all claims"""
    total_claims: int
    valid_claims: int
    invalid_claims: int
    uncertain_claims: int
    overall_confidence: float
    results: List[ValidationResult]
    summary: str

class ValidationAgent:
    """
    Agent responsible for validating information from slides and analyzed data
    using ChatGPT API for fact-checking and verification with proof sources.
    """
    
    def __init__(self, api_key: Optional[str] = None, serpapi_key: Optional[str] = None):
        """
        Initialize the validation agent
        
        Args:
            api_key: OpenAI API key. If None, will try to get from config or environment
            serpapi_key: SerpAPI key for web search. If None, will try to get from config or environment
        """
        self.api_key = api_key or config.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in config.py or environment variable.")
        
        self.serpapi_key = serpapi_key or config.SERPAPI_KEY or os.getenv("SERPAPI_KEY")
        if not self.serpapi_key:
            print("Warning: SERPAPI_KEY not found. Web search functionality will be limited.")
        
        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = config.DEFAULT_MODEL  # Using GPT-4 for better accuracy
        
    def validate_claims(self, 
                       slide_data: Dict[str, Any], 
                       analyzed_data: Dict[str, Any]) -> ValidationReport:
        """
        Validate claims from slide data against analyzed data and external sources
        
        Args:
            slide_data: Dictionary containing slide content and claims
            analyzed_data: Dictionary containing analyzed data from the document
            
        Returns:
            ValidationReport with validation results
        """
        # Extract claims from slide data
        claims = self._extract_claims(slide_data)
        
        # Validate each claim
        validation_results = []
        for claim in claims:
            result = self._validate_single_claim(claim, analyzed_data)
            validation_results.append(result)
        
        # Generate overall report
        report = self._generate_validation_report(validation_results)
        return report
    
    def _extract_claims(self, slide_data: Dict[str, Any]) -> List[str]:
        """
        Extract verifiable claims from slide data
        
        Args:
            slide_data: Dictionary containing slide content
            
        Returns:
            List of claims to validate
        """
        claims = []
        
        # Extract text content from slides
        if 'slides' in slide_data:
            for slide in slide_data['slides']:
                if 'content' in slide:
                    # Extract factual statements from slide content
                    slide_claims = self._extract_factual_statements(slide['content'])
                    claims.extend(slide_claims)
        
        # Extract data points and statistics
        if 'data_points' in slide_data:
            for data_point in slide_data['data_points']:
                if 'value' in data_point and 'description' in data_point:
                    claim = f"{data_point['description']}: {data_point['value']}"
                    claims.append(claim)
        
        return claims
    
    def _extract_factual_statements(self, content: str) -> List[str]:
        """
        Extract factual statements from text content using ChatGPT
        
        Args:
            content: Text content to analyze
            
        Returns:
            List of factual statements
        """
        prompt = f"""
        Analyze the following text and extract factual statements that can be verified.
        Focus on:
        - Statistics and numerical data
        - Dates and time references
        - Specific claims about facts
        - Comparisons and percentages
        - Technical specifications
        
        Text: {content}
        
        Return only the factual statements, one per line. Do not include opinions or subjective statements.
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at extracting factual statements from text. Return only verifiable facts."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=config.DEFAULT_TEMPERATURE
            )
            
            statements = response.choices[0].message.content.strip().split('\n')
            return [stmt.strip() for stmt in statements if stmt.strip()]
            
        except Exception as e:
            print(f"Error extracting factual statements: {e}")
            return []
    
    def _validate_single_claim(self, claim: str, analyzed_data: Dict[str, Any]) -> ValidationResult:
        """
        Validate a single claim using ChatGPT API and web search
        
        Args:
            claim: The claim to validate
            analyzed_data: Analyzed data from the document
            
        Returns:
            ValidationResult with validation details, proof sources, and replacement suggestions
        """
        # Create context from analyzed data
        context = self._create_validation_context(analyzed_data)
        
        # Search for proof sources
        proof_sources = self._search_for_proof_sources(claim)
        
        # Generate validation prompt with proof sources
        prompt = self._create_validation_prompt(claim, context, proof_sources)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert fact-checker. Validate claims against provided data, your knowledge, and proof sources. Provide proof links for valid claims and replacement suggestions for invalid ones."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=config.DEFAULT_MAX_TOKENS,
                temperature=config.DEFAULT_TEMPERATURE
            )
            
            # Parse the response
            result = self._parse_validation_response(claim, response.choices[0].message.content, proof_sources)
            return result
            
        except Exception as e:
            print(f"Error validating claim '{claim}': {e}")
            return ValidationResult(
                claim=claim,
                status=ValidationStatus.UNCERTAIN,
                confidence_score=0.0,
                explanation=f"Validation failed due to error: {str(e)}",
                proof_sources=[],
                replacement_suggestion=None,
                recommendations=["Manual review required due to validation error"]
            )
    
    def _create_validation_context(self, analyzed_data: Dict[str, Any]) -> str:
        """
        Create context string from analyzed data for validation
        
        Args:
            analyzed_data: Dictionary containing analyzed data
            
        Returns:
            Context string for validation
        """
        context_parts = []
        
        if 'extracted_data' in analyzed_data:
            context_parts.append("Extracted Data:")
            context_parts.append(json.dumps(analyzed_data['extracted_data'], indent=2))
        
        if 'statistics' in analyzed_data:
            context_parts.append("Statistics:")
            context_parts.append(json.dumps(analyzed_data['statistics'], indent=2))
        
        if 'key_findings' in analyzed_data:
            context_parts.append("Key Findings:")
            context_parts.append(json.dumps(analyzed_data['key_findings'], indent=2))
        
        return "\n".join(context_parts)
    
    def _search_for_proof_sources(self, claim: str) -> List[ProofSource]:
        """
        Search for proof sources using web search
        
        Args:
            claim: The claim to search for
            
        Returns:
            List of proof sources
        """
        if not self.serpapi_key:
            return []
        
        try:
            # Use SerpAPI for web search with multiple query variations
            search_queries = [
                f'"{claim}" verification fact check',
                f'"{claim}" source evidence',
                f'"{claim}" data statistics',
                f'"{claim}" research study',
                f'"{claim}" official report'
            ]
            
            all_sources = []
            
            for search_query in search_queries:
                params = {
                    'q': search_query,
                    'api_key': self.serpapi_key,
                    'engine': 'google',
                    'num': 3
                }
                
                response = requests.get('https://serpapi.com/search', params=params)
                response.raise_for_status()
                
                data = response.json()
                
                if 'organic_results' in data:
                    for result in data['organic_results']:
                        source = ProofSource(
                            title=result.get('title', ''),
                            url=result.get('link', ''),
                            snippet=result.get('snippet', ''),
                            reliability_score=self._calculate_reliability_score(result)
                        )
                        # Avoid duplicates
                        if not any(s.url == source.url for s in all_sources):
                            all_sources.append(source)
                
                # Add delay to avoid rate limiting
                time.sleep(config.SEARCH_DELAY)
            
            # Return top sources by reliability
            all_sources.sort(key=lambda x: x.reliability_score, reverse=True)
            return all_sources[:5]  # Return more sources for better coverage
            
        except Exception as e:
            print(f"Error searching for proof sources: {e}")
            return []
    
    def _calculate_reliability_score(self, search_result: Dict[str, Any]) -> float:
        """
        Calculate reliability score for a search result
        
        Args:
            search_result: Search result from SerpAPI
            
        Returns:
            Reliability score from 0.0 to 1.0
        """
        url = search_result.get('link', '').lower()
        title = search_result.get('title', '').lower()
        
        # High reliability sources
        high_reliability_domains = [
            'wikipedia.org', 'gov', 'edu', 'reuters.com', 'bbc.com',
            'ap.org', 'factcheck.org', 'snopes.com', 'politifact.com',
            'who.int', 'cdc.gov', 'fda.gov', 'sec.gov', 'bls.gov'
        ]
        
        # Medium reliability sources
        medium_reliability_domains = [
            'cnn.com', 'nytimes.com', 'wsj.com', 'bloomberg.com',
            'forbes.com', 'techcrunch.com', 'wired.com', 'hbr.org',
            'mckinsey.com', 'deloitte.com', 'pwc.com', 'kpmg.com'
        ]
        
        # Check domain reliability
        for domain in high_reliability_domains:
            if domain in url:
                return 0.9
        
        for domain in medium_reliability_domains:
            if domain in url:
                return 0.7
        
        # Default reliability
        return 0.5
    
    def _create_validation_prompt(self, claim: str, context: str, proof_sources: List[ProofSource]) -> str:
        """
        Create validation prompt for ChatGPT with proof sources
        
        Args:
            claim: The claim to validate
            context: Context from analyzed data
            proof_sources: List of proof sources from web search
            
        Returns:
            Validation prompt
        """
        proof_sources_text = ""
        if proof_sources:
            proof_sources_text = "\nPROOF SOURCES FROM WEB SEARCH:\n"
            for i, source in enumerate(proof_sources, 1):
                proof_sources_text += f"{i}. {source.title}\n   URL: {source.url}\n   Snippet: {source.snippet}\n   Reliability: {source.reliability_score:.2f}\n\n"
        
        return f"""
        Please validate the following claim against the provided data, your knowledge, and proof sources:
        
        CLAIM TO VALIDATE: "{claim}"
        
        CONTEXT FROM ANALYZED DATA:
        {context}
        
        {proof_sources_text}
        
        Please provide a comprehensive validation in the following JSON format:
        {{
            "status": "valid|invalid|uncertain|needs_review",
            "confidence_score": 0.0-1.0,
            "explanation": "Detailed explanation of your validation reasoning",
            "proof_sources_used": ["List of proof source numbers that support this claim - ALWAYS include sources for valid claims"],
            "replacement_suggestion": {{
                "suggested_replacement": "If invalid, provide a corrected version of the claim",
                "explanation": "Why this replacement is more accurate",
                "proof_sources": ["List of proof source numbers that support the replacement"]
            }},
            "recommendations": ["List of recommendations for improvement"]
        }}
        
        IMPORTANT INSTRUCTIONS:
        1. For VALID claims: ALWAYS include proof sources that support the claim
        2. For INVALID claims: Provide replacement suggestion with supporting sources
        3. For UNCERTAIN claims: Explain why you cannot validate and suggest manual review
        
        Consider:
        1. Does the claim match the provided data?
        2. Is the claim factually accurate based on your knowledge and proof sources?
        3. Are there any inconsistencies or contradictions?
        4. What is your confidence level in this validation?
        5. Which proof sources support or contradict this claim?
        6. If invalid, what would be a more accurate replacement?
        
        Be objective and thorough in your analysis. For valid claims, ALWAYS reference the proof sources that support the claim. For invalid claims, provide a replacement suggestion with supporting evidence.
        """
    
    def _parse_validation_response(self, claim: str, response: str, proof_sources: List[ProofSource]) -> ValidationResult:
        """
        Parse ChatGPT response into ValidationResult
        
        Args:
            claim: The original claim
            response: ChatGPT response
            proof_sources: List of proof sources from web search
            
        Returns:
            ValidationResult object
        """
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                # Extract proof sources used
                proof_sources_used = []
                if 'proof_sources_used' in data and data['proof_sources_used']:
                    for source_num in data['proof_sources_used']:
                        if isinstance(source_num, int) and 1 <= source_num <= len(proof_sources):
                            proof_sources_used.append(proof_sources[source_num - 1])
                
                # For valid claims, if no proof sources were specified, include all available sources
                if (data.get('status') == 'valid' and 
                    not proof_sources_used and 
                    proof_sources):
                    proof_sources_used = proof_sources[:3]  # Include top 3 sources
                
                # Create replacement suggestion if provided
                replacement_suggestion = None
                if 'replacement_suggestion' in data and data['replacement_suggestion']:
                    replacement_data = data['replacement_suggestion']
                    replacement_proof_sources = []
                    
                    if 'proof_sources' in replacement_data:
                        for source_num in replacement_data['proof_sources']:
                            if isinstance(source_num, int) and 1 <= source_num <= len(proof_sources):
                                replacement_proof_sources.append(proof_sources[source_num - 1])
                    
                    replacement_suggestion = ReplacementSuggestion(
                        original_claim=claim,
                        suggested_replacement=replacement_data.get('suggested_replacement', ''),
                        proof_sources=replacement_proof_sources,
                        explanation=replacement_data.get('explanation', '')
                    )
                
                return ValidationResult(
                    claim=claim,
                    status=ValidationStatus(data.get('status', 'uncertain')),
                    confidence_score=float(data.get('confidence_score', 0.0)),
                    explanation=data.get('explanation', 'No explanation provided'),
                    proof_sources=proof_sources_used,
                    replacement_suggestion=replacement_suggestion,
                    recommendations=data.get('recommendations', [])
                )
            else:
                # Fallback parsing if JSON not found
                return self._fallback_parse_response(claim, response, proof_sources)
                
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing validation response: {e}")
            return self._fallback_parse_response(claim, response, proof_sources)
    
    def _fallback_parse_response(self, claim: str, response: str, proof_sources: List[ProofSource]) -> ValidationResult:
        """
        Fallback parsing when JSON parsing fails
        
        Args:
            claim: The original claim
            response: ChatGPT response
            proof_sources: List of proof sources from web search
            
        Returns:
            ValidationResult object
        """
        # Simple keyword-based parsing
        status = ValidationStatus.UNCERTAIN
        confidence = 0.5
        
        if 'valid' in response.lower() and 'invalid' not in response.lower():
            status = ValidationStatus.VALID
            confidence = 0.8
        elif 'invalid' in response.lower():
            status = ValidationStatus.INVALID
            confidence = 0.7
        elif 'uncertain' in response.lower() or 'unclear' in response.lower():
            status = ValidationStatus.UNCERTAIN
            confidence = 0.3
        
        # For valid claims in fallback, try to include available proof sources
        fallback_proof_sources = []
        if status == ValidationStatus.VALID and proof_sources:
            fallback_proof_sources = proof_sources[:2]  # Include top 2 sources
        
        return ValidationResult(
            claim=claim,
            status=status,
            confidence_score=confidence,
            explanation=response[:500] + "..." if len(response) > 500 else response,
            proof_sources=fallback_proof_sources,
            replacement_suggestion=None,
            recommendations=["Manual review recommended due to parsing issues"]
        )
    
    def _generate_validation_report(self, results: List[ValidationResult]) -> ValidationReport:
        """
        Generate overall validation report
        
        Args:
            results: List of validation results
            
        Returns:
            ValidationReport object
        """
        total_claims = len(results)
        valid_claims = sum(1 for r in results if r.status == ValidationStatus.VALID)
        invalid_claims = sum(1 for r in results if r.status == ValidationStatus.INVALID)
        uncertain_claims = sum(1 for r in results if r.status == ValidationStatus.UNCERTAIN)
        
        overall_confidence = sum(r.confidence_score for r in results) / total_claims if total_claims > 0 else 0.0
        
        # Generate summary
        summary = self._generate_summary(results, valid_claims, invalid_claims, uncertain_claims, overall_confidence)
        
        return ValidationReport(
            total_claims=total_claims,
            valid_claims=valid_claims,
            invalid_claims=invalid_claims,
            uncertain_claims=uncertain_claims,
            overall_confidence=overall_confidence,
            results=results,
            summary=summary
        )
    
    def _generate_summary(self, results: List[ValidationResult], valid: int, invalid: int, uncertain: int, confidence: float) -> str:
        """
        Generate summary text for the validation report
        
        Args:
            results: List of validation results
            valid: Number of valid claims
            invalid: Number of invalid claims
            uncertain: Number of uncertain claims
            confidence: Overall confidence score
            
        Returns:
            Summary string
        """
        total = len(results)
        
        summary_parts = [
            f"Validation Summary: {valid}/{total} claims validated successfully",
            f"Invalid claims: {invalid}, Uncertain claims: {uncertain}",
            f"Overall confidence: {confidence:.2f}"
        ]
        
        if invalid > 0:
            summary_parts.append("⚠️ Some claims require correction")
        
        if uncertain > 0:
            summary_parts.append("❓ Some claims need manual review")
        
        if confidence < 0.7:
            summary_parts.append("⚠️ Low overall confidence - manual review recommended")
        
        return "\n".join(summary_parts)
    
    def export_report(self, report: ValidationReport, filename: str) -> None:
        """
        Export validation report to JSON file
        
        Args:
            report: ValidationReport to export
            filename: Output filename
        """
        report_data = {
            "total_claims": report.total_claims,
            "valid_claims": report.valid_claims,
            "invalid_claims": report.invalid_claims,
            "uncertain_claims": report.uncertain_claims,
            "overall_confidence": report.overall_confidence,
            "summary": report.summary,
            "results": [
                {
                    "claim": r.claim,
                    "status": r.status.value,
                    "confidence_score": r.confidence_score,
                    "explanation": r.explanation,
                    "proof_sources": [
                        {
                            "title": ps.title,
                            "url": ps.url,
                            "snippet": ps.snippet,
                            "reliability_score": ps.reliability_score
                        }
                        for ps in r.proof_sources
                    ],
                    "replacement_suggestion": {
                        "suggested_replacement": r.replacement_suggestion.suggested_replacement,
                        "explanation": r.replacement_suggestion.explanation,
                        "proof_sources": [
                            {
                                "title": ps.title,
                                "url": ps.url,
                                "snippet": ps.snippet,
                                "reliability_score": ps.reliability_score
                            }
                            for ps in r.replacement_suggestion.proof_sources
                        ]
                    } if r.replacement_suggestion else None,
                    "recommendations": r.recommendations
                }
                for r in report.results
            ]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"Validation report exported to {filename}")


# Main functionality is in example_usage.py
# This file contains the ValidationAgent class for import
